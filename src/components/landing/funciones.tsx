import type { ReactNode } from "react";
import { Bike, Calculator, CalendarClock, FileText, HandCoins, ShieldCheck } from "lucide-react";

import { CONTENEDOR, DISPLAY } from "./estilos";
import { StickerEtiqueta } from "./stickers";

type Funcion = {
  titulo: string;
  detalle: string;
  icono: ReactNode;
  /** Fondo y texto: cada combinación pasa contraste AA (ver DEUDAS.md). */
  color: string;
  /** Columnas en escritorio y giro: el collage no se alinea a una grilla rígida. */
  forma: string;
};

/**
 * Lo que hace el sistema, en tarjetas de sticker.
 *
 * Solo funciones que existen hoy en el producto: la landing no promete lo que
 * todavía no está construido.
 */
const FUNCIONES: Funcion[] = [
  {
    titulo: "Inventario de motos",
    detalle: "Placa, marca, modelo y estado. Cada moto sabe cuánto costó, en cuánto se vendió y qué gastos tuvo.",
    icono: <Bike />,
    color: "bg-mint-pop text-carbon",
    forma: "lg:col-span-5 lg:-rotate-1",
  },
  {
    titulo: "Empeños sin enredos",
    detalle: "Motos, carros y teléfonos. Abonos, renovaciones y liquidación en dos toques.",
    icono: <HandCoins />,
    color: "bg-lavender text-carbon",
    forma: "lg:col-span-4 lg:translate-y-6 lg:rotate-1",
  },
  {
    titulo: "Avisa antes de vencer",
    detalle: "Siete días antes de que venza un empeño lo ves en el panel, con el teléfono del cliente a un toque.",
    icono: <CalendarClock />,
    color: "bg-ember text-carbon",
    forma: "lg:col-span-3 lg:-rotate-2",
  },
  {
    titulo: "Interés por día",
    detalle: "El sistema causa el interés exacto a la fecha. Si el cliente abona a capital, el resto se calcula solo.",
    icono: <Calculator />,
    color: "bg-electric-blue text-carbon",
    forma: "lg:col-span-4 lg:rotate-1",
  },
  {
    titulo: "Contratos en PDF",
    detalle: "El contrato del empeño sale listo para imprimir y firmar, sin plantillas de Word.",
    icono: <FileText />,
    color: "bg-voltage-violet text-paper-white",
    forma: "lg:col-span-4 lg:-translate-y-4 lg:-rotate-1",
  },
  {
    titulo: "Tus datos son tuyos",
    detalle: "Cada negocio está aislado de los demás en la base de datos. Nadie más ve tu inventario.",
    icono: <ShieldCheck />,
    color: "bg-paper-white text-carbon",
    forma: "lg:col-span-4 lg:rotate-2",
  },
];

export function Funciones() {
  return (
    <section id="funciones" className="scroll-mt-24 bg-paper-white py-16 sm:py-24">
      <div className={CONTENEDOR}>
        <h2 className={`${DISPLAY} max-w-[12ch] text-[clamp(3.25rem,11vw,10rem)]`}>
          Todo en un lugar
          <StickerEtiqueta className="ml-[0.12em] inline-block w-[0.9em] rotate-[14deg] align-[-0.05em]" />
        </h2>
        <p className="mt-6 max-w-2xl font-ui text-[clamp(1.125rem,2vw,1.5rem)] leading-[1.25] font-medium tracking-[-0.01em]">
          Pensado para el mostrador: lo que hoy anotas en el cuaderno, con las cuentas
          ya hechas.
        </p>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
          {FUNCIONES.map((funcion) => (
            <li
              key={funcion.titulo}
              className={`flex flex-col gap-4 rounded-tarjeta-xl border border-carbon p-6 sm:p-7 ${funcion.color} ${funcion.forma}`}
            >
              <span className="flex size-12 items-center justify-center rounded-full border border-carbon bg-paper-white text-carbon [&_svg]:size-6">
                {funcion.icono}
              </span>
              <h3 className="font-ui text-2xl leading-[1.1] font-bold tracking-[-0.01em]">
                {funcion.titulo}
              </h3>
              <p className="font-ui text-[15px] leading-[1.45] font-medium">{funcion.detalle}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
