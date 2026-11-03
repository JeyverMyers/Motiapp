/**
 * Pruebas de la super administración (Bloque 6) contra Postgres de verdad.
 *
 * Demuestran lo que no se ve leyendo el código:
 * - suspender un negocio cambia lo que `app.contexto_usuario` le dice al login
 *   (y por tanto corta la entrada a /app) sin borrar sus datos;
 * - un dueño no puede reactivarse ni subirse de plan por su cuenta;
 * - el modo soporte le da al super admin el negocio desde la base (no desde una
 *   cookie) y se cierra limpio;
 * - la auditoría y las sesiones de soporte son invisibles para los dueños.
 *
 * Siembran y borran datos: solo contra la rama de desarrollo.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";

import { cerrarPool, conConexionDirecta, conTenant, db } from "@/db";
import { auditoriaAdmin, impersonaciones, tenants } from "@/db/schema";
import { negocioPuedeEntrar, tieneModulo } from "@/domain/negocio";
import { contarSinRls, hayBaseDeDatos, limpiarNegocios, sembrarNegocio } from "@/pruebas/base";
import {
  cambiarPlanYEstado,
  cuentaAuthPorCorreo,
  iniciarSoporte,
  listarAuditoria,
  terminarSoporte,
  type Actor,
} from "@/server/repositorios/tenants";

const soloConBase = describe.skipIf(!hayBaseDeDatos());

type FilaContexto = {
  tenant_id: string | null;
  rol: string;
  negocio_estado: string | null;
  negocio_plan: string | null;
  impersonando: boolean | null;
};

/** Lo mismo que consulta el login, sin pasar por cookies ni Next. */
async function contexto(authUserId: string): Promise<FilaContexto | undefined> {
  const resultado = await db().execute<FilaContexto>(sql`select * from app.contexto_usuario(${authUserId})`);
  return resultado.rows[0];
}

