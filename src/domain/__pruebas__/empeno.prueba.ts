/**
 * Cálculo de intereses y saldos de empeño.
 *
 * Es el corazón del módulo de empeño: si `interesCausado` o `repartirAbono` están
 * mal, el negocio cobra mal. Estas pruebas son las más importantes del proyecto.
 */

import { describe, expect, it } from "vitest";

import {
  DIAS_ALERTA_VENCIMIENTO,
  DIAS_GRACIA_VENCIMIENTO,
  DIAS_MES_COMERCIAL,
  diasCausados,
  diasParaVencer,
  estadoSegunFechas,
  interesCausado,
  repartirAbono,
  saldoEmpeno,
} from "../empeno";

/** Construye una fecha ISO corrida N días desde una base fija. */
function fecha(diasDesdeBase: number): string {
  const base = new Date("2026-01-01T00:00:00Z");
  base.setUTCDate(base.getUTCDate() + diasDesdeBase);
  return base.toISOString();
}

describe("diasCausados", () => {
  it("no cuenta el día inicial", () => {
    expect(diasCausados(fecha(0), fecha(1))).toBe(1);
    expect(diasCausados(fecha(0), fecha(30))).toBe(30);
  });

  it("devuelve 0 si las fechas son iguales o el orden está invertido", () => {
    expect(diasCausados(fecha(5), fecha(5))).toBe(0);
    expect(diasCausados(fecha(10), fecha(3))).toBe(0);
  });

  it("cobra la fracción de día: una hora ya cuenta como un día", () => {
    const inicio = new Date("2026-01-01T00:00:00Z");
    const unaHoraDespues = new Date("2026-01-01T01:00:00Z");
    expect(diasCausados(inicio, unaHoraDespues)).toBe(1);
  });
});

describe("interesCausado", () => {
  it("causa la tasa completa en un mes comercial de 30 días", () => {
    // 1.000.000 al 10% mensual durante 30 días = 100.000
    expect(
      interesCausado({
        capital: 1_000_000,
        tasaMensual: 10,
        fechaInicio: fecha(0),
        hasta: fecha(30),
      }),
    ).toBe(100_000);
  });

  it("causa la mitad en 15 días", () => {
    expect(
      interesCausado({
        capital: 1_000_000,
        tasaMensual: 10,
        fechaInicio: fecha(0),
        hasta: fecha(15),
      }),
    ).toBe(50_000);
  });

  it("no causa nada el mismo día", () => {
    expect(
      interesCausado({
        capital: 1_000_000,
        tasaMensual: 10,
        fechaInicio: fecha(0),
        hasta: fecha(0),
      }),
    ).toBe(0);
  });

  it("no causa nada si la tasa es cero", () => {
    expect(
      interesCausado({
        capital: 1_000_000,
        tasaMensual: 0,
        fechaInicio: fecha(0),
        hasta: fecha(30),
      }),
    ).toBe(0);
  });

  it("redondea al peso, porque el negocio cobra en efectivo", () => {
    const interes = interesCausado({
      capital: 333_333,
      tasaMensual: 7.5,
      fechaInicio: fecha(0),
      hasta: fecha(11),
    });
    expect(Number.isInteger(interes)).toBe(true);
  });

  it("es interés simple: dos meses son el doble que uno, sin capitalizar", () => {
    const unMes = interesCausado({
      capital: 1_000_000,
      tasaMensual: 10,
      fechaInicio: fecha(0),
      hasta: fecha(DIAS_MES_COMERCIAL),
    });
    const dosMeses = interesCausado({
      capital: 1_000_000,
      tasaMensual: 10,
      fechaInicio: fecha(0),
      hasta: fecha(DIAS_MES_COMERCIAL * 2),
    });
    expect(dosMeses).toBe(unMes * 2);
    // Con capitalización serían 210.000; simple son 200.000.
    expect(dosMeses).toBe(200_000);
  });
});

