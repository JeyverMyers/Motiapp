import Link from "next/link";
import { redirect } from "next/navigation";

import { FormularioCliente } from "@/components/app/clientes/formulario-cliente";
import { sesionDeDueno } from "@/server/auth/sesion";

export const metadata = {
  title: "Nuevo cliente",
  robots: { index: false, follow: false },
};

export default async function PaginaNuevoCliente() {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <Link
          href="/app/clientes"
          className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Volver a clientes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">Nuevo cliente</h1>
      </div>
      <section className="superficie p-4 sm:p-6">
        <FormularioCliente />
      </section>
    </div>
  );
}
