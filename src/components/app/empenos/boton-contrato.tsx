"use client";

import { BotonPdf } from "@/components/app/boton-pdf";
import { textoContrato, type DatosContrato } from "@/lib/contrato-empeno";
import { nombreArchivoPdf } from "@/lib/documento-pdf";

export function BotonContrato({ datos }: { datos: DatosContrato }) {
  return (
    <BotonPdf
      documento={textoContrato(datos)}
      archivo={nombreArchivoPdf(datos.numero, "contrato")}
      etiqueta="Contrato en PDF"
    />
  );
}
