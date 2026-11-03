/**
 * Pruebas de aislamiento entre negocios.
 *
 * ## Qué demuestran
 *
 * Que un negocio no puede ver ni tocar los datos de otro, **ejecutándolo contra
 * Postgres de verdad**. Es el requisito más importante del proyecto y no se puede
 * verificar leyendo el código: hay que intentar la fuga y comprobar que falla.
 *
 * ## Cómo correrlas
 *
 *   pnpm test:integracion
 *
 * Necesitan `DATABASE_URL` y `DATABASE_URL_MIGRACIONES` en `.env.local`, con el
 * esquema ya aplicado (`drizzle/0000_inicial.sql`). **Siembran y borran datos**:
 * úsalas contra una rama de Neon de desarrollo, nunca contra producción.
 *
 * ## Por qué cada prueba existe
 *
 * No basta con "leer filtra por negocio". Hay cuatro formas de que el aislamiento
 * falle y cada una tiene su prueba: leer de más, escribir a nombre de otro,
 * olvidar el contexto, y que el rol de la aplicación sea el dueño.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { cerrarPool, conAdmin, conTenant, sinContexto } from "@/db";
import { clientes, empenos, motos, usuarios, ventas } from "@/db/schema";
import { contarSinRls, hayBaseDeDatos, limpiarNegocios, sembrarNegocio } from "@/pruebas/base";
import { eq, sql } from "drizzle-orm";

const soloConBase = describe.skipIf(!hayBaseDeDatos());

/**
 * Exige que la operación falle POR la política RLS, y no por otra cosa.
 *
 * Drizzle envuelve el error de Postgres («Failed query: …») y deja el original
 * en `cause`, así que se recorre la cadena. Se acepta el mensaje o el código
 * `42501` (insufficient_privilege, el que usa Postgres para RLS). Si la causa es
 * otra —una llave foránea, un CHECK— la prueba falla: no basta con que falle.
 */
async function esperarRechazoRls(operacion: Promise<unknown>): Promise<void> {
  const error = await operacion.then(
    () => null,
    (causa: unknown) => causa,
  );
  expect(error, "la operación debía ser rechazada por RLS y se completó").not.toBeNull();

  const cadena: { message?: string; code?: string }[] = [];
  for (let actual = error as { cause?: unknown } | undefined; actual; ) {
    cadena.push(actual as { message?: string; code?: string });
    actual = actual.cause as { cause?: unknown } | undefined;
  }

  const esRls = cadena.some(
    (eslabon) => eslabon.code === "42501" || /row-level security/i.test(eslabon.message ?? ""),
  );
  expect(esRls, `falló por otra razón: ${cadena.map((e) => e.message).join(" ← ")}`).toBe(true);
}

