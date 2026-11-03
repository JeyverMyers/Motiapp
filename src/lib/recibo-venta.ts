/**
 * Texto del recibo de venta de una moto.
 *
 * Es el comprobante que se lleva el comprador: dice qué moto, a quién, por
 * cuánto y cómo pagó. No muestra la ganancia: eso es del negocio, no del
 * cliente. Como el contrato de empeño, es una plantilla simple que no
 * reemplaza la revisión de un abogado ni el trámite de traspaso.
 */

import type { MetodoPago } from "@/domain/enums";
import { ETIQUETA_METODO_PAGO } from "@/domain/enums";
import { unir, type DocumentoPdf, type SeccionDocumento } from "./documento-pdf";
import { formatearCedula, formatearFecha, formatearMoneda, formatearPlaca, formatearTelefono } from "./formato";

export type DatosRecibo = {
  negocio: {
    nombre: string;
    nit: string | null;
    direccion: string | null;
    ciudad: string | null;
    telefono: string | null;
  };
  moto: {
    placa: string;
    marca: string;
    modelo: string;
    anio: number;
    color: string;
    numeroMotor: string | null;
    numeroChasis: string | null;
  };
  comprador: { nombre: string; cedula: string; telefono: string | null };
  precioVenta: number;
  fechaVenta: string;
  metodoPago: MetodoPago | null;
  observaciones: string | null;
};

export function textoRecibo(datos: DatosRecibo): DocumentoPdf {
  const { moto, comprador, negocio } = datos;

  const secciones: SeccionDocumento[] = [
    {
      titulo: "Las partes",
      parrafos: [
        `VENDEDOR: ${unir([negocio.nombre, negocio.nit ? `NIT ${negocio.nit}` : null])}.`,
        `COMPRADOR: ${comprador.nombre}, identificado con cédula ${formatearCedula(comprador.cedula)}${comprador.telefono ? `, teléfono ${formatearTelefono(comprador.telefono)}` : ""}.`,
      ],
    },
    {
      titulo: "La moto",
      parrafos: [
        `${moto.marca} ${moto.modelo} ${moto.anio}, color ${moto.color}, placa ${formatearPlaca(moto.placa)}.`,
        ...(moto.numeroMotor || moto.numeroChasis
          ? [unir([moto.numeroMotor ? `Motor N.º ${moto.numeroMotor}` : null, moto.numeroChasis ? `chasis N.º ${moto.numeroChasis}` : null], ", ") + "."]
          : []),
      ],
    },
    {
      titulo: "El pago",
      parrafos: [
        `Precio de venta: ${formatearMoneda(datos.precioVenta)}.`,
        `Forma de pago: ${datos.metodoPago ? ETIQUETA_METODO_PAGO[datos.metodoPago] : "No indicada"}.`,
        `Fecha de la venta: ${formatearFecha(datos.fechaVenta)}.`,
      ],
    },
    {
      titulo: "Declaraciones",
      parrafos: [
        "1. EL VENDEDOR declara haber recibido el precio indicado a satisfacción.",
        "2. EL COMPRADOR declara recibir la moto en el estado en que la revisó y aceptó.",
        "3. Las partes se comprometen a realizar el traspaso ante el organismo de tránsito correspondiente.",
      ],
    },
    ...(datos.observaciones ? [{ titulo: "Observaciones", parrafos: [datos.observaciones] }] : []),
  ];

  return {
    titulo: `Recibo de venta — placa ${formatearPlaca(moto.placa)}`,
    encabezado: [negocio.nombre, unir([negocio.direccion, negocio.ciudad, negocio.telefono])].filter(Boolean),
    secciones,
    firmas: [`EL VENDEDOR — ${negocio.nombre}`, `EL COMPRADOR — ${comprador.nombre}, C.C. ${formatearCedula(comprador.cedula)}`],
  };
}
