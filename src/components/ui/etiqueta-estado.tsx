import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const variantesEtiqueta = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        neutro: "border-transparent bg-muted text-muted-foreground",
        exito: "border-exito/20 bg-exito/10 text-exito",
        alerta: "border-alerta/35 bg-alerta/15 text-alerta-foreground",
        peligro: "border-destructive/20 bg-destructive/10 text-destructive",
        info: "border-info/20 bg-info/10 text-info",
        contorno: "text-foreground",
      },
    },
    defaultVariants: { variant: "neutro" },
  },
);

export function EtiquetaEstado({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof variantesEtiqueta>) {
  return <span className={cn(variantesEtiqueta({ variant, className }))} {...props} />;
}
