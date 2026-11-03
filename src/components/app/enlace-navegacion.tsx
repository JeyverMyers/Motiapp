"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import { cn } from "@/lib/utils";

/**
 * Enlace de la barra con estado activo. Es de cliente solo por `usePathname`;
 * la barra sigue siendo Server Component.
 *
 * «Panel» (/app) solo está activo en /app exacto; las demás secciones también
 * en sus subrutas (/app/ventas/nueva marca «Ventas»).
 */
export function EnlaceNavegacion({ href, children }: { href: Route; children: React.ReactNode }) {
  const ruta = usePathname();
  const activo = href === "/app" ? ruta === "/app" : ruta === href || ruta.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "relative shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
        activo
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
