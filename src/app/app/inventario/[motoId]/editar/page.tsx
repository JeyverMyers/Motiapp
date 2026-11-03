import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { FormularioMoto } from "@/components/app/formulario-moto";
import { idSchema } from "@/domain/comun";
import { hoyISO } from "@/lib/fechas";
import { formatearPlaca } from "@/lib/formato";
import { comoRuta } from "@/lib/rutas";
import { sesionDeDueno } from "@/server/auth/sesion";
import { obtenerMoto } from "@/server/repositorios/motos";

export const metadata = {
  title: "Editar moto",
  robots: { index: false, follow: false },
};

/**
 * Corrección de los datos de una moto. Corregir el precio de compra corrige la
 * ganancia en todas partes: no está guardada en ningún lado (regla 2).
 */
export default async function PaginaEditarMoto(props: { params: Promise<{ motoId: string }> }) {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");

  const { motoId } = await props.params;
  if (!idSchema.safeParse(motoId).success) notFound();

  const moto = await obtenerMoto(sesion.tenantId, motoId);
  if (!moto) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href={comoRuta(`/app/inventario/${moto.id}`)}
          className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Volver a la moto
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">
          Editar {moto.marca} {moto.modelo} · {formatearPlaca(moto.placa)}
        </h1>
        <p className="text-sm text-muted-foreground">
          El estado se cambia desde la ficha; la venta, con «Registrar la venta».
        </p>
      </div>
      <FormularioMoto moto={moto} hoy={hoyISO()} />
    </div>
  );
}
