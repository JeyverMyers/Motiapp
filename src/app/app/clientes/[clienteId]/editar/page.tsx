import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { FormularioCliente } from "@/components/app/clientes/formulario-cliente";
import { idSchema } from "@/domain/comun";
import { nombreCompletoCliente } from "@/domain/cliente";
import { comoRuta } from "@/lib/rutas";
import { sesionDeDueno } from "@/server/auth/sesion";
import { obtenerCliente } from "@/server/repositorios/clientes";

export const metadata = {
  title: "Editar cliente",
  robots: { index: false, follow: false },
};

export default async function PaginaEditarCliente(props: { params: Promise<{ clienteId: string }> }) {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");

  const { clienteId } = await props.params;
  if (!idSchema.safeParse(clienteId).success) notFound();
  const cliente = await obtenerCliente(sesion.tenantId, clienteId);
  if (!cliente) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <Link
          href={comoRuta(`/app/clientes/${cliente.id}`)}
          className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Volver a la ficha
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">Editar {nombreCompletoCliente(cliente)}</h1>
      </div>
      <section className="superficie p-4 sm:p-6">
        <FormularioCliente cliente={cliente} />
      </section>
    </div>
  );
}
