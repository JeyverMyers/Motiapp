import Link from "next/link";

import { EscudoMotiapp } from "@/components/marca/escudo";
import { APP } from "@/lib/constantes";

/**
 * Layout de las pantallas de acceso.
 *
 * Grupo de rutas `(auth)`: agrupa sin agregar segmento a la URL, así que
 * `src/app/(auth)/login/page.tsx` sigue siendo `/login`.
 */
export default function LayoutAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="texto-legible flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" className="flex flex-col items-center gap-2 text-xl font-bold tracking-[-0.01em]">
        <EscudoMotiapp className="h-16 w-auto" />
        {APP.nombre}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
      <p className="text-center text-xs text-muted-foreground">
        ¿Problemas para entrar? Escríbenos a {APP.emailSoporte}
      </p>
    </div>
  );
}
