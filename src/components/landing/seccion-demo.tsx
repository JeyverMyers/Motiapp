import { CONTENEDOR, DISPLAY } from "./estilos";
import { FormularioDemo } from "./formulario-demo";
import { StickerCalendario } from "./stickers";

/**
 * Solicitud de demo, en una tarjeta partida como la «QR card» del sistema: un
 * panel violeta con el titular y un panel blanco con el formulario.
 *
 * El formulario va sobre blanco a propósito: el rojo de los errores no da
 * contraste suficiente sobre el lila ni sobre el violeta (ver DEUDAS.md).
 */
export function SeccionDemo() {
  return (
    <section id="demo" className="scroll-mt-24 bg-paper-white py-16 sm:py-24">
      <div className={CONTENEDOR}>
        <div className="grid overflow-hidden rounded-tarjeta-xl border border-carbon lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative flex flex-col justify-between gap-8 bg-voltage-violet p-7 text-paper-white sm:p-10">
            <h2 className={`${DISPLAY} text-paper-white text-[clamp(3.25rem,9vw,7.5rem)]`}>
              Pide tu
              <br />
              demo
              <StickerCalendario className="ml-[0.15em] inline-block w-[0.8em] rotate-[10deg] align-[-0.05em]" />
            </h2>
            <p className="max-w-md font-ui text-[clamp(1.125rem,1.8vw,1.375rem)] leading-[1.3] font-medium">
              Cuéntanos de tu negocio y te mostramos el sistema funcionando con
              ejemplos de motos y empeños como los tuyos. Sin compromiso.
            </p>
          </div>
          <div className="border-t border-carbon bg-paper-white p-7 sm:p-10 lg:border-t-0 lg:border-l">
            <FormularioDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
