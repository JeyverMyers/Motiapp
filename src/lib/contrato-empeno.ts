/**
 * Texto del contrato de empeño.
 *
 * Está separado del botón que genera el PDF para poder probarlo sin navegador:
 * lo que importa del contrato es que diga los montos, las fechas y las
 * condiciones correctas, no cómo se dibuja.
 *
 * Es una plantilla simple. No reemplaza la revisión de un abogado.
 */

import { DIAS_MES_COMERCIAL } from "@/domain/empeno";
import { unir, type DocumentoPdf, type SeccionDocumento } from "./documento-pdf";
import { formatearFecha, formatearMoneda } from "./formato";

export type DatosContrato = {
  negocio: {
    nombre: string;
    nit: string | null;
    direccion: string | null;
    ciudad: string | null;
    telefono: string | null;
  };
  numero: string;
  fechaInicio: string;
  fechaVencimiento: string;
  fechaLimiteGracia: string;
  cliente: { nombre: string; cedula: string; telefono: string | null };
  bien: string;
  capital: number;
  tasaMensual: number;
  garante: { nombre: string; cedula: string | null; telefono: string | null } | null;
  observaciones: string | null;
};

export function textoContrato(datos: DatosContrato): DocumentoPdf {
  const interesMensual = Math.round(datos.capital * (datos.tasaMensual / 100));

  const secciones: SeccionDocumento[] = [
    {
      titulo: "Las partes",
      parrafos: [
        `EL ACREEDOR: ${unir([datos.negocio.nombre, datos.negocio.nit ? `NIT ${datos.negocio.nit}` : null])}.`,
        `EL DEUDOR: ${datos.cliente.nombre}, identificado con cédula ${datos.cliente.cedula}${datos.cliente.telefono ? `, teléfono ${datos.cliente.telefono}` : ""}.`,
        ...(datos.garante
          ? [
              `EL GARANTE: ${unir([datos.garante.nombre, datos.garante.cedula ? `cédula ${datos.garante.cedula}` : null, datos.garante.telefono ? `teléfono ${datos.garante.telefono}` : null], ", ")}.`,
            ]
          : []),
      ],
    },
    {
      titulo: "El bien entregado en garantía",
      parrafos: [datos.bien],
    },
    {
      titulo: "El préstamo",
      parrafos: [
        `Capital prestado: ${formatearMoneda(datos.capital)}.`,
        `Interés: ${datos.tasaMensual}% mensual sobre el capital pendiente, equivalente a ${formatearMoneda(interesMensual)} por cada ${DIAS_MES_COMERCIAL} días sobre el capital inicial. El interés es simple y se causa por día.`,
        `Fecha del préstamo: ${formatearFecha(datos.fechaInicio)}. Vencimiento: ${formatearFecha(datos.fechaVencimiento)}.`,
      ],
    },
    {
      titulo: "Condiciones",
      parrafos: [
        "1. EL DEUDOR puede pagar en cualquier momento el capital más el interés causado a la fecha y recuperar el bien.",
        "2. Los abonos se aplican primero al interés causado y después al capital, salvo que las partes acuerden otra cosa al momento del pago.",
        "3. El plazo puede renovarse pagando el interés causado hasta la fecha de la renovación.",
        `4. Si a la fecha límite del ${formatearFecha(datos.fechaLimiteGracia)} EL DEUDOR no ha pagado ni renovado, el bien pasa a ser propiedad de EL ACREEDOR sin necesidad de aviso adicional.`,
        "5. EL ACREEDOR conservará el bien en el estado en que lo recibió mientras el préstamo esté vigente.",
      ],
    },
    ...(datos.observaciones
      ? [{ titulo: "Observaciones", parrafos: [datos.observaciones] }]
      : []),
  ];

  return {
    titulo: `Contrato de empeño N.º ${datos.numero}`,
    encabezado: [
      datos.negocio.nombre,
      unir([datos.negocio.direccion, datos.negocio.ciudad, datos.negocio.telefono]),
    ].filter(Boolean),
    secciones,
    firmas: [
      `EL ACREEDOR — ${datos.negocio.nombre}`,
      `EL DEUDOR — ${datos.cliente.nombre}, C.C. ${datos.cliente.cedula}`,
      ...(datos.garante ? [`EL GARANTE — ${datos.garante.nombre}`] : []),
    ],
  };
}
