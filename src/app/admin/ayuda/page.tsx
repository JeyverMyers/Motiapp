import type { Metadata } from "next";

import { CentroAyuda } from "@/components/ayuda/centro-ayuda";
import { AYUDA_ADMIN, AYUDA_DUENO } from "@/lib/ayuda";

export const metadata: Metadata = { title: "Ayuda" };

/**
 * Ayuda del super administrador: primero su propia guía y después la del dueño
 * completa, para poder contestarle cualquier pregunta a un cliente.
 */
export default function PaginaAyudaAdmin() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-[-0.025em]">Centro de ayuda</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Tu guía como administrador y, debajo, la guía que ven los dueños de los negocios.
        </p>
      </header>
      <CentroAyuda
        secciones={[
          { titulo: "Administración", lista: AYUDA_ADMIN },
          { titulo: "Guía del dueño del negocio", lista: AYUDA_DUENO },
        ]}
      />
    </div>
  );
}
