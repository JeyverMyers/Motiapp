import Link from "next/link";

import { FormularioDatosNegocio } from "@/components/admin/formularios-negocio";

export const metadata = {
  title: "Nuevo negocio",
  robots: { index: false, follow: false },
};

export default function PaginaNuevoNegocio() {
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <Link href="/admin" className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline">
          ← Volver a negocios
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">Nuevo negocio</h1>
        <p className="text-sm text-muted-foreground">
          Después de crearlo, en su ficha le das acceso al dueño por su correo.
        </p>
      </div>
      <section className="superficie p-4 sm:p-6">
        <FormularioDatosNegocio />
      </section>
    </div>
  );
}
