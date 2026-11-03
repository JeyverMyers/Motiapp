import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Mensaje de resultado de una acción. `role` cambia con el tono: un error se
 * anuncia de inmediato (`alert`) y un éxito sin interrumpir (`status`).
 */
export function Aviso({
  tono,
  children,
  className,
}: {
  tono: "exito" | "error";
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role={tono === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3.5 py-3 text-sm font-medium",
        tono === "error"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-exito/40 bg-exito/10 text-exito",
        className,
      )}
    >
      {children}
    </p>
  );
}
