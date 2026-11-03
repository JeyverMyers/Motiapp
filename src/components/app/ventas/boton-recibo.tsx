"use client";

import { BotonPdf } from "@/components/app/boton-pdf";
import { nombreArchivoPdf } from "@/lib/documento-pdf";
import { textoRecibo, type DatosRecibo } from "@/lib/recibo-venta";

export function BotonRecibo({ datos }: { datos: DatosRecibo }) {
  return (
    <BotonPdf
      documento={textoRecibo(datos)}
      archivo={nombreArchivoPdf(datos.moto.placa, "recibo")}
      etiqueta="Recibo en PDF"
    />
  );
}
