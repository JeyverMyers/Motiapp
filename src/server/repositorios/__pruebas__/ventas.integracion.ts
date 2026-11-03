/**
 * Registro de ventas contra Postgres de verdad.
 *
 * Lo que no se puede ver leyendo el código: que la venta y el alta del
 * comprador en `clientes` pasan juntas bajo RLS (el `on conflict` necesita
 * permisos de lectura y escritura que solo da la política), que una moto no se
 * vende dos veces y que un negocio no puede vender la moto de otro.
 */

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { cerrarPool, conTenant } from "@/db";
import { clientes, motos, ventas } from "@/db/schema";
import { ErrorNegocio } from "@/domain/errores";
import { filtrosVentasSchema } from "@/domain/venta";
import { hayBaseDeDatos, limpiarNegocios, sembrarNegocio } from "@/pruebas/base";
import { devolverVenta, historialDeVentasDeMoto, listarVentas, registrarVenta } from "../ventas";

const soloConBase = describe.skipIf(!hayBaseDeDatos());

soloConBase("registrar una venta", () => {
  let a: Awaited<ReturnType<typeof sembrarNegocio>>;
  let b: Awaited<ReturnType<typeof sembrarNegocio>>;
  let motoA: string;
  let motoB: string;

  const venta = (motoId: string, cambios: Partial<Parameters<typeof registrarVenta>[1]> = {}) => ({
    motoId,
    precioPactado: 5_800_000,
    fecha: "2026-02-01",
    compradorNombre: "Comprador de prueba",
    compradorCedula: "1098765432",
    compradorTelefono: "3109998877",
    metodoPago: "efectivo" as const,
    observaciones: undefined,
    ...cambios,
  });

  beforeAll(async () => {
    a = await sembrarNegocio("VentaA");
    b = await sembrarNegocio("VentaB");
    motoA = (await conTenant(a.tenantId, (tx) => tx.select({ id: motos.id }).from(motos)))[0]!.id;
    motoB = (await conTenant(b.tenantId, (tx) => tx.select({ id: motos.id }).from(motos)))[0]!.id;
    // Precio publicado de la moto de A: la venta debe copiarlo y la base calcular el descuento.
    await conTenant(a.tenantId, (tx) => tx.update(motos).set({ precioPublicado: 6_000_000 }).where(eq(motos.id, motoA)));
  });

  afterAll(async () => {
    await limpiarNegocios([a.tenantId, b.tenantId]);
    await cerrarPool();
  });

  it("rechaza vender antes de la fecha de compra y no deja nada a medias", async () => {
    await expect(registrarVenta(a.tenantId, venta(motoA, { fecha: "2025-12-31" }))).rejects.toBeInstanceOf(
      ErrorNegocio,
    );
    const [moto] = await conTenant(a.tenantId, (tx) => tx.select().from(motos).where(eq(motos.id, motoA)));
    expect(moto?.estado).toBe("disponible");
    expect(await conTenant(a.tenantId, (tx) => tx.select().from(ventas))).toHaveLength(0);
  });

  it("un negocio no puede vender la moto de otro", async () => {
    await expect(registrarVenta(a.tenantId, venta(motoB))).rejects.toThrow(/no existe/);
  });

  it("vende la moto y actualiza al cliente existente sin pisar su nombre", async () => {
    const vendida = await registrarVenta(
      a.tenantId,
      venta(motoA, { compradorCedula: a.numeroDocumento, compradorNombre: "Otro nombre" }),
    );
    // La venta guarda el precio publicado de la moto y la base calcula el descuento.
    expect(vendida).toMatchObject({
      estado: "activa",
      precioPublicado: 6_000_000,
      precioPactado: 5_800_000,
      descuentoAplicado: 200_000,
    });
    const [moto] = await conTenant(a.tenantId, (tx) => tx.select().from(motos).where(eq(motos.id, motoA)));
    expect(moto?.estado).toBe("vendida");

    const fichas = await conTenant(a.tenantId, (tx) =>
      tx.select().from(clientes).where(eq(clientes.numeroDocumento, a.numeroDocumento)),
    );
    expect(fichas).toHaveLength(1);
    expect(fichas[0]?.telefono).toBe("3109998877");
    expect(fichas[0]?.nombres).toBe("Cliente VentaA");
  });

  it("no vende dos veces la misma moto", async () => {
    await expect(registrarVenta(a.tenantId, venta(motoA))).rejects.toThrow(/ya está vendida/);
  });

  it("la base no admite dos ventas activas de la misma moto, aunque se salte la validación", async () => {
    const [existente] = await conTenant(a.tenantId, (tx) => tx.select().from(ventas));
    await expect(
      conTenant(a.tenantId, (tx) =>
        tx.insert(ventas).values({
          tenantId: a.tenantId,
          motoId: motoA,
          clienteId: existente!.clienteId,
          precioPactado: 1_000_000,
          fecha: "2026-02-02",
        }),
      ),
    ).rejects.toThrow();
  });

  it("un comprador nuevo queda como cliente solo de su negocio", async () => {
    await registrarVenta(b.tenantId, venta(motoB));

    const enB = await conTenant(b.tenantId, (tx) =>
      tx.select().from(clientes).where(eq(clientes.numeroDocumento, "1098765432")),
    );
    const enA = await conTenant(a.tenantId, (tx) =>
      tx.select().from(clientes).where(eq(clientes.numeroDocumento, "1098765432")),
    );
    expect(enB).toHaveLength(1);
    expect(enA).toHaveLength(0);
  });

  it("el historial muestra solo las ventas del negocio, con sus totales", async () => {
    const { filas, totales, porMes } = await listarVentas(a.tenantId, filtrosVentasSchema.parse({}));
    expect(filas.map((fila) => fila.motoId)).toEqual([motoA]);
    expect(filas[0]).toMatchObject({ compradorNombre: "Cliente VentaA", descuentoAplicado: 200_000 });
    expect(totales).toEqual({ unidades: 1, totalVendido: 5_800_000, costoDeVentas: 4_500_000, gastos: 0 });
    expect(porMes).toEqual([{ mes: "2026-02", ...totales }]);
  });

  it("un negocio no puede devolver la venta de otro", async () => {
    const [ventaDeA] = await conTenant(a.tenantId, (tx) => tx.select().from(ventas));
    await expect(devolverVenta(b.tenantId, ventaDeA!.id)).rejects.toThrow(/no existe/);
  });

  it("devolver saca la venta del reporte, conserva la historia y deja vender otra vez", async () => {
    const [ventaDeA] = await conTenant(a.tenantId, (tx) => tx.select().from(ventas));
    await devolverVenta(a.tenantId, ventaDeA!.id);

    const [devuelta] = await conTenant(a.tenantId, (tx) => tx.select().from(ventas).where(eq(ventas.id, ventaDeA!.id)));
    expect(devuelta?.estado).toBe("devuelta");
    expect(devuelta?.devueltaEn).toBeInstanceOf(Date);
    const [moto] = await conTenant(a.tenantId, (tx) => tx.select().from(motos).where(eq(motos.id, motoA)));
    expect(moto?.estado).toBe("devuelta");
    expect((await listarVentas(a.tenantId, filtrosVentasSchema.parse({}))).totales.unidades).toBe(0);

    await expect(devolverVenta(a.tenantId, ventaDeA!.id)).rejects.toThrow(/ya fue devuelta/);

    await registrarVenta(a.tenantId, venta(motoA, { fecha: "2026-03-01", precioPactado: 5_500_000 }));
    const historial = await historialDeVentasDeMoto(a.tenantId, motoA);
    expect(historial.map((fila) => fila.estado)).toEqual(["activa", "devuelta"]);
    expect((await listarVentas(a.tenantId, filtrosVentasSchema.parse({}))).totales.totalVendido).toBe(5_500_000);
  });
});
