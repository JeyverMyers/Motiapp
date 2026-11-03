import Link from "next/link";

import { variantesBoton } from "@/components/ui/boton";

/** 404 de toda la app: en español, con una salida clara. */
export default function NoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-lienzo px-4 text-center">
      <p className="text-sm font-semibold text-muted-foreground tabular-nums">404</p>
      <h1 className="text-2xl font-semibold tracking-[-0.025em]">Esta página no existe</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Puede que el enlace esté mal escrito o que lo que buscabas ya no esté.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Link href="/app" className={variantesBoton()}>
          Ir al panel
        </Link>
        <Link href="/" className={variantesBoton({ variant: "outline" })}>
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
