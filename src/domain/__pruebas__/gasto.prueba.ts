import { describe, expect, it } from "vitest";

import { crearGastoSchema, filtrosGastoSchema, resultadoDelPeriodo } from "../gasto";

const MOTO = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const EMPENO = "7a2d3b4c-5e6f-4a71-9b8c-0d1e2f3a4b5c";

const BASE = { monto: "85000", fecha: "2026-10-15", categoria: "reparacion" };

describe("crearGastoSchema", () => {
  it("un gasto general de compra/venta no necesita moto", () => {
    const resultado = crearGastoSchema.safeParse({ ...BASE, modulo: "compra_venta", motoId: "" });
    expect(resultado.success).toBe(true);
    expect(resultado.success && resultado.data).toMatchObject({ monto: 85_000, motoId: undefined });
  });

  it("un gasto de una moto va al módulo de compra/venta", () => {
    expect(crearGastoSchema.safeParse({ ...BASE, modulo: "compra_venta", motoId: MOTO }).success).toBe(true);
    const mal = crearGastoSchema.safeParse({ ...BASE, modulo: "empeno", motoId: MOTO });
    expect(mal.success).toBe(false);
  });

  it("un gasto de un empeño va al módulo de empeño", () => {
    expect(crearGastoSchema.safeParse({ ...BASE, modulo: "empeno", empenoId: EMPENO }).success).toBe(true);
    expect(crearGastoSchema.safeParse({ ...BASE, modulo: "compra_venta", empenoId: EMPENO }).success).toBe(false);
  });

  it("no puede colgar de una moto y de un empeño a la vez", () => {
    const resultado = crearGastoSchema.safeParse({
      ...BASE,
      modulo: "compra_venta",
      motoId: MOTO,
      empenoId: EMPENO,
    });
    expect(resultado.success).toBe(false);
  });

  it("rechaza montos en cero y categorías inventadas", () => {
    expect(crearGastoSchema.safeParse({ ...BASE, modulo: "empeno", monto: "0" }).success).toBe(false);
    expect(crearGastoSchema.safeParse({ ...BASE, modulo: "empeno", categoria: "fiesta" }).success).toBe(false);
  });

  it("acepta el monto con puntos de miles, como lo escribe el dueño", () => {
    const resultado = crearGastoSchema.safeParse({ ...BASE, modulo: "empeno", monto: "1.250.000" });
    expect(resultado.success && resultado.data.monto).toBe(1_250_000);
  });
});

describe("filtrosGastoSchema", () => {
  it("los selects en «Todos» no filtran", () => {
    expect(filtrosGastoSchema.parse({ modulo: "", categoria: "", desde: "" })).toMatchObject({
      modulo: undefined,
      categoria: undefined,
      desde: undefined,
      pagina: 1,
    });
  });
});

describe("resultadoDelPeriodo", () => {
  it("la ganancia neta resta el costo de lo vendido y los gastos", () => {
    expect(
      resultadoDelPeriodo({ totalVendido: 10_000_000, costoDeVentas: 7_000_000, gastos: 500_000 }),
    ).toEqual({ gananciaBruta: 3_000_000, gananciaNeta: 2_500_000, margenPorcentaje: 25 });
  });

  it("registrar un gasto baja la ganancia en exactamente ese monto", () => {
    const antes = resultadoDelPeriodo({ totalVendido: 8_000_000, costoDeVentas: 6_000_000, gastos: 0 });
    const despues = resultadoDelPeriodo({ totalVendido: 8_000_000, costoDeVentas: 6_000_000, gastos: 120_000 });
    expect(antes.gananciaNeta - despues.gananciaNeta).toBe(120_000);
  });

  it("sin ventas el margen es cero, no una división por cero", () => {
    expect(resultadoDelPeriodo({ totalVendido: 0, costoDeVentas: 0, gastos: 300_000 })).toEqual({
      gananciaBruta: 0,
      gananciaNeta: -300_000,
      margenPorcentaje: 0,
    });
  });
});
