import type { Metadata } from "next";

import { FormularioIngreso } from "@/components/auth/formulario-ingreso";
import { Aviso } from "@/components/ui/aviso";

export const metadata: Metadata = {
  title: "Ingresar",
  robots: { index: false, follow: false },
};

function primero(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function PaginaLogin(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await props.searchParams;

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h1 className="text-lg font-semibold tracking-tight">Ingresar</h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        Entra con el correo con el que te habilitó el administrador.
      </p>

      {primero(parametros.registrado) === "1" ? (
        <Aviso tono="exito" className="mb-5">
          Tu cuenta quedó creada. Falta que el administrador te habilite el acceso al
          negocio; te avisamos cuando esté listo.
        </Aviso>
      ) : null}

      {primero(parametros.sin_acceso) === "1" ? (
        <Aviso tono="error" className="mb-5">
          Tu usuario no tiene un negocio asignado, está desactivado o el negocio está suspendido. Entra con otra cuenta o pídele al
          administrador que te habilite.
        </Aviso>
      ) : null}

      {primero(parametros.restablecida) === "1" ? (
        <Aviso tono="exito" className="mb-5">
          Listo: tu contraseña quedó cambiada. Ya puedes entrar con la nueva.
        </Aviso>
      ) : null}

      <FormularioIngreso destino={primero(parametros.destino)} />
    </div>
  );
}
