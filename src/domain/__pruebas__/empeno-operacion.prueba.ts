/**
 * Operación diaria de un empeño: saldos con abonos fechados, renovación y
 * pérdida del bien.
 *
 * Van aparte de `empeno.prueba.ts` porque cubren las reglas que usa la ficha del
 * empeño, no las primitivas de cálculo.
 */

import { describe, expect, it } from "vitest";

import {
  DIAS_GRACIA_VENCIMIENTO,
  calcularRenovacion,
  declararPerdidoSchema,
  filtrosEmpenoSchema,
  historialDeAbonos,
  puedeDeclararsePerdido,
  renovarEmpenoSchema,
  saldoConAbonos,
  saldoEmpeno,
  sobranteDeAbono,
} from "../empeno";

const ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

/** Fecha simple (AAAA-MM-DD) corrida N días desde una base fija. */
function dia(diasDesdeBase: number): string {
  const base = new Date("2026-01-01T00:00:00Z");
  base.setUTCDate(base.getUTCDate() + diasDesdeBase);
  return base.toISOString().slice(0, 10);
}

const PRESTAMO = { capital: 1_000_000, tasaMensual: 10, fechaInicio: dia(0) };

describe("saldoConAbonos", () => {
  it("sin abonos da lo mismo que saldoEmpeno", () => {
    const conAbonos = saldoConAbonos({ ...PRESTAMO, abonos: [], hasta: dia(45) });
    const sinFechas = saldoEmpeno({
      ...PRESTAMO,
      capitalAbonado: 0,
      interesAbonado: 0,
      hasta: dia(45),
    });
    expect(conAbonos).toEqual(sinFechas);
  });

  it("no borra el interés ya causado cuando el cliente abona a capital", () => {
    // 30 días sobre 1.000.000 = 100.000. Abona 500.000 a capital el día 30.
    // Otros 30 días sobre 500.000 = 50.000. Interés total: 150.000, no 100.000.
    const saldo = saldoConAbonos({
      ...PRESTAMO,
      abonos: [{ fecha: dia(30), aCapital: 500_000, aInteres: 0 }],
      hasta: dia(60),
    });
    expect(saldo.capitalVigente).toBe(500_000);
    expect(saldo.interesPendiente).toBe(150_000);
    expect(saldo.total).toBe(650_000);
  });

  it("un abono a capital el mismo día del empeño causa interés solo sobre el resto", () => {
    const saldo = saldoConAbonos({
      ...PRESTAMO,
      abonos: [{ fecha: dia(0), aCapital: 400_000, aInteres: 0 }],
      hasta: dia(30),
    });
    expect(saldo.capitalVigente).toBe(600_000);
    expect(saldo.interesPendiente).toBe(60_000);
  });

  it("descuenta el interés ya pagado", () => {
    const saldo = saldoConAbonos({
      ...PRESTAMO,
      abonos: [{ fecha: dia(30), aCapital: 0, aInteres: 100_000 }],
      hasta: dia(30),
    });
    expect(saldo.interesPendiente).toBe(0);
    expect(saldo.total).toBe(1_000_000);
  });

  it("ignora los abonos con fecha posterior a la consulta", () => {
    const saldo = saldoConAbonos({
      ...PRESTAMO,
      abonos: [{ fecha: dia(40), aCapital: 1_000_000, aInteres: 0 }],
      hasta: dia(30),
    });
    expect(saldo.capitalVigente).toBe(1_000_000);
    expect(saldo.interesPendiente).toBe(100_000);
  });

  it("no depende del orden en que lleguen los abonos", () => {
    const abonos = [
      { fecha: dia(45), aCapital: 250_000, aInteres: 0 },
      { fecha: dia(15), aCapital: 250_000, aInteres: 0 },
    ];
    const enOrden = saldoConAbonos({ ...PRESTAMO, abonos: [...abonos].reverse(), hasta: dia(60) });
    const desordenado = saldoConAbonos({ ...PRESTAMO, abonos, hasta: dia(60) });
    expect(desordenado).toEqual(enOrden);
    // 15 días × 1.000.000 + 30 días × 750.000 + 15 días × 500.000, al 10% mensual.
    expect(desordenado.interesPendiente).toBe(50_000 + 75_000 + 25_000);
  });

  it("nunca devuelve valores negativos", () => {
    const saldo = saldoConAbonos({
      ...PRESTAMO,
      abonos: [{ fecha: dia(10), aCapital: 2_000_000, aInteres: 900_000 }],
      hasta: dia(30),
    });
    expect(saldo).toEqual({ capitalVigente: 0, interesPendiente: 0, total: 0 });
  });
});

describe("sobranteDeAbono", () => {
  it("es cero cuando el reparto absorbe todo el monto", () => {
    expect(sobranteDeAbono(150_000, { aInteres: 100_000, aCapital: 50_000 })).toBe(0);
  });

  it("detecta el dinero que no se pudo aplicar", () => {
    // Abonar 100.000 'solo a interés' cuando se deben 60.000 deja 40.000 sin
    // destino. Si se guardara así, el monto del abono no cuadraría con el reparto.
    expect(sobranteDeAbono(100_000, { aInteres: 60_000, aCapital: 0 })).toBe(40_000);
  });
});

