import Link from "next/link";

import { APP } from "@/lib/constantes";

import { BotonInstalarApp } from "./boton-instalar-app";
import { BOTON_LLENO } from "./estilos";

const SECCIONES = [
  { href: "#funciones", etiqueta: "Funciones" },
  { href: "#resultados", etiqueta: "Resultados" },
  { href: "#planes", etiqueta: "Planes" },
] as const;

/**
 * Navegación en píldora: logo a la izquierda, secciones al centro y la acción
 * principal a la derecha: «Descargar app» (PWA) y «Solicitar acceso», que baja
 * al formulario (DN8). Entrar al panel es el botón del hero. En el celular las
 * secciones se ocultan y quedan solo las dos acciones.
 */
export function Navegacion() {
  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-[1440px] items-center gap-2 rounded-full border border-carbon bg-paper-white p-1.5"
      >
        <Link
          href="/"
          aria-label={`${APP.nombre}, inicio`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-carbon bg-sunburst font-display text-xl text-carbon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon"
        >
          M
        </Link>
        <span className="hidden font-ui text-sm font-bold tracking-[0.03em] sm:inline">
          {APP.nombre}
        </span>

        <ul className="mx-auto hidden items-center gap-1 md:flex">
          {SECCIONES.map((seccion) => (
            <li key={seccion.href}>
              <a
                href={seccion.href}
                className="inline-flex h-11 items-center rounded-full border border-carbon px-4 font-ui text-[12px] font-bold uppercase tracking-[0.032em] transition-colors hover:bg-sky-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon"
              >
                {seccion.etiqueta}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <BotonInstalarApp />
          <a href="#demo" className={`${BOTON_LLENO} h-11 px-4 whitespace-nowrap`}>
            Solicitar acceso
          </a>
        </div>
      </nav>
    </header>
  );
}
