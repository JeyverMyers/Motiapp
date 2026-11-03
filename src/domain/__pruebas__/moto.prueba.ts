/**
 * Ganancia y rotación del inventario de compra/venta.
 *
 * Regla del negocio: ganancia = precio de venta − precio de compra − gastos.
 * Mientras la moto no se venda no hay ganancia, y eso se representa con `null`,
 * no con cero: "no se ha vendido" y "se vendió sin ganar" son cosas distintas.
 */

import { describe, expect, it } from "vitest";

import {
  crearMotoSchema,
  diasEnInventario,
  filtrosInventarioSchema,
  gananciaBruta,
  gananciaDeMoto,
  margenDeMoto,
} from "../moto";

describe("gananciaBruta", () => {
  it("es la venta menos la compra", () => {
    expect(gananciaBruta({ precioCompra: 4_000_000, precioVenta: 5_500_000 })).toBe(
      1_500_000,
    );
  });

  it("es null mientras la moto no se ha vendido", () => {
    // `undefined` es "sin precio de venta"; `null` es "null en la base".
    expect(gananciaBruta({ precioCompra: 4_000_000 })).toBeNull();
    expect(
      gananciaBruta({ precioCompra: 4_000_000, precioVenta: undefined }),
    ).toBeNull();
  });

  it("puede ser negativa: el negocio también pierde", () => {
    expect(gananciaBruta({ precioCompra: 5_000_000, precioVenta: 4_000_000 })).toBe(
      -1_000_000,
    );
  });

  it("una venta al mismo precio da ganancia cero, que no es null", () => {
    expect(gananciaBruta({ precioCompra: 5_000_000, precioVenta: 5_000_000 })).toBe(0);
  });
});

describe("gananciaDeMoto", () => {
  it("resta los gastos asociados", () => {
    expect(
      gananciaDeMoto({ precioCompra: 4_000_000, precioVenta: 5_500_000 }, 300_000),
    ).toBe(1_200_000);
  });

  it("sin gastos es igual a la ganancia bruta", () => {
    const moto = { precioCompra: 4_000_000, precioVenta: 5_500_000 };
    expect(gananciaDeMoto(moto, 0)).toBe(gananciaBruta(moto));
  });

  it("puede volverse negativa si los gastos se comen la ganancia", () => {
    expect(
      gananciaDeMoto({ precioCompra: 4_000_000, precioVenta: 4_200_000 }, 500_000),
    ).toBe(-300_000);
  });

  it("sigue siendo null sin venta, aunque haya gastos", () => {
    expect(gananciaDeMoto({ precioCompra: 4_000_000 }, 500_000)).toBeNull();
  });
});

describe("margenDeMoto", () => {
  it("es el porcentaje de ganancia sobre el precio de venta", () => {
    // 1.500.000 sobre 5.000.000 = 30%
    expect(margenDeMoto({ precioCompra: 3_500_000, precioVenta: 5_000_000 })).toBe(30);
  });

  it("tiene en cuenta los gastos", () => {
    // (5.000.000 − 3.500.000 − 500.000) / 5.000.000 = 20%
    expect(
      margenDeMoto({ precioCompra: 3_500_000, precioVenta: 5_000_000 }, 500_000),
    ).toBe(20);
  });

  it("es null sin venta", () => {
    expect(margenDeMoto({ precioCompra: 3_500_000 })).toBeNull();
  });
});

describe("diasEnInventario", () => {
  const hoy = new Date("2026-02-01T00:00:00Z");

  it("cuenta desde la compra hasta hoy si no se ha vendido", () => {
    expect(diasEnInventario({ fechaCompra: "2026-01-01" }, hoy)).toBe(31);
  });

  it("se detiene en la fecha de venta", () => {
    expect(
      diasEnInventario({ fechaCompra: "2026-01-01", fechaVenta: "2026-01-11" }, hoy),
    ).toBe(10);
  });

  it("nunca es negativo", () => {
    expect(diasEnInventario({ fechaCompra: "2026-03-01" }, hoy)).toBe(0);
  });
});

describe("crearMotoSchema", () => {
  const valido = {
    placa: "ABC12D",
    marca: "Yamaha",
    modelo: "FZ 2.0",
    anio: "2021",
    color: "Negro",
    precioCompra: "4.500.000",
    fechaCompra: "2026-01-15",
  };

  it("acepta un formulario completo y normaliza los valores", () => {
    const resultado = crearMotoSchema.safeParse(valido);
    expect(resultado.success).toBe(true);
    if (!resultado.success) return;

    expect(resultado.data.placa).toBe("ABC12D");
    expect(resultado.data.anio).toBe(2021);
    expect(resultado.data.precioCompra).toBe(4_500_000);
    expect(resultado.data.color).toBe("Negro");
    // El estado tiene valor por defecto.
    expect(resultado.data.estado).toBe("disponible");
  });

  it("exige los campos obligatorios", () => {
    const resultado = crearMotoSchema.safeParse({});
    expect(resultado.success).toBe(false);
    if (resultado.success) return;

    const campos = resultado.error.issues.map((issue) => issue.path[0]);
    expect(campos).toContain("placa");
    expect(campos).toContain("marca");
    expect(campos).toContain("precioCompra");
    expect(campos).toContain("fechaCompra");
  });

  it("rechaza un precio de compra de cero", () => {
    expect(
      crearMotoSchema.safeParse({ ...valido, precioCompra: "0" }).success,
    ).toBe(false);
  });

  it("rechaza años fuera de rango", () => {
    expect(crearMotoSchema.safeParse({ ...valido, anio: "1900" }).success).toBe(false);
    expect(crearMotoSchema.safeParse({ ...valido, anio: "3000" }).success).toBe(false);
  });
});

describe("filtrosInventarioSchema", () => {
  it("aplica paginación por defecto y convierte los tipos", () => {
    const filtros = filtrosInventarioSchema.parse({});
    expect(filtros.pagina).toBe(1);
    expect(filtros.porPagina).toBe(20);
  });

  it("convierte los parámetros de la URL, que siempre llegan como texto", () => {
    const filtros = filtrosInventarioSchema.parse({ pagina: "3", porPagina: "50" });
    expect(filtros.pagina).toBe(3);
    expect(filtros.porPagina).toBe(50);
  });

  it("normaliza la placa y la cédula del filtro", () => {
    const filtros = filtrosInventarioSchema.parse({
      placa: "abc-12d",
      cedula: "71.234.567",
    });
    expect(filtros.placa).toBe("ABC12D");
    expect(filtros.cedula).toBe("71234567");
  });

  it("rechaza un tope de página absurdo", () => {
    expect(filtrosInventarioSchema.safeParse({ porPagina: "100000" }).success).toBe(
      false,
    );
  });

  it("ignora una búsqueda vacía", () => {
    expect(filtrosInventarioSchema.parse({ texto: "" }).texto).toBeUndefined();
  });
});
