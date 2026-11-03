import { describe, expect, it } from "vitest";

import { textoContrato, type DatosContrato } from "../contrato-empeno";

const DATOS: DatosContrato = {
  negocio: { nombre: "Motos El Paisa", nit: "900123456-7", direccion: "Cra 1 #2-3", ciudad: "Medellín", telefono: "6041234567" },
  numero: "0042",
  fechaInicio: "2026-10-01",
  fechaVencimiento: "2026-10-31",
  fechaLimiteGracia: "2026-11-30",
  cliente: { nombre: "María Gómez", cedula: "1020304050", telefono: "3001234567" },
  bien: "Moto Yamaha FZ 2.0 2020, placa ABC 12D, color rojo",
  capital: 1_500_000,
  tasaMensual: 10,
  garante: null,
  observaciones: null,
};

function todoElTexto(contrato: ReturnType<typeof textoContrato>): string {
  return [
    contrato.titulo,
    ...contrato.encabezado,
    ...contrato.secciones.flatMap((seccion) => [seccion.titulo, ...seccion.parrafos]),
    ...contrato.firmas,
  ].join("\n");
}

describe("textoContrato", () => {
  it("dice el número, las partes, el bien y el capital pactado", () => {
    const texto = todoElTexto(textoContrato(DATOS));
    expect(texto).toContain("Contrato de empeño N.º 0042");
    expect(texto).toContain("NIT 900123456-7");
    expect(texto).toContain("María Gómez, identificado con cédula 1020304050");
    expect(texto).toContain("placa ABC 12D");
    expect(texto).toMatch(/Capital prestado: \$ 1\.500\.000/);
  });

  it("calcula el interés de un mes sobre el capital inicial", () => {
    expect(todoElTexto(textoContrato(DATOS))).toMatch(/\$ 150\.000 por cada 30 días/);
  });

  it("nombra la fecha límite a partir de la cual el bien pasa al negocio", () => {
    expect(todoElTexto(textoContrato(DATOS))).toMatch(/fecha límite del 30 de nov de 2026/);
  });

  it("incluye al garante y su firma solo cuando existe", () => {
    expect(textoContrato(DATOS).firmas).toHaveLength(2);
    const conGarante = textoContrato({
      ...DATOS,
      garante: { nombre: "Pedro Ruiz", cedula: "70111222", telefono: null },
    });
    expect(conGarante.firmas).toHaveLength(3);
    expect(todoElTexto(conGarante)).toContain("EL GARANTE: Pedro Ruiz, cédula 70111222");
  });
});
