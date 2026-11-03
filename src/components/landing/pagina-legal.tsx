import Link from "next/link";

import { APP } from "@/lib/constantes";

import { CONTENEDOR } from "./estilos";

/** Texto exacto exigido en DEUDAS.md (DN8): no se reformula. */
export const DESCARGO_LEGAL =
  "Motiapp es una herramienta de gestión. No sustituye la facturación electrónica, la contabilidad oficial ni las obligaciones tributarias del negocio. Cada usuario es responsable del cumplimiento de sus obligaciones legales.";

/**
 * Página legal de una sola hoja: modo lectura (ancho de 65 caracteres, buen
 * interlineado), con la identidad de la landing en el marco y el descargo
 * obligatorio destacado al final.
 */
export function PaginaLegal({
  titulo,
  actualizado,
  children,
}: {
  titulo: string;
  actualizado: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-sky-wash font-ui text-carbon">
      <header className={`${CONTENEDOR} flex items-center justify-between py-5`}>
        <Link href="/" className="flex items-center gap-3 font-bold tracking-[0.03em]">
          <span className="flex size-10 items-center justify-center rounded-full border border-carbon bg-sunburst font-display text-lg">
            M
          </span>
          {APP.nombre}
        </Link>
        <Link href="/" className="text-sm font-bold underline-offset-4 hover:underline">
          ← Volver al inicio
        </Link>
      </header>

      <main className={`${CONTENEDOR} pb-20`}>
        <article className="mx-auto max-w-[65ch] rounded-tarjeta-xl border border-carbon bg-paper-white px-6 py-10 sm:px-12">
          <h1 className="text-[clamp(2rem,5vw,3rem)] leading-[1.05] font-bold tracking-[-0.02em]">{titulo}</h1>
          <p className="mt-3 text-sm font-medium text-carbon/70">Última actualización: {actualizado}</p>
          <div className="mt-8 flex flex-col gap-5 text-[16px] leading-[1.65] font-medium [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-[-0.01em]">
            {children}
          </div>
          <aside
            aria-label="Aviso importante"
            className="mt-10 rounded-tarjeta border border-carbon bg-sunburst px-5 py-4 text-[15px] leading-[1.55] font-bold"
          >
            {DESCARGO_LEGAL}
          </aside>
          <p className="mt-8 text-sm font-medium">
            ¿Preguntas? Escríbenos a{" "}
            <a href={`mailto:${APP.emailSoporte}`} className="font-bold underline">
              {APP.emailSoporte}
            </a>
            .
          </p>
        </article>
      </main>
    </div>
  );
}