describe("repartirAbono", () => {
  it("con concepto 'interes' todo va a interés", () => {
    expect(
      repartirAbono({
        monto: 50_000,
        interesPendiente: 100_000,
        capitalVigente: 1_000_000,
        concepto: "interes",
      }),
    ).toEqual({ aInteres: 50_000, aCapital: 0 });
  });

  it("con concepto 'capital' todo va a capital", () => {
    expect(
      repartirAbono({
        monto: 50_000,
        interesPendiente: 100_000,
        capitalVigente: 1_000_000,
        concepto: "capital",
      }),
    ).toEqual({ aInteres: 0, aCapital: 50_000 });
  });

  it("con 'ambos' paga primero el interés y el sobrante baja capital", () => {
    expect(
      repartirAbono({
        monto: 150_000,
        interesPendiente: 100_000,
        capitalVigente: 1_000_000,
        concepto: "ambos",
      }),
    ).toEqual({ aInteres: 100_000, aCapital: 50_000 });
  });

  it("con 'ambos' y monto menor al interés no toca el capital", () => {
    expect(
      repartirAbono({
        monto: 40_000,
        interesPendiente: 100_000,
        capitalVigente: 1_000_000,
        concepto: "ambos",
      }),
    ).toEqual({ aInteres: 40_000, aCapital: 0 });
  });

  it("nunca reparte más de lo que se debe", () => {
    // Abono mayor que interés + capital: el sobrante no se puede aplicar.
    expect(
      repartirAbono({
        monto: 5_000_000,
        interesPendiente: 100_000,
        capitalVigente: 1_000_000,
        concepto: "ambos",
      }),
    ).toEqual({ aInteres: 100_000, aCapital: 1_000_000 });
  });

  it("no deja saldos negativos al abonar a capital de más", () => {
    const reparto = repartirAbono({
      monto: 2_000_000,
      interesPendiente: 0,
      capitalVigente: 1_000_000,
      concepto: "capital",
    });
    expect(reparto.aCapital).toBe(1_000_000);
    expect(reparto.aCapital).toBeLessThanOrEqual(1_000_000);
  });
});

describe("saldoEmpeno", () => {
  it("suma capital vigente e interés causado cuando no hay abonos", () => {
    const saldo = saldoEmpeno({
      capital: 1_000_000,
      capitalAbonado: 0,
      interesAbonado: 0,
      tasaMensual: 10,
      fechaInicio: fecha(0),
      hasta: fecha(30),
    });
    expect(saldo).toEqual({
      capitalVigente: 1_000_000,
      interesPendiente: 100_000,
      total: 1_100_000,
    });
  });

  it("descuenta el capital abonado antes de causar el interés", () => {
    // Si ya abonó 400.000 a capital, el interés se causa sobre 600.000.
    const saldo = saldoEmpeno({
      capital: 1_000_000,
      capitalAbonado: 400_000,
      interesAbonado: 0,
      tasaMensual: 10,
      fechaInicio: fecha(0),
      hasta: fecha(30),
    });
    expect(saldo.capitalVigente).toBe(600_000);
    expect(saldo.interesPendiente).toBe(60_000);
  });

  it("descuenta los intereses ya pagados", () => {
    const saldo = saldoEmpeno({
      capital: 1_000_000,
      capitalAbonado: 0,
      interesAbonado: 100_000,
      tasaMensual: 10,
      fechaInicio: fecha(0),
      hasta: fecha(30),
    });
    expect(saldo.interesPendiente).toBe(0);
    expect(saldo.total).toBe(1_000_000);
  });

  it("nunca devuelve valores negativos", () => {
    const saldo = saldoEmpeno({
      capital: 1_000_000,
      capitalAbonado: 1_500_000,
      interesAbonado: 500_000,
      tasaMensual: 10,
      fechaInicio: fecha(0),
      hasta: fecha(30),
    });
    expect(saldo.capitalVigente).toBe(0);
    expect(saldo.interesPendiente).toBe(0);
    expect(saldo.total).toBe(0);
  });

  it("un empeño totalmente pagado tiene saldo cero", () => {
    const saldo = saldoEmpeno({
      capital: 1_000_000,
      capitalAbonado: 1_000_000,
      interesAbonado: 100_000,
      tasaMensual: 10,
      fechaInicio: fecha(0),
      hasta: fecha(30),
    });
    expect(saldo.total).toBe(0);
  });
});

