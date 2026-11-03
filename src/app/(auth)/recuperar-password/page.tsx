import type { Metadata } from "next";

import { FormularioRecuperar } from "@/components/auth/formulario-recuperar";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false, follow: false },
};

export default function PaginaRecuperarPassword() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h1 className="text-lg font-semibold tracking-tight">Recuperar contraseña</h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        Escribe el correo con el que entras y te mandamos un enlace para crear una
        contraseña nueva.
      </p>
      <FormularioRecuperar />
    </div>
  );
}
