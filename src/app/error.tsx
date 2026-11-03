"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Boton, variantesBoton } from "@/components/ui/boton";

/**
 * Error inesperado en cualquier página. No muestra el detalle técnico (puede
 * traer datos internos): solo el código `digest`, que coincide con el registro
 * del servidor en Vercel para encontrarlo.
 */
export default function ErrorDePagina({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-[-0.025em]">Algo salió mal</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        No pudimos cargar esta pantalla. Intenta de nuevo; si sigue pasando, escríbenos y menciona el código.
      </p>
      {error.digest ? (
        <p className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">Código {error.digest}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Boton onClick={reset}>Intentar de nuevo</Boton>
        <Link href="/app" className={variantesBoton({ variant: "outline" })}>
          Ir al panel
        </Link>
      </div>
    </main>
  );
}
