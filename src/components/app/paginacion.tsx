import Link from "next/link";

import { variantesBoton } from "@/components/ui/boton";
import { comoRuta } from "@/lib/rutas";
import { cn } from "@/lib/utils";

/**
 * Anterior / Siguiente conservando los filtros de la URL.
 *
 * En la primera y la última página el botón deja de ser un enlace: un `<a>` con
 * `disabled` sigue siendo navegable con el teclado y con el dedo.
 */
export function Paginacion({
  base,
  pagina,
  totalPaginas,
  parametros,
}: {
  base: string;
  pagina: number;
  totalPaginas: number;
  parametros: Record<string, string | string[] | undefined>;
}) {
  if (totalPaginas <= 1) return null;

  const construir = (destino: number) => {
    const busqueda = new URLSearchParams();
    for (const [clave, valor] of Object.entries(parametros)) {
      if (clave === "pagina" || valor === undefined || valor === "") continue;
      busqueda.set(clave, Array.isArray(valor) ? (valor[0] ?? "") : valor);
    }
    busqueda.set("pagina", String(destino));
    return comoRuta(`${base}?${busqueda.toString()}`);
  };

  const clases = variantesBoton({ variant: "outline", size: "sm" });

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3">
      {pagina > 1 ? (
        <Link href={construir(pagina - 1)} className={clases}>
          Anterior
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(clases, "opacity-50")}>
          Anterior
        </span>
      )}
      <span className="text-xs text-muted-foreground">
        Página {pagina} de {totalPaginas}
      </span>
      {pagina < totalPaginas ? (
        <Link href={construir(pagina + 1)} className={clases}>
          Siguiente
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(clases, "opacity-50")}>
          Siguiente
        </span>
      )}
    </nav>
  );
}
