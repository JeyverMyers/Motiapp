import { describe, expect, it } from "vitest";

import { nombreArchivoPdf } from "../documento-pdf";
import { textoRecibo, type DatosRecibo } from "../recibo-venta";

const DATOS: DatosRecibo = {
  negocio: { nombre: "Motos El Paisa", nit: "900123456-7", direccion: "Cra 1 #2-3", ciudad: "Medellín", telefono: null },
  moto: {
    placa: "ABC12D",
    marca: "Yamaha",
    modelo: "FZ 2.0",
    anio: 2020,
    color: "Rojo",
    numeroMotor: null,
    numeroChasis: null,
  },
  comprador: { nombre: "Ana Ramírez", cedula: "1020304050", telefono: "3001234567" },
  precioVenta: 5_800_000,
  fechaVenta: "2026-10-20",
  metodoPago: "transferencia",
  observaciones: null,
};

function todoElTexto(recibo: ReturnType<typeof textoRecibo>): string {
  return [
    recibo.titulo,
    ...recibo.encabezado,
    ...recibo.secciones.flatMap((seccion) => [seccion.titulo, ...seccion.parrafos]),
    ...recibo.firmas,
  ].join("\n");
}

describe("textoRecibo", () => {
  it("dice la moto, el comprador, el precio, la forma de pago y la fecha", () => {
    const texto = todoElTexto(textoRecibo(DATOS));
    expect(texto).toContain("Yamaha FZ 2.0 2020");
    expect(texto).toContain("Ana Ramírez");
    expect(texto).toMatch(/5\.800\.000/);
    expect(texto).toContain("Transferencia");
    expect(texto).toContain("2026");
    expect(texto).toContain("NIT 900123456-7");
  });

  it("no muestra lo que costó la moto ni la ganancia", () => {
    expect(todoElTexto(textoRecibo(DATOS))).not.toMatch(/ganancia|costo|precio de compra/i);
  });

  it("incluye motor y chasis solo si se conocen", () => {
    const sinNumeros = textoRecibo(DATOS).secciones.find((s) => s.titulo === "La moto");
    expect(sinNumeros?.parrafos).toHaveLength(1);

    const conNumeros = textoRecibo({ ...DATOS, moto: { ...DATOS.moto, numeroMotor: "E3K123" } }).secciones.find(
      (s) => s.titulo === "La moto",
    );
    expect(conNumeros?.parrafos[1]).toBe("Motor N.º E3K123.");
  });

  it("firman vendedor y comprador", () => {
    expect(textoRecibo(DATOS).firmas).toHaveLength(2);
  });
});

describe("nombreArchivoPdf", () => {
  it("usa el identificador real del documento", () => {
    expect(nombreArchivoPdf("xyz12f", "recibo")).toBe("XYZ12F-recibo");
    expect(nombreArchivoPdf("EMP-0005", "contrato")).toBe("EMP-0005-contrato");
  });

  it("limpia lo que no vale en un nombre de archivo", () => {
    expect(nombreArchivoPdf(" 00 05/A ", "contrato")).toBe("00-05-A-contrato");
    expect(nombreArchivoPdf("", "recibo")).toBe("documento-recibo");
  });
});
