import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Tarjeta({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function TarjetaEncabezado({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-4 pb-2", className)} {...props} />;
}

export function TarjetaTitulo({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      className={cn("text-sm font-semibold leading-tight tracking-tight", className)}
      {...props}
    />
  );
}

export function TarjetaDescripcion({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

export function TarjetaContenido({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-4 pt-2", className)} {...props} />;
}

export function TarjetaPie({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-2 p-4 pt-0", className)} {...props} />;
}