soloConBase("aislamiento entre negocios (RLS)", () => {
  let a: Awaited<ReturnType<typeof sembrarNegocio>>;
  let b: Awaited<ReturnType<typeof sembrarNegocio>>;

  beforeAll(async () => {
    a = await sembrarNegocio("Alfa");
    b = await sembrarNegocio("Beta");
  });

  afterAll(async () => {
    await limpiarNegocios([a.tenantId, b.tenantId]);
    await cerrarPool();
  });

  /* ---------------------------------------------------------------- */
  /* Control: los datos existen                                       */
  /* ---------------------------------------------------------------- */

  describe("control", () => {
    it("el rol dueño sí ve los datos de ambos negocios", async () => {
      // Si esto falla, el problema no es el aislamiento sino el sembrado.
      expect(await contarSinRls("motos", a.tenantId)).toBe(1);
      expect(await contarSinRls("motos", b.tenantId)).toBe(1);
      expect(await contarSinRls("empenos", a.tenantId)).toBe(1);
      expect(await contarSinRls("empenos", b.tenantId)).toBe(1);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Lectura                                                          */
  /* ---------------------------------------------------------------- */

  describe("lectura", () => {
    it("cada negocio ve solo sus propias motos", async () => {
      const propias = await conTenant(a.tenantId, (tx) => tx.select().from(motos));
      expect(propias).toHaveLength(1);
      expect(propias[0]?.placa).toBe(a.placa);
      expect(propias.some((moto) => moto.placa === b.placa)).toBe(false);
    });

    it("pedir la moto del otro negocio por id devuelve cero filas", async () => {
      // Este es el ataque más obvio: adivinar (o filtrar) el id de otro negocio.
      const motoDeB = await conTenant(b.tenantId, (tx) => tx.select().from(motos));
      const idDeB = motoDeB[0]!.id;

      const desdeA = await conTenant(a.tenantId, (tx) =>
        tx.select().from(motos).where(eq(motos.id, idDeB)),
      );

      expect(desdeA).toHaveLength(0);
    });

    it("un join a una tabla de otro negocio no filtra datos ajenos", async () => {
      const filas = await conTenant(a.tenantId, (tx) =>
        tx
          .select({ numero: empenos.numero, cliente: clientes.nombres })
          .from(empenos)
          .innerJoin(clientes, eq(clientes.id, empenos.clienteId)),
      );

      expect(filas).toHaveLength(1);
      expect(filas[0]?.numero).toBe(a.numeroEmpeno);
      expect(filas.some((fila) => fila.numero === b.numeroEmpeno)).toBe(false);
    });

    it("cada negocio ve solo sus propios clientes", async () => {
      const propios = await conTenant(a.tenantId, (tx) => tx.select().from(clientes));
      expect(propios).toHaveLength(1);
      expect(propios[0]?.numeroDocumento).toBe(a.numeroDocumento);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Escritura                                                        */
  /* ---------------------------------------------------------------- */

  describe("escritura", () => {
    it("no se puede insertar una fila a nombre de otro negocio", async () => {
      // El `with check` de la política es lo que hace fallar esto. Sin él, un
      // dueño podría fabricar datos que aparecerían en el panel de otro.
      await esperarRechazoRls(
        conTenant(a.tenantId, (tx) =>
          tx.insert(motos).values({
            tenantId: b.tenantId,
            placa: "HACK01",
            marca: "Robada",
            modelo: "X",
            anio: 2020,
            color: "Negro",
            precioCompra: 1,
            fechaCompra: "2026-01-01",
          }),
        ),
      );
    });

    it("no se puede mover una fila propia al otro negocio", async () => {
      const propia = await conTenant(a.tenantId, (tx) => tx.select().from(motos));
      const idPropio = propia[0]!.id;

      await esperarRechazoRls(
        conTenant(a.tenantId, (tx) =>
          tx.update(motos).set({ tenantId: b.tenantId }).where(eq(motos.id, idPropio)),
        ),
      );
    });

    it("no se puede borrar una fila del otro negocio", async () => {
      const motoDeB = await conTenant(b.tenantId, (tx) => tx.select().from(motos));
      const idDeB = motoDeB[0]!.id;

      // El DELETE no ve la fila, así que afecta cero filas en vez de fallar.
      const borradas = await conTenant(a.tenantId, (tx) =>
        tx.delete(motos).where(eq(motos.id, idDeB)).returning(),
      );

      expect(borradas).toHaveLength(0);
      // Y la moto sigue ahí.
      expect(await contarSinRls("motos", b.tenantId)).toBe(1);
    });

    it("sí puede escribir en su propio negocio", async () => {
      const [creada] = await conTenant(a.tenantId, (tx) =>
        tx
          .insert(motos)
          .values({
            tenantId: a.tenantId,
            placa: "PROP01",
            marca: "Honda",
            modelo: "CB110",
            anio: 2022,
            color: "Rojo",
            precioCompra: 5_000_000,
            fechaCompra: "2026-01-20",
          })
          .returning(),
      );

      expect(creada?.placa).toBe("PROP01");
      await conTenant(a.tenantId, (tx) => tx.delete(motos).where(eq(motos.id, creada!.id)));
    });
  });

  /* ---------------------------------------------------------------- */
  /* Ventas (migración 0003)                                          */
  /* ---------------------------------------------------------------- */

  describe("ventas", () => {
    let ventaDeA: string;
    let motoDeA: string;
    let motoDeB: string;
    let clienteDeA: string;

    beforeAll(async () => {
      motoDeA = (await conTenant(a.tenantId, (tx) => tx.select().from(motos)))[0]!.id;
      motoDeB = (await conTenant(b.tenantId, (tx) => tx.select().from(motos)))[0]!.id;
      clienteDeA = (await conTenant(a.tenantId, (tx) => tx.select().from(clientes)))[0]!.id;
      const [venta] = await conTenant(a.tenantId, (tx) =>
        tx
          .insert(ventas)
          .values({
            tenantId: a.tenantId,
            motoId: motoDeA,
            clienteId: clienteDeA,
            precioPactado: 5_000_000,
            fecha: "2026-02-01",
          })
          .returning(),
      );
      ventaDeA = venta!.id;
    });

    it("un negocio no ve las ventas de otro, ni pidiéndolas por id", async () => {
      expect(await conTenant(a.tenantId, (tx) => tx.select().from(ventas))).toHaveLength(1);
      expect(await conTenant(b.tenantId, (tx) => tx.select().from(ventas))).toHaveLength(0);
      expect(
        await conTenant(b.tenantId, (tx) => tx.select().from(ventas).where(eq(ventas.id, ventaDeA))),
      ).toHaveLength(0);
    });

    it("no se puede registrar una venta a nombre de otro negocio", async () => {
      await esperarRechazoRls(
        conTenant(a.tenantId, (tx) =>
          tx.insert(ventas).values({
            tenantId: b.tenantId,
            motoId: motoDeB,
            clienteId: clienteDeA,
            precioPactado: 1,
            fecha: "2026-02-01",
          }),
        ),
      );
    });

    it("una venta propia no puede apuntar a la moto de otro negocio", async () => {
      // RLS no basta aquí: la fila SÍ es de A. Lo que la frena es la llave
      // compuesta (tenant_id, moto_id), que exige que la moto sea del mismo negocio.
      const error = await conTenant(a.tenantId, (tx) =>
        tx.insert(ventas).values({
          tenantId: a.tenantId,
          motoId: motoDeB,
          clienteId: clienteDeA,
          precioPactado: 1,
          fecha: "2026-02-01",
        }),
      ).then(
        () => null,
        (causa: unknown) => causa,
      );

      const codigos: (string | undefined)[] = [];
      for (let eslabon = error as { code?: string; cause?: unknown } | null; eslabon; ) {
        codigos.push(eslabon.code);
        eslabon = eslabon.cause as { code?: string; cause?: unknown } | null;
      }
      expect(codigos, "debía fallar por llave foránea (23503)").toContain("23503");
    });

    it("no se puede modificar ni borrar la venta de otro negocio", async () => {
      const modificadas = await conTenant(b.tenantId, (tx) =>
        tx.update(ventas).set({ precioPactado: 1 }).where(eq(ventas.id, ventaDeA)).returning(),
      );
      const borradas = await conTenant(b.tenantId, (tx) =>
        tx.delete(ventas).where(eq(ventas.id, ventaDeA)).returning(),
      );

      expect(modificadas).toHaveLength(0);
      expect(borradas).toHaveLength(0);
      const [intacta] = await conTenant(a.tenantId, (tx) => tx.select().from(ventas).where(eq(ventas.id, ventaDeA)));
      expect(intacta?.precioPactado).toBe(5_000_000);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Falla cerrado                                                    */
  /* ---------------------------------------------------------------- */

  describe("sin contexto", () => {
    it("sin tenant fijado, las tablas de negocio devuelven cero filas", async () => {
      // Este es el punto clave del diseño: un olvido no produce una fuga, produce
      // cero resultados. `current_setting(..., true)` devuelve NULL, la
      // comparación es NULL y la política no deja pasar nada.
      const motosSinContexto = await sinContexto((tx) => tx.select().from(motos));
      const empenosSinContexto = await sinContexto((tx) => tx.select().from(empenos));

      expect(motosSinContexto).toHaveLength(0);
      expect(empenosSinContexto).toHaveLength(0);
    });

    it("sin contexto tampoco se puede escribir en una tabla de negocio", async () => {
      await esperarRechazoRls(
        sinContexto((tx) =>
          tx.insert(motos).values({
            tenantId: a.tenantId,
            placa: "SINCTX",
            marca: "X",
            modelo: "X",
            anio: 2020,
            color: "Negro",
            precioCompra: 1,
            fechaCompra: "2026-01-01",
          }),
        ),
      );
    });
  });

  /* ---------------------------------------------------------------- */
  /* Super administración                                             */
  /* ---------------------------------------------------------------- */

  describe("super administración", () => {
    it("conAdmin ve los datos de todos los negocios", async () => {
      const todas = await conAdmin((tx) => tx.select().from(motos));
      const placas = todas.map((moto) => moto.placa);

      expect(placas).toContain(a.placa);
      expect(placas).toContain(b.placa);
    });

    it("conAdmin puede escribir en cualquier negocio", async () => {
      const [creada] = await conAdmin((tx) =>
        tx
          .insert(motos)
          .values({
            tenantId: b.tenantId,
            placa: "ADMIN1",
            marca: "Suzuki",
            modelo: "GN125",
            anio: 2023,
            color: "Azul",
            precioCompra: 6_000_000,
            fechaCompra: "2026-01-25",
          })
          .returning(),
      );

      expect(creada?.tenantId).toBe(b.tenantId);
      await conAdmin((tx) => tx.delete(motos).where(eq(motos.id, creada!.id)));
    });

    it("la marca de super admin no sobrevive a la transacción", async () => {
      // Es local a la transacción: después de conAdmin, el contexto vuelve a
      // estar vacío y no hay forma de que se filtre a una petición de un dueño.
      await conAdmin(async () => undefined);

      const sinContextoDespues = await sinContexto((tx) =>
        tx.select().from(motos),
      );
      expect(sinContextoDespues).toHaveLength(0);
    });
  });

  /* ---------------------------------------------------------------- */
  /* Resolución del contexto de usuario                               */
  /* ---------------------------------------------------------------- */

  describe("app.contexto_usuario", () => {
    it("resuelve negocio, rol y usuario a partir del id de auth", async () => {
      // Esta función es la que rompe el huevo y la gallina: para leer `usuarios`
      // hace falta el tenant, y el tenant sale de `usuarios`.
      const resultado = await sinContexto((tx) =>
        tx.execute<{ tenant_id: string; rol: string; usuario_id: string; activo: boolean }>(
          sql`select * from app.contexto_usuario(${a.authUserId})`,
        ),
      );

      const fila = resultado.rows[0];
      expect(fila).toBeDefined();
      expect(fila?.tenant_id).toBe(a.tenantId);
      expect(fila?.rol).toBe("owner");
      expect(fila?.usuario_id).toBe(a.usuarioId);
      expect(fila?.activo).toBe(true);
    });

    it("devuelve el negocio correcto para cada usuario", async () => {
      const resultado = await sinContexto((tx) =>
        tx.execute<{ tenant_id: string }>(
          sql`select * from app.contexto_usuario(${b.authUserId})`,
        ),
      );

      expect(resultado.rows[0]?.tenant_id).toBe(b.tenantId);
      expect(resultado.rows[0]?.tenant_id).not.toBe(a.tenantId);
    });

    it("un usuario de auth desconocido no devuelve ninguna fila", async () => {
      // Importa: sin perfil no hay negocio, así que un registro suelto en Neon
      // Auth no da acceso a nada.
      const resultado = await sinContexto((tx) =>
        tx.execute(sql`select * from app.contexto_usuario('usuario-que-no-existe')`),
      );

      expect(resultado.rows).toHaveLength(0);
    });
  });

  /* ---------------------------------------------------------------- */
  /* El rol de la aplicación                                          */
  /* ---------------------------------------------------------------- */

  describe("rol de la conexión", () => {
    it("la conexión de la aplicación no es superusuario ni salta RLS", async () => {
      // Es la condición sin la cual todo lo anterior sería decorativo.
      const resultado = await sinContexto((tx) =>
        tx.execute<{ usuario: string; superusuario: boolean; salta_rls: boolean }>(
          sql`select
                current_user as usuario,
                (select rolsuper from pg_roles where rolname = current_user) as superusuario,
                (select rolbypassrls from pg_roles where rolname = current_user) as salta_rls`,
        ),
      );

      const fila = resultado.rows[0];
      expect(fila?.superusuario).toBe(false);
      expect(fila?.salta_rls).toBe(false);
      console.log(`      conexión de la app verificada como: ${fila?.usuario}`);
    });

    it("ninguna tabla de negocio quedó sin RLS", async () => {
      const resultado = await sinContexto((tx) =>
        tx.execute<{ relname: string }>(sql`
          select c.relname
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relkind = 'r'
            and c.relrowsecurity = false
            and exists (
              select 1 from information_schema.columns col
              where col.table_schema = 'public'
                and col.table_name = c.relname
                and col.column_name = 'tenant_id'
            )
        `),
      );

      expect(resultado.rows.map((fila) => fila.relname)).toEqual([]);
    });

    it("la tabla usuarios tiene la política puesta", async () => {
      const resultado = await sinContexto((tx) =>
        tx.execute<{ policyname: string }>(sql`
          select policyname from pg_policies
          where schemaname = 'public' and tablename = 'usuarios'
        `),
      );

      expect(resultado.rows.length).toBeGreaterThan(0);
    });
  });

  /* ---------------------------------------------------------------- */
  /* La guarda de rol, probada de verdad                              */
  /* ---------------------------------------------------------------- */

  describe("guarda de rol", () => {
    it("los usuarios de un negocio no son visibles para el otro", async () => {
      const usuariosDeA = await conTenant(a.tenantId, (tx) => tx.select().from(usuarios));
      // Se compara con el usuario sembrado, no con un pedazo del correo: el
      // correo lleva un sufijo aleatorio y no el nombre del negocio.
      expect(usuariosDeA).toHaveLength(1);
      expect(usuariosDeA[0]?.authUserId).toBe(a.authUserId);

      const usuariosDeB = await conTenant(b.tenantId, (tx) => tx.select().from(usuarios));
      expect(usuariosDeB).toHaveLength(1);
      expect(usuariosDeB[0]?.authUserId).toBe(b.authUserId);
    });
  });
});
