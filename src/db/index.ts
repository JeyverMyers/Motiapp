/**
 * Cliente de base de datos y contexto de tenant.
 *
 * ## Por qué no usamos el driver HTTP de Neon
 *
 * `neon()` (driver HTTP) resuelve cada consulta en un request independiente y
 * solo ofrece transacciones no interactivas: no se puede abrir una transacción,
 * hacer `SET LOCAL` y después consultar desde el código de la aplicación. Como
 * RLS depende de `SET LOCAL app.tenant_id`, usamos el pool de `node-postgres`
 * contra el host con `-pooler` de Neon. Sigue siendo serverless y escala igual,
 * pero sí permite transacciones interactivas.
 *
 * ## Cómo se aísla un tenant
 *
 * Toda lectura o escritura pasa por `conTenant()`. Esa función abre una
 * transacción y fija `app.tenant_id` con `set_config(..., true)`, que es local a
 * la transacción: al hacer commit o rollback Postgres lo descarta, así que una
 * conexión reutilizada del pool nunca arrastra el tenant de la petición
 * anterior. Ese es el único motivo por el que el contexto se fija dentro de una
 * transacción y no con un `SET` suelto.
 *
 * Las políticas RLS comparan `tenant_id` contra
 * `current_setting('app.tenant_id', true)`. El segundo argumento (`missing_ok`)
 * evita que la consulta reviente cuando no hay contexto: en ese caso
 * `current_setting` devuelve `NULL`, la comparación es `NULL` y la política no
 * deja pasar ninguna fila. Es decir, si alguien olvida el contexto, el resultado
 * es cero filas y no una fuga de datos.
 */

import { Pool, type PoolClient } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

import { entorno } from "./entorno";
import * as schema from "./schema";

export type BaseDeDatos = NodePgDatabase<typeof schema>;

/**
 * Dentro de una transacción de tenant no hay que volver a abrir transacciones.
 * Modelamos eso con un tipo propio para que TypeScript impida anidarlas.
 */
export type TransaccionTenant = Parameters<
  Parameters<BaseDeDatos["transaction"]>[0]
>[0];

/**
 * El pool se guarda en `globalThis` para que el hot reload de desarrollo no
 * abra una conexión nueva en cada recompilación.
 */
const globalParaPool = globalThis as unknown as { __motiappPool?: Pool };

function obtenerPool(): Pool {
  if (!globalParaPool.__motiappPool) {
    const pool = new Pool({
      connectionString: entorno().DATABASE_URL,
      // Neon cierra conexiones ociosas; dejamos que el pool las recicle.
      idleTimeoutMillis: 30_000,
      max: 10,
    });

    // Un error en una conexión ociosa no debe tumbar el proceso.
    pool.on("error", (error) => {
      console.error("[db] error en conexión ociosa del pool", error);
    });

    globalParaPool.__motiappPool = pool;
  }

  return globalParaPool.__motiappPool;
}

/**
 * Cliente sin contexto de tenant. Solo debe usarse para operaciones que por
 * definición cruzan negocios: el panel de super admin, el aprovisionamiento de
 * un negocio nuevo y el cron que revisa vencimientos.
 *
 * El rol de `DATABASE_URL` sigue sujeto a RLS, así que estas operaciones tienen
 * que pasar por `conAdmin()` o fallarán. Este cliente existe para consultas de
 * catálogo que no tocan tablas de negocio.
 */
let clienteGlobal: BaseDeDatos | undefined;

export function db(): BaseDeDatos {
  clienteGlobal ??= drizzle(obtenerPool(), { schema });
  return clienteGlobal;
}

/* ------------------------------------------------------------------ */
/* Guarda de rol                                                       */
/* ------------------------------------------------------------------ */

/**
 * Rol con el que la aplicación DEBE conectarse. Tiene que coincidir con el que
 * crea `src/db/sql/aprovisionamiento.sql`. Solo se usa en el mensaje de error.
 */
const ROL_APLICACION = "motiapp_app";

