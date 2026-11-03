import { describe, expect, it } from "vitest";

import { solicitudDemoSchema } from "../solicitud-demo";

const BASE = {
  nombre: "Juan Pérez",
  negocio: "Motos El Retiro",
  telefono: "3001234567",
  aceptaTratamientoDatos: "on",
};

describe("solicitudDemoSchema", () => {
  it("el correo vacío del formulario cuenta como no enviado, no como inválido", () => {
    const resultado = solicitudDemoSchema.safeParse({ ...BASE, email: "", ciudad: "", mensaje: "" });
    expect(resultado.success).toBe(true);
    expect(resultado.success && resultado.data.email).toBeUndefined();
  });

  it("un correo escrito sí se valida", () => {
    expect(solicitudDemoSchema.safeParse({ ...BASE, email: "juan@" }).success).toBe(false);
    const valido = solicitudDemoSchema.safeParse({ ...BASE, email: " Juan@Motos.co " });
    expect(valido.success && valido.data.email).toBe("juan@motos.co");
  });
});

describe("solicitudDemoSchema: autorizaciones (Ley 1581)", () => {
  it("sin la autorización de datos no se acepta la solicitud", () => {
    const sinAutorizacion = { nombre: BASE.nombre, negocio: BASE.negocio, telefono: BASE.telefono };
    const resultado = solicitudDemoSchema.safeParse(sinAutorizacion);
    expect(resultado.success).toBe(false);
    expect(!resultado.success && resultado.error.issues[0]?.path).toEqual(["aceptaTratamientoDatos"]);
  });

  it("la autorización comercial es opcional y queda en false si no se marca", () => {
    const resultado = solicitudDemoSchema.safeParse(BASE);
    expect(resultado.success && resultado.data).toMatchObject({
      aceptaTratamientoDatos: true,
      aceptaComunicaciones: false,
    });
  });

  it("si se marca la comercial queda en true", () => {
    const resultado = solicitudDemoSchema.safeParse({ ...BASE, aceptaComunicaciones: "on" });
    expect(resultado.success && resultado.data.aceptaComunicaciones).toBe(true);
  });
});