soloConBase("super administración (Bloque 6)", () => {
  let negocio: Awaited<ReturnType<typeof sembrarNegocio>>;
  let superAdmin: Actor & { authUserId: string };

  beforeAll(async () => {
    negocio = await sembrarNegocio("Admin");
    const sufijo = randomUUID().slice(0, 8);
    superAdmin = await conConexionDirecta(async (client) => {
      const authUserId = `prueba-sa-${sufijo}`;
      const email = `sa-${sufijo}@motiapp.test`;
      const { rows } = await client.query<{ id: string }>(
        `insert into usuarios (auth_user_id, tenant_id, email, nombre, rol)
         values ($1, null, $2, 'Super admin de prueba', 'super_admin') returning id`,
        [authUserId, email],
      );
      return { usuarioId: rows[0]!.id, email, authUserId };
    });
  });

  afterAll(async () => {
    await conConexionDirecta(async (client) => {
      await client.query(`delete from auditoria_admin where usuario_id = $1`, [superAdmin.usuarioId]);
      await client.query(`delete from usuarios where id = $1`, [superAdmin.usuarioId]);
    });
    await limpiarNegocios([negocio.tenantId]);
    await cerrarPool();
  });

  describe("suspensión", () => {
    it("el contexto del dueño trae el estado y el plan del negocio", async () => {
      const fila = await contexto(negocio.authUserId);
      expect(fila).toMatchObject({ tenant_id: negocio.tenantId, negocio_estado: "activo", negocio_plan: "pro" });
      expect(negocioPuedeEntrar(fila?.negocio_estado)).toBe(true);
      expect(tieneModulo(fila?.negocio_plan, "empenos")).toBe(true);
    });

    it("suspender corta la entrada, no borra datos y queda auditado", async () => {
      await cambiarPlanYEstado(superAdmin, { negocioId: negocio.tenantId, plan: "pro", estado: "suspendido" });

      const fila = await contexto(negocio.authUserId);
      expect(fila?.negocio_estado).toBe("suspendido");
      expect(negocioPuedeEntrar(fila?.negocio_estado)).toBe(false);
      expect(await contarSinRls("motos", negocio.tenantId)).toBe(1);
      expect(await contarSinRls("empenos", negocio.tenantId)).toBe(1);

      const registro = await listarAuditoria({ negocioId: negocio.tenantId });
      expect(registro.map((r) => r.accion)).toContain("cambiar_estado");
    });

    it("reactivar devuelve la entrada", async () => {
      await cambiarPlanYEstado(superAdmin, { negocioId: negocio.tenantId, plan: "pro", estado: "activo" });
      const fila = await contexto(negocio.authUserId);
      expect(negocioPuedeEntrar(fila?.negocio_estado)).toBe(true);
    });

    it("un dueño no puede cambiar el estado ni el plan de su negocio", async () => {
      const intentar = (cambios: Partial<typeof tenants.$inferInsert>) =>
        conTenant(negocio.tenantId, (tx) => tx.update(tenants).set(cambios).where(eq(tenants.id, negocio.tenantId)));

      await expect(intentar({ estado: "suspendido" })).rejects.toThrow();
      await expect(intentar({ plan: "ilimitado" })).rejects.toThrow();

      const fila = await contexto(negocio.authUserId);
      expect(fila).toMatchObject({ negocio_estado: "activo", negocio_plan: "pro" });
    });

    it("un plan Negociante no tiene el módulo de empeños", async () => {
      await cambiarPlanYEstado(superAdmin, { negocioId: negocio.tenantId, plan: "basico", estado: "activo" });
      const fila = await contexto(negocio.authUserId);
      expect(fila?.negocio_plan).toBe("basico");
      expect(tieneModulo(fila?.negocio_plan, "empenos")).toBe(false);
      await cambiarPlanYEstado(superAdmin, { negocioId: negocio.tenantId, plan: "pro", estado: "activo" });
    });
  });

  describe("modo soporte", () => {
    it("sin sesión abierta, el super admin no tiene negocio", async () => {
      const fila = await contexto(superAdmin.authUserId);
      expect(fila).toMatchObject({ rol: "super_admin", tenant_id: null });
      expect(Boolean(fila?.impersonando)).toBe(false);
    });

    it("al entrar, el negocio sale de la base y se marca como soporte", async () => {
      await iniciarSoporte(superAdmin, { negocioId: negocio.tenantId, motivo: "Revisión de la prueba de integración" });
      const fila = await contexto(superAdmin.authUserId);
      expect(fila).toMatchObject({ rol: "super_admin", tenant_id: negocio.tenantId, impersonando: true });
    });

    it("al salir, el contexto vuelve a no tener negocio y queda auditado", async () => {
      expect(await terminarSoporte(superAdmin)).toBe(1);
      const fila = await contexto(superAdmin.authUserId);
      expect(fila?.tenant_id).toBeNull();
      expect(Boolean(fila?.impersonando)).toBe(false);

      const acciones = (await listarAuditoria({ negocioId: negocio.tenantId })).map((r) => r.accion);
      expect(acciones).toEqual(expect.arrayContaining(["iniciar_soporte", "terminar_soporte"]));
    });
  });

  describe("cuentas de Neon Auth (0007)", () => {
    it("el super admin encuentra una cuenta por correo, sin acceso a lo demás", async () => {
      const [cuentaExistente] = await conConexionDirecta(async (client) => {
        const { rows } = await client.query<{ email: string }>(`select email from neon_auth."user" limit 1`);
        return rows;
      });
      if (!cuentaExistente) return; // rama sin cuentas: no hay qué buscar
      const cuenta = await cuentaAuthPorCorreo(cuentaExistente.email.toUpperCase());
      expect(cuenta?.id).toBeTruthy();
      expect(cuenta?.creadaEn).toBeInstanceOf(Date);
    });

    it("un dueño no puede usar la función ni leer neon_auth directamente", async () => {
      const desdeDueno = await conTenant(negocio.tenantId, (tx) =>
        tx.execute(sql`select * from app.cuenta_auth_por_correo('admin@motiapp.test')`),
      );
      expect(desdeDueno.rows).toHaveLength(0);
      await expect(
        conTenant(negocio.tenantId, (tx) => tx.execute(sql`select email from neon_auth."user" limit 1`)),
      ).rejects.toThrow();
    });
  });

  describe("tablas de plataforma", () => {
    it("un dueño no ve la auditoría ni las sesiones de soporte de su propio negocio", async () => {
      expect(await contarAuditoriaSinRls(negocio.tenantId)).toBeGreaterThan(0);
      const [auditoria, sesiones] = await conTenant(negocio.tenantId, async (tx) => [
        await tx.select().from(auditoriaAdmin),
        await tx.select().from(impersonaciones),
      ]);
      expect(auditoria).toHaveLength(0);
      expect(sesiones).toHaveLength(0);
    });

    it("un dueño no puede escribir en la auditoría", async () => {
      await expect(
        conTenant(negocio.tenantId, (tx) =>
          tx
            .insert(auditoriaAdmin)
            .values({ accion: "editar_negocio", usuarioEmail: "dueno@motiapp.test", negocioId: negocio.tenantId }),
        ),
      ).rejects.toThrow();
    });
  });
});

async function contarAuditoriaSinRls(negocioId: string): Promise<number> {
  return conConexionDirecta(async (client) => {
    const { rows } = await client.query<{ total: string }>(
      `select count(*) as total from auditoria_admin where negocio_id = $1`,
      [negocioId],
    );
    return Number(rows[0]!.total);
  });
}