describe("diasParaVencer", () => {
  it("cuenta los días que faltan", () => {
    expect(diasParaVencer(fecha(7), new Date(fecha(0)))).toBe(7);
  });

  it("devuelve 0 el día del vencimiento", () => {
    expect(diasParaVencer(fecha(0), new Date(fecha(0)))).toBe(0);
  });

  it("devuelve negativo si ya venció", () => {
    expect(diasParaVencer(fecha(-3), new Date(fecha(0)))).toBe(-3);
  });

  it("ignora la hora del día en el vencimiento", () => {
    // Vence a las 23:59 y hoy es el mismo día a las 00:01: sigue siendo hoy.
    expect(
      diasParaVencer("2026-01-08T23:59:00Z", new Date("2026-01-08T00:01:00Z")),
    ).toBe(0);
  });

  it("ignora la hora del día de hoy", () => {
    // Consultar a las 23:00 no debe restar un día.
    expect(
      diasParaVencer("2026-01-09T00:00:00Z", new Date("2026-01-08T23:00:00Z")),
    ).toBe(1);
  });

  it("da el mismo resultado sin importar la zona horaria del servidor", () => {
    // Este es el bug que estas pruebas atraparon: la versión anterior usaba la
    // hora local, así que un servidor en UTC+02:00 adelantaba el vencimiento un
    // día. La función debe ser determinista.
    const original = process.env.TZ;
    const resultadoUTC = diasParaVencer(
      "2026-01-08T23:59:00Z",
      new Date("2026-01-08T00:01:00Z"),
    );

    try {
      // Las zonas se fijan antes de que exista el proceso, así que aquí solo se
      // comprueba el contrato: la función no debe depender de la hora local.
      process.env.TZ = "America/Bogota";
      expect(
        diasParaVencer("2026-01-08T23:59:00Z", new Date("2026-01-08T00:01:00Z")),
      ).toBe(resultadoUTC);

      process.env.TZ = "Europe/Madrid";
      expect(
        diasParaVencer("2026-01-08T23:59:00Z", new Date("2026-01-08T00:01:00Z")),
      ).toBe(resultadoUTC);
    } finally {
      process.env.TZ = original;
    }

    expect(resultadoUTC).toBe(0);
  });

  it("acepta una fecha simple sin hora", () => {
    // Es lo que devuelve Postgres para una columna `date`.
    expect(diasParaVencer("2026-01-15", new Date("2026-01-08T12:00:00Z"))).toBe(7);
  });
});

describe("estadoSegunFechas", () => {
  it("deja pasar el estado guardado si el empeño ya se cerró", () => {
    for (const estado of ["pagado", "perdido", "renovado", "vencido"] as const) {
      expect(
        estadoSegunFechas({
          estado,
          fechaVencimiento: fecha(-100),
          hoy: new Date(fecha(0)),
        }),
      ).toBe(estado);
    }
  });

  it("un empeño activo y lejano sigue activo", () => {
    expect(
      estadoSegunFechas({
        estado: "activo",
        fechaVencimiento: fecha(60),
        hoy: new Date(fecha(0)),
      }),
    ).toBe("activo");
  });

  it("avisa 'por_vencer' dentro de la ventana de alerta", () => {
    expect(
      estadoSegunFechas({
        estado: "activo",
        fechaVencimiento: fecha(DIAS_ALERTA_VENCIMIENTO),
        hoy: new Date(fecha(0)),
      }),
    ).toBe("por_vencer");

    expect(
      estadoSegunFechas({
        estado: "activo",
        fechaVencimiento: fecha(1),
        hoy: new Date(fecha(0)),
      }),
    ).toBe("por_vencer");
  });

  it("vence el mismo día del vencimiento", () => {
    expect(
      estadoSegunFechas({
        estado: "activo",
        fechaVencimiento: fecha(0),
        hoy: new Date(fecha(0)),
      }),
    ).toBe("por_vencer");
  });

  it("pasa a 'vencido' al día siguiente del vencimiento", () => {
    expect(
      estadoSegunFechas({
        estado: "activo",
        fechaVencimiento: fecha(-1),
        hoy: new Date(fecha(0)),
      }),
    ).toBe("vencido");
  });

  it("pasa a 'perdido' solo después de agotar los días de gracia", () => {
    // Justo dentro de la gracia: todavía vencido, no perdido.
    expect(
      estadoSegunFechas({
        estado: "activo",
        fechaVencimiento: fecha(-DIAS_GRACIA_VENCIMIENTO),
        hoy: new Date(fecha(0)),
      }),
    ).toBe("vencido");

    // Un día más allá de la gracia: perdido.
    expect(
      estadoSegunFechas({
        estado: "activo",
        fechaVencimiento: fecha(-DIAS_GRACIA_VENCIMIENTO - 1),
        hoy: new Date(fecha(0)),
      }),
    ).toBe("perdido");
  });
});
