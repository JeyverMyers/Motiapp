import Link from "next/link";
import { redirect } from "next/navigation";

import { FormularioNuevoEmpeno } from "@/components/app/formulario-nuevo-empeno";
import { idSchema } from "@/domain/comun";
import { sesionDeDueno } from "@/server/auth/sesion";
import { obtenerCliente } from "@/server/repositorios/clientes";
import { siguienteNumeroEmpeno, tasaDefecto } from "@/server/repositorios/empenos";

export const metadata = {
  title: "Registrar empeño",
  robots: { index: false, follow: false },
};

export default async function PaginaNuevoEmpeno(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");

  // Desde la ficha de un cliente llega `?clienteId=`: sus datos ya vienen puestos.
  const { clienteId } = await props.searchParams;
  const idCliente = idSchema.safeParse(clienteId).data;
  const [tasa, numero, cliente] = await Promise.all([
    tasaDefecto(sesion.tenantId),
    siguienteNumeroEmpeno(sesion.tenantId),
    idCliente ? obtenerCliente(sesion.tenantId, idCliente) : null,
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/app/empenos"
          className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Volver a empeños
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">Registrar empeño</h1>
        <p className="text-sm text-muted-foreground">
          El cliente se identifica por cédula: si ya existe se reutiliza su ficha y se
          actualizan sus datos de contacto.
        </p>
      </div>

      <FormularioNuevoEmpeno
        tasaDefecto={tasa}
        proximoNumero={numero}
        cliente={
          cliente
            ? {
                cedula: cliente.numeroDocumento,
                nombres: cliente.nombres,
                apellidos: cliente.apellidos,
                telefono: cliente.telefono,
              }
            : undefined
        }
      />
    </div>
  );
}
