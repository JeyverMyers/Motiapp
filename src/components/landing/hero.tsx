import Link from "next/link";

import { APP } from "@/lib/constantes";

import { Cinta } from "./cinta";
import { BOTON_LLENO, CONTENEDOR, DISPLAY, PILDORA } from "./estilos";
import { MotoRodando } from "./moto-rodando";
import {
  StickerBilletera,
  StickerCalendario,
  StickerCheck,
  StickerMoneda,
} from "./stickers";

/**
 * Hero: el nombre como objeto escultural, la cinta azul por detrás, stickers
 * pegados alrededor y la moto rodando por el borde inferior del titular.
 *
 * El titular escala con el ancho de la pantalla (`clamp`): en el celular mide
 * unos 80px y en escritorio llega a 352px, siempre con interlineado 0.8.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-sky-wash pt-10 pb-16 sm:pt-16 sm:pb-24">
      <div className={`${CONTENEDOR} relative`}>
        <p className={PILDORA}>
          <span className="size-2 rounded-full border border-carbon bg-mint-pop" aria-hidden="true" />
          Compra, venta y empeño de motos
        </p>

        <div className="relative mt-6">
          {/* La cinta se ancla al bloque del titular (de lado a lado de la
              pantalla) para que nunca cruce por detrás del párrafo. */}
          <Cinta className="pointer-events-none absolute top-[8%] left-1/2 h-[78%] w-screen -translate-x-1/2" />
          <h1 className={`${DISPLAY} relative z-10 text-[clamp(5rem,24vw,22rem)]`}>
            <span className="block">Moti</span>
            <span className="block pl-[0.55em]">app</span>
            <span className="sr-only"> — software para negocios de motos y empeño</span>
          </h1>

          {/* Stickers pegados como recortes: torcidos, superpuestos al titular. */}
          <StickerMoneda className="absolute top-[4%] right-[2%] z-20 w-[18vw] max-w-40 min-w-16 rotate-12" />
          <StickerCalendario className="absolute top-[46%] right-[18%] z-20 hidden w-[12vw] max-w-32 -rotate-[9deg] sm:block" />
          <StickerCheck className="absolute bottom-[8%] left-[1%] z-20 w-[13vw] max-w-28 min-w-14 -rotate-[14deg]" />
          <StickerBilletera className="absolute top-[2%] left-[42%] z-0 hidden w-[10vw] max-w-28 rotate-[8deg] lg:block" />

          <div className="relative z-10 -mt-2">
            <MotoRodando />
          </div>
        </div>

        <div className="relative z-10 mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <p className="max-w-3xl font-ui text-[clamp(1.375rem,3.2vw,2.5rem)] leading-[1.15] font-medium tracking-[-0.01em] text-carbon">
            Inventario, empeños, clientes y gastos de tu negocio de motos. Sin
            cuadernos, sin Excel, desde el celular.
          </p>
          {/* Una sola acción en el hero (DN8): quien ya es cliente entra; quien no,
              tiene «Solicitar acceso» arriba y el formulario al final. */}
          <div className="flex lg:justify-end">
            <Link href="/login" className={`${BOTON_LLENO} h-14 px-8 text-base`}>
              Entrar al panel
            </Link>
          </div>
        </div>

        <p className="sr-only">{APP.descripcion}</p>
      </div>
    </section>
  );
}
