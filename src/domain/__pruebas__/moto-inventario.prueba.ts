/**
 * Reglas del inventario: alta con campos opcionales vacíos, edición sin
 * estado, transiciones de estado, borrado y filtros de la URL.
 */

import { describe, expect, it } from "vitest";

import {
  crearMotoSchema,
  editarMotoSchema,
  filtrosInventarioSchema,
  puedeCambiarEstado,
  puedeEliminarse,
} from "../moto";

const ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

/** Lo que manda el formulario cuando el dueño deja los opcionales en blanco. */
const FORMULARIO = {
  placa: "abc12d",
  marca: "Yamaha",
  modelo: "FZ 2.0",
  anio: "2021",
  color: "negro",
  cilindraje: "",
  numeroMotor: "",
  numeroChasis: "",
  precioCompra: "4.500.000",
  fechaCompra: "2026-10-01",
  proveedorNombre: "",
  proveedorCedula: "",
  proveedorTelefono: "",
  descripcion: "",
};

describe("crearMotoSchema", () => {
  it("acepta los campos opcionales vacíos (antes fallaban cilindraje y cédula)", () => {
    const resultado = crearMotoSchema.safeParse(FORMULARIO);
    expect(resultado.success).toBe(true);
    expect(resultado.success && resultado.data).toMatchObject({
      placa: "ABC12D",
      cilindraje: undefined,
      proveedorCedula: undefined,
      precioCompra: 4_500_000,
      estado: "disponible",
    });
  });

  it("no deja entrar una moto ya vendida: eso es el registro de venta", () => {
    expect(crearMotoSchema.safeParse({ ...FORMULARIO, estado: "vendida" }).success).toBe(false);
    expect(crearMotoSchema.safeParse({ ...FORMULARIO, estado: "reservada" }).success).toBe(true);
  });

  it("valida los opcionales cuando sí se escriben", () => {
    expect(crearMotoSchema.safeParse({ ...FORMULARIO, cilindraje: "0" }).success).toBe(false);
    expect(crearMotoSchema.safeParse({ ...FORMULARIO, proveedorCedula: "12" }).success).toBe(false);
    expect(crearMotoSchema.safeParse({ ...FORMULARIO, cilindraje: "150" }).success).toBe(true);
  });
});

describe("editarMotoSchema", () => {
  it("exige el id y descarta el estado: editar no cambia de estado", () => {
    const resultado = editarMotoSchema.safeParse({ ...FORMULARIO, motoId: ID, estado: "vendida" });
    expect(resultado.success).toBe(true);
    expect(resultado.success && "estado" in resultado.data).toBe(false);
    expect(editarMotoSchema.safeParse(FORMULARIO).success).toBe(false);
  });
});

describe("puedeCambiarEstado", () => {
  it("permite los movimientos normales del mostrador", () => {
    expect(puedeCambiarEstado("disponible", "reservada")).toBe(true);
    expect(puedeCambiarEstado("reservada", "disponible")).toBe(true);
    expect(puedeCambiarEstado("en_reparacion", "disponible")).toBe(true);
    expect(puedeCambiarEstado("disponible", "dada_de_baja")).toBe(true);
    expect(puedeCambiarEstado("dada_de_baja", "disponible")).toBe(true);
    expect(puedeCambiarEstado("devuelta", "disponible")).toBe(true);
  });

  it("nunca lleva a vendida sin registrar la venta", () => {
    expect(puedeCambiarEstado("disponible", "vendida")).toBe(false);
    expect(puedeCambiarEstado("reservada", "vendida")).toBe(false);
  });

  it("una moto vendida no se mueve desde aquí", () => {
    expect(puedeCambiarEstado("vendida", "disponible")).toBe(false);
    expect(puedeCambiarEstado("vendida", "dada_de_baja")).toBe(false);
  });
});

describe("puedeEliminarse", () => {
  it("se borra cualquier moto menos la vendida, que es historia de ganancia", () => {
    expect(puedeEliminarse("disponible")).toBe(true);
    expect(puedeEliminarse("dada_de_baja")).toBe(true);
    expect(puedeEliminarse("vendida")).toBe(false);
  });
});

describe("filtrosInventarioSchema", () => {
  it("los filtros vacíos de la URL no rompen la página", () => {
    const resultado = filtrosInventarioSchema.safeParse({
      estado: "",
      placa: "",
      cedula: "",
      desde: "",
      orden: "",
      dir: "",
    });
    expect(resultado.success).toBe(true);
    expect(resultado.success && resultado.data).toMatchObject({
      estado: undefined,
      orden: "fechaCompra",
      dir: "desc",
      pagina: 1,
    });
  });

  it("solo ordena por columnas de la lista blanca", () => {
    expect(filtrosInventarioSchema.safeParse({ orden: "precioCompra", dir: "asc" }).success).toBe(true);
    expect(filtrosInventarioSchema.safeParse({ orden: "tenant_id" }).success).toBe(false);
  });
});