/**
 * Tabla de referencia para saber quién es el dueño del esquema. Cualquier tabla
 * de negocio sirve: todas las crea el mismo rol en la misma migración.
 */
const TABLA_REFERENCIA_DUENO = "public.tenants";

/** Se comprueba una sola vez por proceso; el resultado se cachea. */
const globalParaGuarda = globalThis as unknown as { __motiappRolVerificado?: Promise<void> };

/**
 * Se niega a operar si la conexión de la aplicación no usa el rol restringido.
 *
 * ## Por qué esto existe
 *
 * Es el fallo más peligroso de toda la arquitectura, y es **silencioso**: en
 * Postgres el dueño de una tabla ignora sus propias políticas RLS. Si alguien
 * pega en `DATABASE_URL` la cadena del dueño —que es justamente la que la consola
 * de Neon ofrece primero— el aislamiento entre negocios se vuelve decorativo y
 * **la aplicación sigue funcionando igual**. Ningún error, ninguna pista: solo un
 * dueño que algún día ve el inventario de otro.
 *
 * Un error ruidoso al arrancar es infinitamente mejor que eso.
 *
 * ## Por qué `pg_has_role` contra el dueño de la tabla y no comparar nombres
 *
 * Porque el nombre no es lo que importa. Lo que salta las políticas es ser
 * superusuario, tener `BYPASSRLS` o poder actuar como el dueño de las tablas
 * (ser él o ser miembro de su rol). Se comprueban las tres, y la tercera se
 * pregunta contra el dueño real de `public.tenants`, sea cual sea su nombre.
 *
 * La versión anterior preguntaba `pg_has_role(current_user, 'motiapp_app')`,
 * que con la conexión correcta es siempre verdadero (todo rol es miembro de sí
 * mismo): la aplicación se negaba a arrancar justo cuando estaba bien
 * configurada. Comprobado contra Neon.
 *
 * Se ejecuta de forma perezosa y una sola vez por proceso, así que durante
 * `next build` no molesta (ahí no hay variables de entorno ni base de datos).
 */
async function verificarRolDeAplicacion(): Promise<void> {
  const resultado = await db().execute<{
    usuario: string;
    es_superusuario: boolean;
    salta_rls: boolean;
    es_dueno: boolean;
  }>(sql`
    select
      current_user as usuario,
      (select rolsuper from pg_roles where rolname = current_user) as es_superusuario,
      (select rolbypassrls from pg_roles where rolname = current_user) as salta_rls,
      pg_has_role(
        current_user,
        (select relowner from pg_class where oid = ${TABLA_REFERENCIA_DUENO}::regclass),
        -- 'member' y no 'usage': un miembro NOINHERIT del dueño no hereda sus
        -- permisos, pero igual puede hacer SET ROLE y saltarse RLS.
        'member'
      ) as es_dueno
  `);

  const fila = resultado.rows[0];
  if (!fila) {
    throw new Error("[db] no se pudo verificar el rol de la conexión.");
  }

  const problemas: string[] = [];
  if (fila.es_superusuario) problemas.push("es superusuario");
  if (fila.salta_rls) problemas.push("tiene BYPASSRLS");
  if (fila.es_dueno) problemas.push("es el dueño de las tablas o puede actuar como él");

  if (problemas.length > 0) {
    throw new Error(
      [
        "",
        "  ALTO: la conexión de la aplicación no respeta el aislamiento entre negocios.",
        "",
        `  DATABASE_URL se conecta como «${fila.usuario}», que ${problemas.join(" y ")}.`,
        "",
        "  En Postgres, el dueño de una tabla ignora sus propias políticas RLS.",
        "  Con esta conexión, un negocio puede ver los datos de otro y NADA falla",
        "  visiblemente. Por eso la aplicación se niega a arrancar.",
        "",
        `  DATABASE_URL debe usar el rol «${ROL_APLICACION}» y el host con «-pooler».`,
        "  El rol dueño (neondb_owner) va solo en DATABASE_URL_MIGRACIONES.",
        "  Ver .env.example y ESTRUCTURA.md, sección 3.",
        "",
      ].join("\n"),
    );
  }

  console.log(`[db] rol de conexión verificado: ${fila.usuario} (sujeto a RLS)`);
}

