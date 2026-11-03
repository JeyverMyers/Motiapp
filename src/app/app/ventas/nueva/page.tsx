import Link from "next/link";
import { redirect } from "next/navigation";

import { FormularioVenta } from "@/components/app/formulario-venta";
import { Boton } from "@/components/ui/boton";
import { nombreCompletoCliente } from "@/domain/cliente";
import { idSchema } from "@/domain/comun";
import { hoyISO } from "@/lib/fechas";
import { sesionDeDueno } from "@/server/auth/sesion";
import { obtenerCliente } from "@/server/repositorios/clientes";
import { motosVendibles } from "@/server/repositorios/ventas";

export const metadata = {
  title: "Registrar venta",
  robots: { index: false, follow: false },
};

export default async function PaginaNuevaVenta(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");

  // Desde la ficha de un cliente llega `?clienteId=`: el comprador ya viene puesto.
  const { clienteId } = await props.searchParams;
  const idCliente = idSchema.safeParse(clienteId).data;
  const [motos, cliente] = await Promise.all([
    motosVendibles(sesion.tenantId),
    idCliente ? obtenerCliente(sesion.tenantId, idCliente) : null,
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <Link
          href="/app/ventas"
          className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Volver a ventas
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">Registrar venta</h1>
        <p className="text-sm text-muted-foreground">
          Al confirmar, la moto pasa a «Vendida», el comprador queda en Clientes y puedes descargar el recibo.
        </p>
      </div>

      {motos.length === 0 ? (
        <div className="flex flex-col items-start gap-3 superficie p-6">
          <p className="text-sm">No tienes motos disponibles para vender.</p>
          <Boton asChild variant="outline">
            <Link href="/app/inventario/nueva">Registrar una compra</Link>
          </Boton>
        </div>
      ) : (
        <section className="superficie p-4 sm:p-6">
          <FormularioVenta
            motos={motos}
            hoy={hoyISO()}
            comprador={
              cliente
                ? { nombre: nombreCompletoCliente(cliente), cedula: cliente.numeroDocumento, telefono: cliente.telefono }
                : undefined
            }
          />
        </section>
      )}
    </div>
  );
}
