/**
 * Alta de empeños contra Postgres de verdad (Bloque 5.5, B5.2–B5.4).
 *
 * Lo que solo se ve ejecutándolo:
 * - el número sale del consecutivo del negocio, en orden y sin huecos;
 * - dos altas simultáneas del mismo negocio nunca reciben el mismo número;
 * - cada negocio lleva su propia cuenta y no ve la del otro (RLS);
 * - un bien «otro» se guarda con su descripción y su valor, y la base rechaza
 *   un «otro» sin ellos aunque alguien salte la validación de la app.
 *
 * Siembran y borran datos: solo contra la rama de desarrollo.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { cerrarPool, conTenant } from "@/db";
import { clientes, consecutivosEmpeno, empenos } from "@/db/schema";
import type { CrearEmpenoInput } from "@/domain/empeno";
import { hayBaseDeDatos, limpiarNegocios, sembrarNegocio } from "@/pruebas/base";
import { crearEmpeno, obtenerEmpeno, siguienteNumeroEmpeno } from "@/server/repositorios/empenos";

const soloConBase = describe.skipIf(!hayBaseDeDatos());

async function clienteDe(tenantId: string): Promise<string> {
  const [cliente] = await conTenant(tenantId, (tx) => tx.select({ id: clientes.id }).from(clientes).limit(1));
  return cliente!.id;
}

type AltaOtro = Extract<CrearEmpenoInput, { tipoBien: "otro" }>;

function bienOtro(clienteId: string, descripcion: string, otro?: AltaOtro["otro"]): AltaOtro {
  return {
    clienteId,
    tipoBien: "otro",
    otro: otro ?? { descripcion, valorTasacion: 800_000 },
    capital: 500_000,
    tasaMensual: 10,
    frecuenciaPago: "mensual",
    fechaInicio: "2026-10-01",
  };
}

soloConBase("alta de empeños (B5.2–B5.4)", () => {
  let a: Awaited<ReturnType<typeof sembrarNegocio>>;
  let b: Awaited<ReturnType<typeof sembrarNegocio>>;
  let clienteA: string;
  let clienteB: string;

  beforeAll(async () => {
    a = await sembrarNegocio("Numeracion A");
    b = await sembrarNegocio("Numeracion B");
    clienteA = await clienteDe(a.tenantId);
    clienteB = await clienteDe(b.tenantId);
  });

  afterAll(async () => {
    await limpiarNegocios([a.tenantId, b.tenantId]);
    await cerrarPool();
  });

  it("el formulario muestra el número que viene", async () => {
    expect(await siguienteNumeroEmpeno(a.tenantId)).toBe("EMP-0001");
  });

  it("asigna EMP-0001 y luego EMP-0002 en el mismo negocio", async () => {
    const primero = await crearEmpeno(a.tenantId, bienOtro(clienteA, "Taladro DeWalt"));
    const segundo = await crearEmpeno(a.tenantId, bienOtro(clienteA, "Pulidora Bosch"));
    expect(primero?.numero).toBe("EMP-0001");
    expect(segundo?.numero).toBe("EMP-0002");
    expect(await siguienteNumeroEmpeno(a.tenantId)).toBe("EMP-0003");
  });

  it("dos altas al mismo tiempo reciben números distintos", async () => {
    const [x, y] = await Promise.all([
      crearEmpeno(a.tenantId, bienOtro(clienteA, "Guitarra")),
      crearEmpeno(a.tenantId, bienOtro(clienteA, "Parlante")),
    ]);
    expect(new Set([x?.numero, y?.numero])).toEqual(new Set(["EMP-0003", "EMP-0004"]));
  });

  it("cada negocio lleva su cuenta y no ve la del otro", async () => {
    const deB = await crearEmpeno(b.tenantId, bienOtro(clienteB, "Bicicleta"));
    expect(deB?.numero).toBe("EMP-0001");

    const contadoresQueVeA = await conTenant(a.tenantId, (tx) => tx.select().from(consecutivosEmpeno));
    expect(contadoresQueVeA.map((fila) => fila.tenantId)).toEqual([a.tenantId]);
  });

  it("un bien «otro» se lee con su descripción y su valor", async () => {
    const creado = await crearEmpeno(
      a.tenantId,
      bienOtro(clienteA, "Anillo de oro 18k", {
        descripcion: "Anillo de oro 18k",
        identificador: "REF-77",
        valorTasacion: 1_200_000,
      }),
    );
    const ficha = await obtenerEmpeno(a.tenantId, creado!.id);
    expect(ficha?.bien).toEqual({
      tipo: "otro",
      descripcion: "Anillo de oro 18k",
      identificador: "REF-77",
      valorTasacion: 1_200_000,
    });
  });

  it("la base rechaza un «otro» sin descripción aunque se salte la app", async () => {
    const [existente] = await conTenant(a.tenantId, (tx) =>
      tx.select({ id: empenos.id }).from(empenos).where(eq(empenos.tipoBien, "otro")).limit(1),
    );
    await expect(
      conTenant(a.tenantId, (tx) =>
        tx.update(empenos).set({ bienDescripcion: null }).where(eq(empenos.id, existente!.id)),
      ),
    ).rejects.toThrow();
  });
});
