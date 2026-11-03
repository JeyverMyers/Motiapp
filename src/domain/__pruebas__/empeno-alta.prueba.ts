import { describe, expect, it } from "vitest";

import { filtrarMotos } from "@/components/app/buscador-moto";
import type { MotoVendible } from "@/server/repositorios/ventas";

import { crearEmpenoSchema, formatearNumeroEmpeno } from "../empeno";

const BASE = {
  clienteId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  capital: "1.500.000",
  tasaMensual: "10",
  fechaInicio: "2026-10-21",
};

describe("formatearNumeroEmpeno (B5.2)", () => {
  it("rellena a cuatro cifras con el prefijo EMP-", () => {
    expect(formatearNumeroEmpeno(1)).toBe("EMP-0001");
    expect(formatearNumeroEmpeno(37)).toBe("EMP-0037");
  });

  it("no corta los números de más de cuatro cifras", () => {
    expect(formatearNumeroEmpeno(12345)).toBe("EMP-12345");
  });
});

describe("crearEmpenoSchema con bien «otro» (B5.3 y B5.4)", () => {
  it("acepta un bien con solo descripción y valor de tasación", () => {
    const resultado = crearEmpenoSchema.safeParse({
      ...BASE,
      tipoBien: "otro",
      otro: { descripcion: "Taladro DeWalt 20V", valorTasacion: "800.000" },
    });
    expect(resultado.success).toBe(true);
    expect(resultado.success && resultado.data.tipoBien === "otro" && resultado.data.otro).toMatchObject({
      descripcion: "Taladro DeWalt 20V",
      valorTasacion: 800000,
    });
  });

  it("exige la descripción y el valor, y señala cada campo", () => {
    const resultado = crearEmpenoSchema.safeParse({ ...BASE, tipoBien: "otro", otro: {} });
    expect(resultado.success).toBe(false);
    const campos = resultado.success ? [] : resultado.error.issues.map((problema) => problema.path.join("."));
    expect(campos).toEqual(expect.arrayContaining(["otro.descripcion", "otro.valorTasacion"]));
  });

  it("no pide placa ni IMEI para un bien «otro»", () => {
    const resultado = crearEmpenoSchema.safeParse({
      ...BASE,
      tipoBien: "otro",
      otro: { descripcion: "Anillo de oro 18k", valorTasacion: "500000", identificador: "" },
    });
    expect(resultado.success).toBe(true);
  });

  it("el número ya no viene del formulario", () => {
    const resultado = crearEmpenoSchema.safeParse({
      ...BASE,
      numero: "999",
      tipoBien: "otro",
      otro: { descripcion: "Guitarra Yamaha", valorTasacion: "300000" },
    });
    expect(resultado.success && "numero" in resultado.data).toBe(false);
  });
});

describe("filtrarMotos (B5.1)", () => {
  const moto = (placa: string, marca: string, modelo: string, anio: number): MotoVendible => ({
    id: placa,
    placa,
    marca,
    modelo,
    anio,
    precioCompra: 1,
    precioPublicado: null,
    gastos: 0,
  });
  const motos = [moto("ABC12D", "Yamaha", "FZ 2.0", 2021), moto("XYZ98E", "Honda", "CB 190R", 2019)];

  it("sin texto devuelve todas", () => {
    expect(filtrarMotos(motos, "  ")).toHaveLength(2);
  });

  it("encuentra por placa con o sin espacio y sin importar mayúsculas", () => {
    expect(filtrarMotos(motos, "abc 12d").map((m) => m.placa)).toEqual(["ABC12D"]);
    expect(filtrarMotos(motos, "xyz98").map((m) => m.placa)).toEqual(["XYZ98E"]);
  });

  it("combina palabras de marca, modelo y año", () => {
    expect(filtrarMotos(motos, "honda 2019").map((m) => m.placa)).toEqual(["XYZ98E"]);
    expect(filtrarMotos(motos, "yamaha 2019")).toHaveLength(0);
  });
});
