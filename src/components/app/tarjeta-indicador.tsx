import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const variantesValor = cva("text-[1.375rem] sm:text-[1.625rem] leading-none font-semibold tracking-[-0.025em] tabular-nums", {
  variants: {
    tono: {
      neutro: "",
      exito: "text-exito",
      peligro: "text-destructive",
    },
  },
  defaultVariants: { tono: "neutro" },
});

/**
 * Tarjeta de un solo número.
 *
 * El número va primero y grande: en el celular el dueño abre el panel para ver
 * un dato, no para leer una tabla.
 */
export function TarjetaIndicador({
  etiqueta,
  valor,
  detalle,
  tono,
  icono,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  tono?: VariantProps<typeof variantesValor>["tono"];
  icono?: ReactNode;
}) {
  return (
    <div className="superficie flex flex-col p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.8125rem] font-medium text-muted-foreground">{etiqueta}</span>
        {icono ? (
          <span className="grid size-7 place-items-center rounded-md bg-muted text-muted-foreground [&_svg]:size-3.5">
            {icono}
          </span>
        ) : null}
      </div>
      <p className={cn("mt-3", variantesValor({ tono }))}>{valor}</p>
      {detalle ? <p className="mt-2 text-xs text-muted-foreground">{detalle}</p> : null}
    </div>
  );
}
