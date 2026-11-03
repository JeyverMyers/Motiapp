import { Bike } from "lucide-react";
import Link from "next/link";

import { EnlaceNavegacion } from "@/components/app/enlace-navegacion";
import { Boton } from "@/components/ui/boton";
import { APP } from "@/lib/constantes";
import { cerrarSesion } from "@/server/acciones/auth";

/**
 * Barra de navegación del panel.
 *
 * Server Component: el cierre de sesión es una Server Action dentro de un
 * `<form>`, así que funciona sin JavaScript en el cliente.
 */
const ENLACES = [
  { href: "/app", etiqueta: "Panel" },
  { href: "/app/inventario", etiqueta: "Inventario" },
  { href: "/app/ventas", etiqueta: "Ventas" },
  { href: "/app/empenos", etiqueta: "Empeños" },
  { href: "/app/gastos", etiqueta: "Gastos" },
  { href: "/app/clientes", etiqueta: "Clientes" },
] as const;

/**
 * `conEmpenos` sale del plan del negocio. Ocultar el enlace es solo
 * comodidad: la ruta y las acciones de empeños verifican el plan en el servidor.
 */
export function BarraNavegacion({
  nombreUsuario,
  conEmpenos = true,
}: {
  nombreUsuario: string;
  conEmpenos?: boolean;
}) {
  const enlaces = ENLACES.filter((enlace) => conEmpenos || enlace.href !== "/app/empenos");
  return (
    <header className="sticky top-0 z-20 border-b bg-card/85 backdrop-blur-md supports-[backdrop-filter]:bg-card/70">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2.5">
        <Link href="/app" className="flex shrink-0 items-center gap-2 font-semibold tracking-[-0.02em]">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[var(--sombra-boton)]">
            <Bike aria-hidden className="size-4" />
          </span>
          {APP.nombre}
        </Link>

        {/* En el celular la navegación scrollea en horizontal en vez de colapsar
            en un menú: un menú hamburguesa es más código y más taps. */}
        <nav className="-mx-1 flex flex-1 items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {enlaces.map((enlace) => (
            <EnlaceNavegacion key={enlace.href} href={enlace.href}>
              {enlace.etiqueta}
            </EnlaceNavegacion>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-sm text-muted-foreground lg:inline">
            {nombreUsuario}
          </span>
          <form action={cerrarSesion}>
            <Boton type="submit" variant="outline" size="sm">
              Salir
            </Boton>
          </form>
        </div>
      </div>
    </header>
  );
}
