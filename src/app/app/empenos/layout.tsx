import Link from "next/link";
import { redirect } from "next/navigation";

import { Boton } from "@/components/ui/boton";
import { tieneModulo } from "@/domain/negocio";
import { sesionDeDueno } from "@/server/auth/sesion";

/**
 * El módulo de empeños es del plan Empresa (DN1). Esta guarda cubre todas las
 * páginas de /app/empenos en el servidor; las acciones lo verifican aparte
 * (`tenantDeLaSesion("empenos")`), porque una Server Action no pasa por aquí.
 */
export default async function LayoutEmpenos({ children }: { children: React.ReactNode }) {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");

  if (!tieneModulo(sesion.plan, "empenos")) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-start gap-3 superficie p-6">
        <h1 className="text-lg font-semibold tracking-tight">Empeños no está en tu plan</h1>
        <p className="text-sm text-muted-foreground">
          El plan Negociante incluye todo compra y venta. El módulo de empeños (garantías, abonos, contratos y
          alertas de vencimiento) es del plan Empresa. Escríbele al administrador para cambiarlo.
        </p>
        <Boton asChild variant="outline">
          <Link href="/app">Volver al panel</Link>
        </Boton>
      </div>
    );
  }

  return children;
}
