import type { Metadata } from "next";
import Link from "next/link";

import { FormularioRestablecer } from "@/components/auth/formulario-restablecer";
import { Aviso } from "@/components/ui/aviso";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  robots: { index: false, follow: false },
};

/**
 * Destino del enlace del correo de recuperación. Neon Auth agrega `?token=…`
 * si el enlace es válido, o `?error=INVALID_TOKEN` si venció o ya se usó.
 */
export default async function PaginaRestablecerPassword(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await props.searchParams;
  const token = Array.isArray(parametros.token) ? parametros.token[0] : parametros.token;

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h1 className="text-lg font-semibold tracking-tight">Crea una contraseña nueva</h1>

      {token && !parametros.error ? (
        <div className="mt-5">
          <FormularioRestablecer token={token} />
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          <Aviso tono="error">
            Este enlace venció o ya se usó. Los enlaces sirven una sola vez y por poco
            tiempo.
          </Aviso>
          <Link href="/recuperar-password" className="text-center text-sm font-medium underline">
            Pedir un enlace nuevo
          </Link>
        </div>
      )}
    </div>
  );
}
