import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CentroAyuda } from "@/components/ayuda/centro-ayuda";
import { tieneModulo } from "@/domain/negocio";
import { AYUDA_DUENO } from "@/lib/ayuda";
import { sesionDeDueno } from "@/server/auth/sesion";

export const metadata: Metadata = { title: "Ayuda" };

/**
 * Centro de ayuda del dueño. Los empeños solo aparecen si el plan del negocio
 * los incluye, para no explicar algo que no puede usar.
 */
export default async function PaginaAyuda() {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");
  const conEmpenos = tieneModulo(sesion.plan, "empenos");
  const lista = AYUDA_DUENO.filter((seccion) => conEmpenos || !seccion.soloConEmpenos);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-[-0.025em]">Centro de ayuda</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Paso a paso para usar MotiApp: comprar, vender{conEmpenos ? ", empeñar" : ""} y resolver dudas. Busca lo
          que necesitas o elige un tema.
        </p>
      </header>
      <CentroAyuda secciones={[{ lista }]} />
    </div>
  );
}
