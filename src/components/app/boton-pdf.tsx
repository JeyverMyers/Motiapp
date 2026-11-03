"use client";

import { FileText } from "lucide-react";
import { useState } from "react";

import { Boton } from "@/components/ui/boton";
import type { DocumentoPdf } from "@/lib/documento-pdf";

/** Carta, en milímetros. Es el tamaño de papel común en Colombia. */
const PAGINA = { ancho: 216, alto: 279, margen: 20 } as const;

/**
 * Genera un documento en el navegador y lo descarga.
 *
 * `jspdf` se carga solo al hacer clic: así no pesa en cada visita a la ficha. El
 * PDF se arma en memoria y nunca pasa por el servidor (regla 4 del proyecto).
 */
export function BotonPdf({
  documento,
  archivo,
  etiqueta,
}: {
  documento: DocumentoPdf;
  /** Nombre del archivo, sin la extensión. */
  archivo: string;
  etiqueta: string;
}) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generar() {
    setGenerando(true);
    setError(null);
    try {
      const { jsPDF } = await import("jspdf");
      dibujar(new jsPDF({ unit: "mm", format: "letter" }), documento).save(`${archivo}.pdf`);
    } catch (causa) {
      console.error("[pdf] no se pudo generar el documento", archivo, causa);
      setError("No se pudo generar el PDF. Intenta de nuevo.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Boton type="button" variant="outline" onClick={generar} disabled={generando}>
        <FileText />
        {generando ? "Generando…" : etiqueta}
      </Boton>
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type Lienzo = InstanceType<typeof import("jspdf").jsPDF>;

function dibujar(doc: Lienzo, documento: DocumentoPdf): Lienzo {
  const anchoTexto = PAGINA.ancho - PAGINA.margen * 2;
  let y = PAGINA.margen;

  function asegurarEspacio(alto: number) {
    if (y + alto > PAGINA.alto - PAGINA.margen) {
      doc.addPage();
      y = PAGINA.margen;
    }
  }

  function escribir(texto: string, tamano: number, estilo: "normal" | "bold" = "normal") {
    doc.setFont("helvetica", estilo).setFontSize(tamano);
    const lineas: string[] = doc.splitTextToSize(texto, anchoTexto);
    const altoLinea = tamano * 0.45;
    asegurarEspacio(lineas.length * altoLinea);
    doc.text(lineas, PAGINA.margen, y);
    y += lineas.length * altoLinea;
  }

  for (const linea of documento.encabezado) escribir(linea, 10);
  y += 6;
  escribir(documento.titulo, 16, "bold");
  y += 4;

  for (const seccion of documento.secciones) {
    y += 3;
    escribir(seccion.titulo.toUpperCase(), 10, "bold");
    y += 1;
    for (const parrafo of seccion.parrafos) {
      escribir(parrafo, 10);
      y += 1.5;
    }
  }

  // Firmas: una línea para firmar y el nombre debajo.
  y += 12;
  for (const firma of documento.firmas) {
    asegurarEspacio(22);
    y += 14;
    doc.setLineWidth(0.2).line(PAGINA.margen, y, PAGINA.margen + 80, y);
    y += 5;
    escribir(firma, 9);
  }

  return doc;
}
