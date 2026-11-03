import { describe, expect, it } from "vitest";

import {
  atrasoDeEmpeno,
  corteStockEstancado,
  diasEntre,
  esVentana,
  inicioDeVentana,
  resultadoCompraVenta,
} from "../panel";

describe("ventanas", () => {
  it("solo 7, 30 y 90 son ventanas válidas", () => {
    expect(esVentana("30")).toBe(true);
    expect(esVentana("15")).toBe(false);
    expect(esVentana(undefined)).toBe(false);
  });

  it("una ventana de 7 días incluye hoy y tiene 7 días, no 8", () => {
    expect(inicioDeVentana("2026-10-21", 7)).toBe("2026-10-15");
    expect(diasEntre(inicioDeVentana("2026-10-21", 90), "2026-10-21")).toBe(89);
  });
});

describe("stock estancado", () => {
  it("el corte está 60 días antes de hoy", () => {
    expect(corteStockEstancado("2026-10-21")).toBe("2026-08-22");
    expect(diasEntre("2026-08-22", "2026-10-21")).toBe(60);
  });
});

describe("atrasoDeEmpeno", () => {
  it("cuenta los días de atraso y si sigue en el plazo de gracia", () => {
    expect(atrasoDeEmpeno("2026-10-11", "2026-10-21")).toEqual({ diasAtraso: 10, enGracia: true });
    expect(atrasoDeEmpeno("2026-09-21", "2026-10-21")).toEqual({ diasAtraso: 30, enGracia: true });
    expect(atrasoDeEmpeno("2026-09-20", "2026-10-21")).toEqual({ diasAtraso: 31, enGracia: false });
  });

  it("si el empeño trae su fecha límite de gracia, manda esa", () => {
    expect(atrasoDeEmpeno("2026-09-01", "2026-10-21", "2026-10-31")).toEqual({ diasAtraso: 50, enGracia: true });
    expect(atrasoDeEmpeno("2026-10-11", "2026-10-21", "2026-10-20").enGracia).toBe(false);
  });

  it("un empeño que vence hoy o después no tiene atraso", () => {
    expect(atrasoDeEmpeno("2026-10-25", "2026-10-21").diasAtraso).toBe(0);
  });
});

describe("resultadoCompraVenta", () => {
  it("la ganancia de ventas descuenta los gastos de cada moto; el resultado, además, los operativos", () => {
    expect(
      resultadoCompraVenta({
        totalVendido: 10_000_000,
        costoDeVentas: 8_000_000,
        gastosDeVentas: 200_000,
        gastosOperativos: 500_000,
      }),
    ).toEqual({ gananciaVentas: 1_800_000, margenPorcentaje: 18, resultado: 1_300_000 });
  });

  it("sin ventas, el resultado son los gastos operativos en negativo", () => {
    expect(
      resultadoCompraVenta({ totalVendido: 0, costoDeVentas: 0, gastosDeVentas: 0, gastosOperativos: 300_000 }),
    ).toMatchObject({ gananciaVentas: 0, resultado: -300_000 });
  });
});