describe("calcularRenovacion", () => {
  it("si se renueva antes de vencer, el plazo nuevo corre desde el vencimiento", () => {
    // El cliente no pierde los días que le quedaban.
    expect(
      calcularRenovacion({ fechaVencimiento: dia(30), fechaRenovacion: dia(25), dias: 30 }),
    ).toEqual({
      fechaVencimiento: dia(60),
      fechaLimiteGracia: dia(60 + DIAS_GRACIA_VENCIMIENTO),
    });
  });

  it("si se renueva ya vencido, el plazo nuevo corre desde el día de la renovación", () => {
    expect(
      calcularRenovacion({ fechaVencimiento: dia(30), fechaRenovacion: dia(40), dias: 30 }),
    ).toEqual({
      fechaVencimiento: dia(70),
      fechaLimiteGracia: dia(70 + DIAS_GRACIA_VENCIMIENTO),
    });
  });

  it("rechaza plazos que no son un número positivo de días", () => {
    expect(() =>
      calcularRenovacion({ fechaVencimiento: dia(30), fechaRenovacion: dia(25), dias: 0 }),
    ).toThrow();
  });
});

describe("historialDeAbonos", () => {
  it("muestra el saldo que quedó después de cada abono, en orden cronológico", () => {
    const historial = historialDeAbonos({
      ...PRESTAMO,
      abonos: [
        { id: "b", fecha: dia(60), aInteres: 50_000, aCapital: 0 },
        { id: "a", fecha: dia(30), aInteres: 100_000, aCapital: 500_000 },
      ],
    });

    expect(historial.map((fila) => fila.id)).toEqual(["a", "b"]);
    // Día 30: debía 1.100.000, pagó 600.000.
    expect(historial[0]).toMatchObject({ saldoDespues: 500_000, capitalDespues: 500_000 });
    // Día 60: 30 días más sobre 500.000 = 50.000 de interés, que pagó.
    expect(historial[1]).toMatchObject({ saldoDespues: 500_000, capitalDespues: 500_000 });
  });

  it("dos abonos el mismo día se aplican uno después del otro", () => {
    const historial = historialDeAbonos({
      ...PRESTAMO,
      abonos: [
        { fecha: dia(30), aInteres: 100_000, aCapital: 0 },
        { fecha: dia(30), aInteres: 0, aCapital: 1_000_000 },
      ],
    });
    expect(historial.map((fila) => fila.saldoDespues)).toEqual([1_000_000, 0]);
  });
});

describe("renovarEmpenoSchema", () => {
  it("acepta el plazo como texto, que es como llega del formulario", () => {
    const resultado = renovarEmpenoSchema.safeParse({ empenoId: ID, fecha: dia(0), dias: "30" });
    expect(resultado.success && resultado.data.dias).toBe(30);
  });

  it("rechaza plazos fraccionarios o en cero", () => {
    expect(renovarEmpenoSchema.safeParse({ empenoId: ID, fecha: dia(0), dias: "0" }).success).toBe(false);
    expect(renovarEmpenoSchema.safeParse({ empenoId: ID, fecha: dia(0), dias: "1.5" }).success).toBe(false);
  });
});

describe("declararPerdidoSchema", () => {
  it("un checkbox marcado llega como 'on'", () => {
    const resultado = declararPerdidoSchema.safeParse({
      empenoId: ID,
      fecha: dia(0),
      pasarAInventario: "on",
    });
    expect(resultado.success && resultado.data.pasarAInventario).toBe(true);
  });

  it("un checkbox desmarcado no se envía", () => {
    const resultado = declararPerdidoSchema.safeParse({ empenoId: ID, fecha: dia(0) });
    expect(resultado.success && resultado.data.pasarAInventario).toBe(false);
  });
});

describe("filtrosEmpenoSchema", () => {
  it("un select en «Todos» llega vacío y significa sin filtro, no un error", () => {
    const resultado = filtrosEmpenoSchema.safeParse({ estado: "", tipoBien: "", desde: "" });
    expect(resultado.success).toBe(true);
    expect(resultado.success && resultado.data.estado).toBeUndefined();
  });

  it("'false' en la URL no activa el filtro de por vencer", () => {
    const resultado = filtrosEmpenoSchema.parse({ soloPorVencer: "false" });
    expect(resultado.soloPorVencer).toBe(false);
  });

  it("el checkbox marcado sí lo activa", () => {
    expect(filtrosEmpenoSchema.parse({ soloPorVencer: "true" }).soloPorVencer).toBe(true);
  });

  it("sin parámetros usa la primera página", () => {
    expect(filtrosEmpenoSchema.parse({})).toMatchObject({ pagina: 1, soloPorVencer: false });
  });
});

describe("puedeDeclararsePerdido", () => {
  it("un empeño activo que ya venció se puede declarar perdido", () => {
    expect(
      puedeDeclararsePerdido({ estado: "activo", fechaVencimiento: dia(30), hoy: dia(31) }),
    ).toBe(true);
  });

  it("no antes del vencimiento: el cliente todavía está dentro del plazo", () => {
    expect(
      puedeDeclararsePerdido({ estado: "activo", fechaVencimiento: dia(30), hoy: dia(30) }),
    ).toBe(false);
  });

  it("un empeño cerrado no cambia de estado", () => {
    expect(
      puedeDeclararsePerdido({ estado: "pagado", fechaVencimiento: dia(30), hoy: dia(90) }),
    ).toBe(false);
  });
});
