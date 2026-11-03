import Link from "next/link";
import { redirect } from "next/navigation";

import { FormularioMoto } from "@/components/app/formulario-moto";
import { hoyISO } from "@/lib/fechas";
import { sesionDeDueno } from "@/server/auth/sesion";

export const metadata = {
  title: "Registrar compra",
  robots: { index: false, follow: false },
};

export default async function PaginaNuevaMoto() {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/app/inventario"
          className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Volver al inventario
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">Registrar compra</h1>
        <p className="text-sm text-muted-foreground">
          Los datos del proveedor son opcionales, pero sirven para el buscador por
          cédula.
        </p>
      </div>
      <FormularioMoto hoy={hoyISO()} />
    </div>
  );
}
