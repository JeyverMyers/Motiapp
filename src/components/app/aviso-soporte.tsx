import { LifeBuoy } from "lucide-react";

import { Boton } from "@/components/ui/boton";
import { formatearFechaHora } from "@/lib/formato";
import { accionTerminarSoporte } from "@/server/acciones/admin";

/**
 * Franja fija mientras un super admin mira un negocio en modo soporte. Deja
 * claro que es solo lectura y hasta cuándo dura, y permite salir de un toque.
 */
export function AvisoSoporte({ negocio, expiraEn }: { negocio: string; expiraEn: Date | null }) {
  return (
    <div role="status" className="border-b border-alerta/50 bg-alerta/15">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 text-sm">
        <LifeBuoy aria-hidden className="size-4 shrink-0 text-alerta" />
        <p className="min-w-0 flex-1">
          <span className="font-semibold">Modo soporte en {negocio}</span>
          <span className="text-muted-foreground">
            {" "}
            · solo lectura{expiraEn ? ` · se cierra solo el ${formatearFechaHora(expiraEn)}` : ""}
          </span>
        </p>
        <form action={accionTerminarSoporte}>
          <Boton type="submit" size="sm" variant="outline">
            Salir del modo soporte
          </Boton>
        </form>
      </div>
    </div>
  );
}
