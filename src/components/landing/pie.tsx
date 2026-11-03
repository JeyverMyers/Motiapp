import Link from "next/link";

import { APP } from "@/lib/constantes";

import { CONTENEDOR } from "./estilos";

/** 44px de alto: se tocan con el pulgar aunque el texto sea pequeño. */
const ENLACE_PIE =
  "inline-flex h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper-white";

export function Pie() {
  return (
    <footer className="bg-carbon py-10 font-ui text-paper-white">
      <div className={`${CONTENEDOR} flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full border border-paper-white bg-sunburst font-display text-xl text-carbon">
            M
          </span>
          <div>
            <p className="text-sm font-bold tracking-[0.03em]">{APP.nombre}</p>
            <p className="text-[13px] font-medium">Hecho para negocios de motos en Colombia.</p>
          </div>
        </div>
        <nav aria-label="Pie de página" className="flex flex-wrap gap-x-5 text-[13px] font-bold uppercase tracking-[0.032em]">
          <Link href="/login" className={ENLACE_PIE}>
            Entrar al panel
          </Link>
          <a href="#demo" className={ENLACE_PIE}>
            Solicitar acceso
          </a>
          <Link href="/terminos" className={ENLACE_PIE}>
            Términos
          </Link>
          <Link href="/privacidad" className={ENLACE_PIE}>
            Privacidad
          </Link>
          <a href={`mailto:${APP.emailSoporte}`} className={ENLACE_PIE}>
            {APP.emailSoporte}
          </a>
        </nav>
      </div>
    </footer>
  );
}
