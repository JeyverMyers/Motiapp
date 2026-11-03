import { redirect } from "next/navigation";

import { AvisoSoporte } from "@/components/app/aviso-soporte";
import { BarraNavegacion } from "@/components/app/barra-navegacion";
import { tieneModulo } from "@/domain/negocio";
import { sesionActual, sesionDeDueno } from "@/server/auth/sesion";
import { datosDelNegocio } from "@/server/repositorios/negocio";
import { soporteAbierto } from "@/server/repositorios/tenants";

/**
 * Todo el panel es dinámico: depende de la sesión y de datos que cambian a cada
 * rato. Ponerlo aquí, en el layout, lo heredan todas las páginas del segmento, y
 * así ninguna puede quedar prerenderizada por accidente —que es justo lo que
 * rompería el build al no haber variables de entorno y, peor, lo que serviría
 * datos de un negocio a otro desde la caché.
 */
export const dynamic = "force-dynamic";

/**
 * Layout del panel del dueño. Aquí vive el guard de acceso al área `/app`.
 *
 * El guard es del servidor y se ejecuta en cada petición: la protección no
 * depende del middleware ni de nada que corra en el navegador. Entran el dueño
 * de un negocio no suspendido y el super admin en modo soporte (solo lectura:
 * las acciones lo rechazan en `requerirDueno`).
 */
export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await sesionDeDueno();

  if (!sesion) {
    // Un super admin sin modo soporte va a su panel. Quien tiene sesión pero no
    // negocio, está desactivado o tiene el negocio suspendido va al login con el
    // motivo, en vez de rebotar sin explicación.
    const actual = await sesionActual();
    if (actual?.rol === "super_admin" && actual.activo) redirect("/admin");
    redirect(actual ? "/login?sin_acceso=1" : "/login");
  }

  const [negocio, soporte] = await Promise.all([
    sesion.impersonando ? datosDelNegocio(sesion.tenantId) : null,
    sesion.impersonando ? soporteAbierto(sesion.usuarioId) : null,
  ]);

  return (
    <div className="flex min-h-dvh flex-col bg-lienzo">
      {sesion.impersonando ? (
        <AvisoSoporte negocio={negocio?.nombre ?? "este negocio"} expiraEn={soporte?.expiraEn ?? null} />
      ) : null}
      <BarraNavegacion nombreUsuario={sesion.nombre} conEmpenos={tieneModulo(sesion.plan, "empenos")} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      <footer className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
        Sesión de {sesion.email}
      </footer>
    </div>
  );
}