/**
 * Se espera antes de abrir cualquier transacción de negocio. Es `await` sobre una
 * promesa cacheada, así que a partir de la primera vez no cuesta nada.
 */
export function asegurarRolDeAplicacion(): Promise<void> {
  // Solo se cachea el éxito. Si la verificación falla (por ejemplo, Neon
  // despertando de un arranque en frío), se olvida para reintentar en la
  // próxima petición en vez de dejar el proceso inservible hasta reiniciarlo.
  globalParaGuarda.__motiappRolVerificado ??= verificarRolDeAplicacion().catch((error) => {
    globalParaGuarda.__motiappRolVerificado = undefined;
    throw error;
  });
  return globalParaGuarda.__motiappRolVerificado;
}

/**
 * Ejecuta `consulta` dentro de una transacción con el tenant fijado.
 *
 * Úsala en toda la aplicación. El `tenantId` nunca debe venir del cliente: sale
 * de la sesión de auth (ver `src/server/auth/sesion.ts`).
 *
 * @example
 * ```ts
 * const motos = await conTenant(tenantId, (tx) => tx.select().from(schema.motos));
 * ```
 */
export async function conTenant<T>(
  tenantId: string,
  consulta: (tx: TransaccionTenant) => Promise<T>,
): Promise<T> {
  await asegurarRolDeAplicacion();
  return db().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
    return consulta(tx);
  });
}

/**
 * Ejecuta una operación que legítimamente cruza negocios.
 *
 * Marca la transacción con `app.es_super_admin = 'true'`, que es la condición
 * que las políticas RLS aceptan para dejar ver todos los tenants. Al ser local a
 * la transacción, no contamina al resto de la aplicación.
 *
 * Solo debe llamarse desde código que ya verificó el rol `super_admin`.
 */
export async function conAdmin<T>(
  consulta: (tx: TransaccionTenant) => Promise<T>,
): Promise<T> {
  await asegurarRolDeAplicacion();
  return db().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.es_super_admin', 'true', true)`);
    return consulta(tx);
  });
}

/**
 * Ejecuta una operación sin contexto de tenant ni de admin.
 *
 * Hoy su único uso legítimo es insertar una solicitud de demo desde la landing
 * pública. Todas las tablas tienen RLS, incluidas `tenants` y `solicitudes_demo`:
 * sin contexto se ven cero filas en todas. Para leerlas, `conAdmin`.
 */
export async function sinContexto<T>(
  consulta: (tx: TransaccionTenant) => Promise<T>,
): Promise<T> {
  await asegurarRolDeAplicacion();
  return db().transaction(consulta);
}

/**
 * Conexión directa con el rol dueño del esquema, sin RLS.
 *
 * Solo para migraciones y para el script de aprovisionamiento. Nunca debe
 * importarse desde código que atienda peticiones.
 */
export async function conConexionDirecta<T>(
  consulta: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const connectionString = entorno().DATABASE_URL_MIGRACIONES;
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL_MIGRACIONES: la conexión directa es solo para pruebas y migraciones.");
  }
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    return await consulta(client);
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * Cierra el pool y olvida la verificación de rol.
 *
 * Se usa en scripts y en las pruebas, no en la aplicación. Olvidar la
 * verificación importa: si no se limpiara, una prueba que cambia de conexión
 * seguiría viendo el resultado de la anterior.
 */
export async function cerrarPool(): Promise<void> {
  if (globalParaPool.__motiappPool) {
    await globalParaPool.__motiappPool.end();
    globalParaPool.__motiappPool = undefined;
    clienteGlobal = undefined;
    globalParaGuarda.__motiappRolVerificado = undefined;
  }
}

export { schema };
