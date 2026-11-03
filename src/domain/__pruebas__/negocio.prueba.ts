import { describe, expect, it } from "vitest";

import {
  asignarDuenoSchema,
  cambiosEntre,
  confirmacionCoincide,
  crearNegocioSchema,
  iniciarSoporteSchema,
  negocioEstaVacio,
  negocioPuedeEntrar,
  tieneModulo,
} from "../negocio";

describe("tieneModulo", () => {
  it("compra/venta está en todos los planes", () => {
    expect(tieneModulo("basico", "compra_venta")).toBe(true);
    expect(tieneModulo(undefined, "compra_venta")).toBe(true);
  });

  it("empeños solo en Empresa e Ilimitado", () => {
    expect(tieneModulo("basico", "empenos")).toBe(false);
    expect(tieneModulo("pro", "empenos")).toBe(true);
    expect(tieneModulo("ilimitado", "empenos")).toBe(true);
  });

  it("un plan desconocido no abre módulos extra", () => {
    expect(tieneModulo("platino", "empenos")).toBe(false);
  });
});

describe("negocioPuedeEntrar", () => {
  it("activo y en prueba entran; suspendido no", () => {
    expect(negocioPuedeEntrar("activo")).toBe(true);
    expect(negocioPuedeEntrar("prueba")).toBe(true);
    expect(negocioPuedeEntrar("suspendido")).toBe(false);
    expect(negocioPuedeEntrar(null)).toBe(false);
  });
});

describe("crearNegocioSchema", () => {
  it("por defecto el negocio nace en prueba y con plan Empresa", () => {
    expect(crearNegocioSchema.parse({ nombre: "Motos La 80", nit: "" })).toMatchObject({
      plan: "pro",
      estado: "prueba",
      nit: undefined,
    });
  });

  it("el NIT se valida con su dígito de verificación", () => {
    expect(crearNegocioSchema.parse({ nombre: "Motos La 80", nit: "800.197.268-4" }).nit).toBe("8001972684");
    expect(crearNegocioSchema.safeParse({ nombre: "Motos La 80", nit: "800197268-5" }).success).toBe(false);
  });
});

describe("formularios de soporte y dueño", () => {
  const ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

  it("entrar en modo soporte exige un motivo de verdad", () => {
    expect(iniciarSoporteSchema.safeParse({ negocioId: ID, motivo: "ver" }).success).toBe(false);
    expect(iniciarSoporteSchema.safeParse({ negocioId: ID, motivo: "No le cuadra el reporte de ventas" }).success).toBe(true);
  });

  it("el correo del dueño se normaliza", () => {
    expect(asignarDuenoSchema.parse({ negocioId: ID, email: " Ana@Correo.COM ", nombre: "Ana Ríos" }).email).toBe(
      "ana@correo.com",
    );
  });
});

describe("borrado de negocios", () => {
  it("la confirmación es el nombre, sin importar mayúsculas ni espacios de más", () => {
    expect(confirmacionCoincide("Motos El Rápido", "  motos  el rápido ")).toBe(true);
    expect(confirmacionCoincide("Motos El Rápido", "Motos")).toBe(false);
  });

  it("solo se borra un negocio sin operación", () => {
    const vacio = { clientes: 0, motos: 0, ventas: 0, empenos: 0, gastos: 0 };
    expect(negocioEstaVacio(vacio)).toBe(true);
    expect(negocioEstaVacio({ ...vacio, clientes: 1 })).toBe(false);
  });
});

describe("cambiosEntre", () => {
  it("lista solo lo que cambió, con el antes y el después", () => {
    expect(cambiosEntre({ plan: "basico", estado: "activo" }, { plan: "pro", estado: "activo" })).toEqual({
      plan: { antes: "basico", despues: "pro" },
    });
  });

  it("un vacío y un nulo cuentan como iguales", () => {
    expect(cambiosEntre({ nit: null }, { nit: undefined })).toEqual({});
  });
});
