/**
 * Forma común de los documentos que se imprimen (contrato de empeño, recibo de
 * venta). El texto se arma con funciones puras que se prueban sin navegador; el
 * dibujo lo hace `BotonPdf`.
 */

export type SeccionDocumento = { titulo: string; parrafos: string[] };

export type DocumentoPdf = {
  titulo: string;
  encabezado: string[];
  secciones: SeccionDocumento[];
  /** Una línea de firma por cada texto. */
  firmas: string[];
};

/**
 * Nombre del archivo descargado, sin extensión: el identificador real del
 * documento y su tipo («XYZ12F-recibo», «EMP-0005-contrato»). Se quitan los
 * caracteres que no valen en un nombre de archivo.
 */
export function nombreArchivoPdf(identificador: string, tipo: "recibo" | "contrato"): string {
  const limpio = identificador.trim().toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return `${limpio || "documento"}-${tipo}`;
}

/** Une las partes presentes con un separador, sin dejar huecos por los vacíos. */
export function unir(partes: (string | null | undefined)[], separador = " · "): string {
  return partes.filter(Boolean).join(separador);
}
