/**
 * Utilidades para las pruebas que hablan con una base de datos real.
 *
 * ## Por qué existe
 *
 * El requisito más importante del proyecto —que un negocio no pueda ver los datos
 * de otro— **no se puede demostrar leyendo el código**. Hay que ejecutarlo contra
 * Postgres. Estas utilidades siembran dos negocios y comprueban el aislamiento de
 * verdad.
 *
 * ## Cómo se saltan las pruebas cuando no hay base de datos
 *
 * `hayBaseDeDatos()` devuelve `false` si falta `DATABASE_URL`, y las pruebas usan
 * `describe.skipIf`. Así `pnpm test` nunca falla por no tener credenciales, y
 * `pnpm test:integracion` sí las exige.
 *
 * ## Advertencia sobre los datos
 *
 * Las pruebas **escriben y borran** filas. Úsalas contra una rama de Neon de
 * desarrollo, nunca contra producción. Cada negocio sembrado lleva un sufijo
 * aleatorio y todo se borra al final con `on delete cascade` desde `tenants`.
 */

import { randomUUID } from "node:crypto";

import { conConexionDirecta } from "@/db";

/** ¿Hay credenciales suficientes para tocar una base real? */
export function hayBaseDeDatos(): boolean {
  return Boolean(
    process.env.DATABASE_URL && process.env.DATABASE_URL_MIGRACIONES,
  );
}

export type NegocioSembrado = {
  tenantId: string;
  /** Usuario de auth ficticio, para probar `app.contexto_usuario`. */
  authUserId: string;
  usuarioId: string;
  placa: string;
  numeroDocumento: string;
  numeroEmpeno: string;
};

/**
 * Crea un negocio con un usuario, un cliente, una moto y un empeño.
 *
 * Usa la conexión directa (rol dueño) a propósito: sembrar datos de varios
 * negocios es justo lo que la conexión de la aplicación no puede hacer.
 */
export async function sembrarNegocio(etiqueta: string): Promise<NegocioSembrado> {
  const sufijo = randomUUID().slice(0, 8).toUpperCase();
  const placa = `T${sufijo.slice(0, 2)}${sufijo.slice(2, 5)}`.slice(0, 7);
  const numeroDocumento = `9${Date.now().toString().slice(-8)}`.slice(0, 10);
  const numeroEmpeno = `E-${sufijo}`;

  return conConexionDirecta(async (client) => {
    await client.query("begin");
    try {
      const { rows: filasTenant } = await client.query<{ id: string }>(
        `insert into tenants (nombre, estado, plan) values ($1, 'activo', 'pro') returning id`,
        [`Prueba ${etiqueta} ${sufijo}`],
      );
      const tenantId = filasTenant[0]!.id;

      const authUserId = `prueba-auth-${sufijo}`;
      const { rows: filasUsuario } = await client.query<{ id: string }>(
        `insert into usuarios (auth_user_id, tenant_id, email, nombre, rol)
         values ($1, $2, $3, $4, 'owner') returning id`,
        [authUserId, tenantId, `prueba-${sufijo.toLowerCase()}@motiapp.test`, `Dueño ${etiqueta}`],
      );
      const usuarioId = filasUsuario[0]!.id;

      const { rows: filasCliente } = await client.query<{ id: string }>(
        `insert into clientes (tenant_id, numero_documento, nombres, telefono)
         values ($1, $2, $3, '3001234567') returning id`,
        [tenantId, numeroDocumento, `Cliente ${etiqueta}`],
      );
      const clienteId = filasCliente[0]!.id;

      // Moto del módulo de compra/venta.
      await client.query(
        `insert into motos (tenant_id, placa, marca, modelo, anio, color, precio_compra, fecha_compra, estado)
         values ($1, $2, 'Yamaha', 'FZ', 2021, 'Negro', 4500000, '2026-01-15', 'disponible')`,
        [tenantId, placa],
      );

      // Empeño de un teléfono: es el camino más corto porque no exige vehículo.
      const { rows: filasTelefono } = await client.query<{ id: string }>(
        `insert into telefonos_empeno (tenant_id, marca, modelo, color)
         values ($1, 'Samsung', 'A54', 'Azul') returning id`,
        [tenantId],
      );

      await client.query(
        `insert into empenos (
           tenant_id, numero, cliente_id, cliente_nombre, cliente_cedula,
           tipo_bien, telefono_id, capital, tasa_mensual,
           fecha_inicio, fecha_vencimiento, fecha_limite_gracia, estado
         ) values (
           $1, $2, $3, $4, $5,
           'telefono', $6, 1000000, 10,
           current_date, current_date + 30, current_date + 60, 'activo'
         )`,
        [
          tenantId,
          numeroEmpeno,
          clienteId,
          `Cliente ${etiqueta}`,
          numeroDocumento,
          filasTelefono[0]!.id,
        ],
      );

      await client.query("commit");

      return { tenantId, authUserId, usuarioId, placa, numeroDocumento, numeroEmpeno };
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

/**
 * Borra los negocios sembrados.
 *
 * Basta con borrar `tenants`: el resto de las tablas de negocio tienen
 * `on delete cascade` hacia él.
 */
export async function limpiarNegocios(tenantIds: string[]): Promise<void> {
  if (tenantIds.length === 0) return;

  await conConexionDirecta(async (client) => {
    await client.query(`delete from tenants where id = any($1::uuid[])`, [tenantIds]);
  });
}

/**
 * Cuenta filas usando la conexión directa (sin RLS).
 *
 * Sirve de control: si esto ve 1 moto y la conexión de la aplicación ve 0, el
 * aislamiento está funcionando.
 */
export async function contarSinRls(
  tabla: "motos" | "empenos" | "clientes",
  tenantId: string,
): Promise<number> {
  return conConexionDirecta(async (client) => {
    const { rows } = await client.query<{ total: string }>(
      `select count(*)::text as total from ${tabla} where tenant_id = $1`,
      [tenantId],
    );
    return Number(rows[0]?.total ?? 0);
  });
}
