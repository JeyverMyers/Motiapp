import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Tabla con scroll horizontal propio.
 *
 * En el celular las tablas de inventario no caben, así que el contenedor scrollea
 * en horizontal en vez de romper el layout de la página.
 */
export function Tabla({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TablaEncabezado({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("bg-muted/45 [&_tr]:border-b [&_tr]:hover:bg-transparent", className)} {...props} />;
}

export function TablaCuerpo({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TablaFila({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn("border-b transition-colors duration-150 hover:bg-muted/45", className)}
      {...props}
    />
  );
}

export function TablaCeldaEncabezado({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-10 px-3 text-left align-middle text-xs font-medium tracking-[0.01em] text-muted-foreground whitespace-nowrap first:pl-4 last:pr-4",
        className,
      )}
      {...props}
    />
  );
}

export function TablaCelda({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-3 py-3 align-middle first:pl-4 last:pr-4", className)} {...props} />;
}

/** Mensaje para cuando la consulta no devolvió filas. */
export function TablaVacia({
  columnas,
  mensaje,
}: {
  columnas: number;
  mensaje: string;
}) {
  return (
    <TablaFila>
      <TablaCelda
        colSpan={columnas}
        className="h-24 text-center text-sm text-muted-foreground"
      >
        {mensaje}
      </TablaCelda>
    </TablaFila>
  );
}
