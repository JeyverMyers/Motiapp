import { describe, expect, it } from "vitest";

import {
  crearClienteSchema,
  digitoVerificacionNit,
  editarClienteSchema,
  filtrosClientesSchema,
  formatearDocumento,
  nombreCompletoCliente,
  normalizarDocumento,
} from "../cliente";

describe("digitoVerificacionNit", () => {
  it("calcula el dígito de NIT reales y públicos", () => {
    expect(digitoVerificacionNit("800197268")).toBe(4); // DIAN
    expect(digitoVerificacionNit("890903938")).toBe(8); // Bancolombia
    expect(digitoVerificacionNit("900123456")).toBe(8);
  });
});

describe("normalizarDocumento", () => {
  it("una cédula se guarda solo con dígitos, sin dígito de verificación", () => {
    expect(normalizarDocumento("CC", "1.020.304.050")).toEqual({ ok: true, numero: "1020304050" });
  });

  it("una cédula muy corta o muy larga no pasa", () => {
    expect(normalizarDocumento("CC", "1234").ok).toBe(false);
    expect(normalizarDocumento("CC", "1234567890123").ok).toBe(false);
  });

  it("un NIT con su dígito correcto pasa, con o sin puntos y guion", () => {
    expect(normalizarDocumento("NIT", "800.197.268-4")).toEqual({ ok: true, numero: "8001972684" });
    expect(normalizarDocumento("NIT", "8001972684")).toEqual({ ok: true, numero: "8001972684" });
  });

  it("un NIT con el dígito equivocado se rechaza", () => {
    const resultado = normalizarDocumento("NIT", "800197268-5");
    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error).toMatch(/dígito de verificación/);
  });

  it("el pasaporte admite letras y queda en mayúsculas", () => {
    expect(normalizarDocumento("PP", "ab 123456")).toEqual({ ok: true, numero: "AB123456" });
  });
});

describe("formatearDocumento", () => {
  it("separa miles y, en el NIT, el dígito de verificación", () => {
    expect(formatearDocumento("CC", "1020304050")).toBe("1.020.304.050");
    expect(formatearDocumento("NIT", "8001972684")).toBe("800.197.268-4");
  });
});

describe("crearClienteSchema", () => {
  const CLIENTE = {
    tipoDocumento: "CC",
    numeroDocumento: "1.020.304.050",
    nombres: "María",
    apellidos: "",
    telefono: "300 123 4567",
    telefonoAlterno: "",
    email: "",
  };

  it("normaliza el documento y deja los opcionales vacíos como ausentes", () => {
    const resultado = crearClienteSchema.safeParse(CLIENTE);
    expect(resultado.success && resultado.data).toMatchObject({
      numeroDocumento: "1020304050",
      telefono: "3001234567",
      telefonoAlterno: undefined,
      email: undefined,
    });
  });

  it("el error del documento queda en su campo", () => {
    const resultado = crearClienteSchema.safeParse({ ...CLIENTE, tipoDocumento: "NIT", numeroDocumento: "800197268-5" });
    expect(resultado.success).toBe(false);
    expect(!resultado.success && resultado.error.issues[0]?.path).toEqual(["numeroDocumento"]);
  });

  it("la edición exige el id del cliente", () => {
    expect(editarClienteSchema.safeParse(CLIENTE).success).toBe(false);
  });
});

describe("filtrosClientesSchema y nombreCompletoCliente", () => {
  it("sin filtros, primera página", () => {
    expect(filtrosClientesSchema.parse({})).toMatchObject({ pagina: 1, porPagina: 25 });
  });

  it("une nombres y apellidos sin dejar espacios de sobra", () => {
    expect(nombreCompletoCliente({ nombres: "Ana", apellidos: null })).toBe("Ana");
    expect(nombreCompletoCliente({ nombres: "Ana", apellidos: "Ríos" })).toBe("Ana Ríos");
  });
});
