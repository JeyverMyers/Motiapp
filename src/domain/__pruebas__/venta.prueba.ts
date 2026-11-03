import { describe, expect, it } from "vitest";

import {
  descuentoAplicado,
  filtrosVentasSchema,
  problemaConFechaDeVenta,
  rangoDePeriodo,
  registrarVentaSchema,
  resumenVentas,
} from "../venta";

const ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

describe("rangoDePeriodo", () => {
  it("este mes va del primer día a hoy", () => {
    expect(rangoDePeriodo("mes", "2026-10-20")).toEqual({ desde: "2026-10-01", hasta: "2026-10-20" });
  });

  it("el mes anterior termina en su último día, aunque tenga 30 o 28", () => {
    expect(rangoDePeriodo("mes_anterior", "2026-10-20")).toEqual({ desde: "2026-09-01", hasta: "2026-09-30" });
    expect(rangoDePeriodo("mes_anterior", "2026-03-05")).toEqual({ desde: "2026-02-01", hasta: "2026-02-28" });
  });

  it("el mes anterior a enero es diciembre del año pasado", () => {
    expect(rangoDePeriodo("mes_anterior", "2026-01-15")).toEqual({ desde: "2025-12-01", hasta: "2025-12-31" });
  });

  it("90 días incluye hoy", () => {
    expect(rangoDePeriodo("90_dias", "2026-10-20")).toEqual({ desde: "2026-07-23", hasta: "2026-10-20" });
  });

  it("este año va desde el 1 de enero", () => {
    expect(rangoDePeriodo("anio", "2026-10-20")).toEqual({ desde: "2026-01-01", hasta: "2026-10-20" });
  });
});

describe("problemaConFechaDeVenta", () => {
  it("acepta vender el mismo día de la compra", () => {
    expect(problemaConFechaDeVenta({ fechaCompra: "2026-10-01", fechaVenta: "2026-10-01", hoy: "2026-10-20" })).toBeNull();
  });

  it("no se vende antes de comprar ni en el futuro", () => {
    expect(problemaConFechaDeVenta({ fechaCompra: "2026-10-05", fechaVenta: "2026-10-01", hoy: "2026-10-20" })).toMatch(/anterior/);
    expect(problemaConFechaDeVenta({ fechaCompra: "2026-10-05", fechaVenta: "2026-10-21", hoy: "2026-10-20" })).toMatch(/futuro/);
  });
});

describe("resumenVentas", () => {
  it("la ganancia resta el costo de las motos y sus gastos", () => {
    expect(
      resumenVentas({ unidades: 2, totalVendido: 10_000_000, costoDeVentas: 8_000_000, gastos: 200_000 }),
    ).toEqual({
      unidades: 2,
      totalVendido: 10_000_000,
      costoDeVentas: 8_000_000,
      gastos: 200_000,
      gananciaBruta: 2_000_000,
      gananciaNeta: 1_800_000,
      margenPorcentaje: 18,
    });
  });

  it("sin ventas todo es cero", () => {
    expect(resumenVentas({ unidades: 0, totalVendido: 0, costoDeVentas: 0, gastos: 0 })).toMatchObject({
      gananciaNeta: 0,
      margenPorcentaje: 0,
    });
  });
});

describe("filtrosVentasSchema", () => {
  it("los filtros vacíos no rompen la página", () => {
    expect(filtrosVentasSchema.safeParse({ desde: "", hasta: "", metodoPago: "" }).success).toBe(true);
  });
});

describe("registrarVentaSchema", () => {
  const VENTA = {
    motoId: ID,
    precioPactado: "5.800.000",
    fecha: "2026-10-20",
    compradorNombre: "Ana Ramírez",
    compradorCedula: "1020304050",
    compradorTelefono: "300 123 4567",
  };

  it("exige el teléfono: el comprador queda en el catálogo de clientes", () => {
    expect(registrarVentaSchema.safeParse({ ...VENTA, compradorTelefono: "" }).success).toBe(false);
    const resultado = registrarVentaSchema.safeParse(VENTA);
    expect(resultado.success && resultado.data).toMatchObject({
      precioPactado: 5_800_000,
      compradorTelefono: "3001234567",
      metodoPago: "efectivo",
    });
  });

  it("normaliza la cédula y exige un motoId con forma de UUID", () => {
    const resultado = registrarVentaSchema.safeParse({ ...VENTA, compradorCedula: "1.020.304.050" });
    expect(resultado.success && resultado.data.compradorCedula).toBe("1020304050");
    expect(registrarVentaSchema.safeParse({ ...VENTA, motoId: "abc" }).success).toBe(false);
    expect(registrarVentaSchema.safeParse({ ...VENTA, compradorCedula: "" }).success).toBe(false);
  });
});

describe("descuentoAplicado", () => {
  it("es lo que se rebajó del precio publicado", () => {
    expect(descuentoAplicado(6_000_000, 5_800_000)).toBe(200_000);
  });

  it("sin precio publicado no hay descuento", () => {
    expect(descuentoAplicado(null, 5_800_000)).toBe(0);
  });

  it("vender por encima de lo publicado da un descuento negativo", () => {
    expect(descuentoAplicado(5_000_000, 5_200_000)).toBe(-200_000);
  });
});
