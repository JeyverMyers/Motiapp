import { CONTENEDOR, DISPLAY, PILDORA } from "./estilos";
import { GraficaResultados } from "./grafica-resultados";
import { StickerMoneda } from "./stickers";

/**
 * Banda gris con la gráfica de ejemplo. La sección es servidor; solo la gráfica
 * es cliente, porque necesita medir el contenedor y saber si está en pantalla.
 */
export function Resultados() {
  return (
    <section id="resultados" className="scroll-mt-24 overflow-hidden bg-concrete-gray py-16 sm:py-24">
      <div className={`${CONTENEDOR} grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center`}>
        <div className="relative">
          <h2 className={`${DISPLAY} text-[clamp(3.25rem,10vw,9rem)]`}>
            Ganancia
            <br />
            clara
            {/* Dentro del titular y medido en `em`: escala con el texto y nunca
                cae encima de una letra ni del párrafo, a ningún ancho. */}
            <StickerMoneda className="ml-[0.12em] inline-block w-[0.85em] -rotate-12 align-[-0.05em]" />
          </h2>
          <p className="mt-6 max-w-xl font-ui text-[clamp(1.125rem,2vw,1.5rem)] leading-[1.25] font-medium tracking-[-0.01em]">
            Cada venta resta lo que costó la moto y lo que le gastaste. Cada empeño
            causa su interés por día. El panel te lo muestra en los últimos 7, 30 o
            90 días.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            <li className={PILDORA}>Venta − compra − gastos</li>
            <li className={PILDORA}>Interés causado por día</li>
            <li className={PILDORA}>Capital en la calle</li>
          </ul>
        </div>

        <figure className="rounded-tarjeta-xl border border-carbon bg-paper-white p-5 sm:p-7">
          <figcaption className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <span className="font-ui text-lg font-bold tracking-[-0.01em]">Ganancia por mes</span>
            <span className={`${PILDORA} bg-lavender`}>Ejemplo ilustrativo</span>
          </figcaption>
          <GraficaResultados />
        </figure>
      </div>
    </section>
  );
}
