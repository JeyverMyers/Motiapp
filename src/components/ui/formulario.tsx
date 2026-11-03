import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Entrada({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        // h-11 y text-base: por debajo de 16px iOS hace zoom al enfocar.
        "flex h-11 w-full min-w-0 rounded-lg border bg-card px-3 py-2 text-base shadow-xs outline-none transition-[border-color,box-shadow] duration-150 ease-[var(--ease-salida)] hover:border-foreground/20",
        "placeholder:text-muted-foreground file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function AreaTexto({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-20 w-full rounded-lg border bg-card px-3 py-2 text-base shadow-xs outline-none transition-[border-color,box-shadow] duration-150 ease-[var(--ease-salida)] hover:border-foreground/20",
        "placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Selector({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-11 w-full min-w-0 rounded-lg border bg-card px-3 text-base shadow-xs outline-none transition-[border-color,box-shadow] duration-150 ease-[var(--ease-salida)] hover:border-foreground/20",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Etiqueta({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Agrupa etiqueta, control y mensaje de error con el cableado ARIA correcto.
 * Todas las validaciones del proyecto devuelven mensajes en español, así que el
 * error se muestra tal cual.
 */
export function Campo({
  etiqueta,
  htmlFor,
  error,
  ayuda,
  requerido,
  children,
  className,
}: {
  etiqueta: string;
  htmlFor: string;
  error?: string;
  ayuda?: string;
  requerido?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const idError = `${htmlFor}-error`;
  const idAyuda = `${htmlFor}-ayuda`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Etiqueta htmlFor={htmlFor}>
        {etiqueta}
        {requerido ? <span className="text-destructive"> *</span> : null}
      </Etiqueta>
      {children}
      {ayuda && !error ? (
        <p id={idAyuda} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={idError} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
