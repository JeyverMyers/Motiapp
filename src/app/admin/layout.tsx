import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { EscudoMotiapp } from "@/components/marca/escudo";
import { Boton } from "@/components/ui/boton";
import { APP } from "@/lib/constantes";
import { sesionActual } from "@/server/auth/sesion";
import { cerrarSesion } from "@/server/acciones/auth";

export const metadata = {
  title: "Super administración",
  robots: { index: false, follow: false },
};

/** Todo el panel de administración es dinámico; ver la nota en `/app/layout.tsx`. */
export const dynamic = "force-dynamic";

/**
 * Layout del panel de super administración.
 *
 * El guard vive aquí y es del servidor: si el rol no es `super_admin`, no se
 * renderiza nada de este árbol. El proxy solo evitó llegar hasta aquí sin sesión.
 */
export default async function LayoutAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await sesionActual();

  if (!sesion) redirect("/login");
  if (sesion.rol !== "super_admin") redirect("/app");

  return (
    <div className="texto-legible flex min-h-dvh flex-col bg-lienzo">
      <header className="no-imprimir sticky top-0 z-20 border-b bg-card/85 backdrop-blur-md supports-[backdrop-filter]:bg-card/70">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2">
          <Link href="/admin" className="flex shrink-0 items-center gap-2 text-[1.0625rem] font-bold tracking-[-0.01em]">
            <EscudoMotiapp className="h-8 w-auto" />
            {APP.nombre} <span className="font-semibold text-muted-foreground">admin</span>
          </Link>

          <nav className="-mx-1 flex flex-1 items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <EnlaceAdmin href="/admin">Negocios</EnlaceAdmin>
            <EnlaceAdmin href="/admin/solicitudes">Solicitudes</EnlaceAdmin>
            <EnlaceAdmin href="/admin/auditoria">Auditoría</EnlaceAdmin>
            <EnlaceAdmin href="/admin/ayuda">Ayuda</EnlaceAdmin>
          </nav>

          <form action={cerrarSesion} className="shrink-0">
            <Boton type="submit" variant="outline" size="sm">
              Salir
            </Boton>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}

/**
 * `href` se tipa como `Route` y no como `string`: con `typedRoutes` activado,
 * un `string` suelto no compila y un literal mal escrito sí se detecta.
 */
function EnlaceAdmin({ href, children }: { href: Route; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {children}
    </Link>
  );
}
