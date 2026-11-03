/**
 * Panel contra Postgres de verdad. Sus consultas son SQL crudo, así que solo
 * una base real dice si los números y las alertas son los correctos y si
 * respetan el aislamiento entre negocios.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { cerrarPool, conTenant } from "@/db";
import { empenos, gastos, motos } from "@/db/schema";
import { hayBaseDeDatos, limpiarNegocios, sembrarNegocio } from "@/pruebas/base";
import { hoyISO } from "@/lib/fechas";
import { resumenPanel } from "../panel";
import { registrarVenta } from "../ventas";

const soloConBase = describe.skipIf(!hayBaseDeDatos());

function haceDias(hoy: string, dias: number): string {
  const fecha = new Date(`${hoy}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() - dias);
  return fecha.toISOString().slice(0, 10);
}

soloConBase("panel de control", () => {
  const hoy = hoyISO();
  let a: Awaited<ReturnType<typeof sembrarNegocio>>;
  let b: Awaited<ReturnType<typeof sembrarNegocio>>;
  let motoA: string;

  beforeAll(async () => {
    a = await sembrarNegocio("PanelA");
    b = await sembrarNegocio("PanelB");
    motoA = (await conTenant(a.tenantId, (tx) => tx.select().from(motos)))[0]!.id;
    // La moto sembrada se compró el 2026-01-15: lleva más de 60 días en inventario.
    // El empeño de A vence hace 40 días: vencido y fuera del plazo de gracia.
    await conTenant(a.tenantId, (tx) =>
      tx.update(empenos).set({
        fechaInicio: haceDias(hoy, 70),
        fechaVencimiento: haceDias(hoy, 40),
        fechaLimiteGracia: haceDias(hoy, 10),
      }),
    );
  });

  afterAll(async () => {
    await limpiarNegocios([a.tenantId, b.tenantId]);
    await cerrarPool();
  });

  it("alerta la moto con más de 60 días y el empeño vencido, cada uno en su negocio", async () => {
    const panelA = await resumenPanel(a.tenantId, 30, hoy);
    expect(panelA.compraVenta.motosEstancadas).toBe(1);
    expect(panelA.alertas.stockEstancado.map((moto) => moto.motoId)).toEqual([motoA]);
    expect(panelA.alertas.stockEstancado[0]!.diasEnInventario).toBeGreaterThan(60);

    expect(panelA.empeno.vencidos).toBe(1);
    expect(panelA.alertas.vencidos[0]).toMatchObject({ numero: a.numeroEmpeno, diasAtraso: 40, enGracia: false });

    // B tiene su propia moto vieja, pero su empeño no está vencido y no ve nada de A.
    const panelB = await resumenPanel(b.tenantId, 30, hoy);
    expect(panelB.empeno.vencidos).toBe(0);
    expect(panelB.alertas.stockEstancado.map((moto) => moto.motoId)).not.toContain(motoA);
  });

  it("los números de compra/venta separan los gastos de la moto de los operativos", async () => {
    await registrarVenta(a.tenantId, {
      motoId: motoA,
      precioPactado: 5_000_000,
      fecha: hoy,
      compradorNombre: "Comprador Panel",
      compradorCedula: "1099887766",
      compradorTelefono: "3001112233",
      metodoPago: "efectivo",
      observaciones: undefined,
    });
    await conTenant(a.tenantId, (tx) =>
      tx.insert(gastos).values([
        { tenantId: a.tenantId, modulo: "compra_venta", motoId: motoA, monto: 100_000, fecha: hoy, categoria: "reparacion" },
        { tenantId: a.tenantId, modulo: "compra_venta", monto: 50_000, fecha: hoy, categoria: "arriendo" },
      ]),
    );

    const panel = await resumenPanel(a.tenantId, 7, hoy);
    expect(panel.compraVenta).toMatchObject({
      unidadesVendidas: 1,
      totalVendido: 5_000_000,
      costoDeVentas: 4_500_000,
      gastosDeVentas: 100_000,
      gananciaVentas: 400_000,
      gastosOperativos: 50_000,
      resultado: 350_000,
      // Vendida, ya no está en inventario ni cuenta como estancada.
      motosEstancadas: 0,
    });

    // 7 días son 7 puntos, del inicio de la ventana a hoy, y la venta cae hoy.
    expect(panel.serie).toHaveLength(7);
    expect(panel.serie.at(-1)).toMatchObject({ fecha: hoy, ventas: 5_000_000, ganancia: 500_000, operaciones: 1 });

    // El otro negocio no ve la venta de A.
    expect((await resumenPanel(b.tenantId, 7, hoy)).compraVenta.unidadesVendidas).toBe(0);
  });
});
