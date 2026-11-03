import { Check } from "lucide-react";

import { BOTON_CONTORNO, BOTON_LLENO, CONTENEDOR, DISPLAY, PILDORA } from "./estilos";
import { StickerCheck } from "./stickers";

/**
 * Los dos planes que se venden (DEUDAS.md, DN1): Negociante (`basico`) es la
 * compra y venta completa; Empresa (`pro`) suma el módulo de empeños. Sin
 * límites artificiales. Los precios siguen sin definirse (D3), así que se
 * muestran «a convenir» en vez de inventar cifras.
 */
type Plan = {
  nombre: string;
  para: string;
  color: string;
  /** Lo que el plan trae además del anterior (o todo, si es el primero). */
  encabezadoLista: string;
  incluye: string[];
  destacado?: boolean;
};

const PLANES: Plan[] = [
  {
    nombre: "Negociante",
    para: "Para el local que compra y vende motos.",
    color: "bg-paper-white",
    encabezadoLista: "Incluye",
    incluye: [
      "Inventario de motos con ganancia por moto",
      "Ventas con recibo en PDF y devoluciones",
      "Gastos por moto y gastos generales",
      "Clientes con su historial de compras",
      "Panel con alertas y reporte mensual",
    ],
  },
  {
    nombre: "Empresa",
    para: "Para el negocio que además presta con empeño.",
    color: "bg-lavender",
    encabezadoLista: "Todo lo de Negociante, más",
    incluye: [
      "Empeños de motos, carros y teléfonos",
      "Abonos, renovaciones y contratos en PDF",
      "Alertas de vencimiento y avisos al cliente",
      "Alertas de SOAT",
      "Reportes de empeños",
    ],
    destacado: true,
  },
];

export function Planes() {
  return (
    <section id="planes" className="scroll-mt-24 bg-sky-wash py-16 sm:py-24">
      <div className={CONTENEDOR}>
        <h2 className={`${DISPLAY} text-[clamp(3.25rem,11vw,10rem)]`}>
          Planes
          <StickerCheck className="ml-[0.15em] inline-block w-[0.8em] rotate-[10deg] align-[-0.02em]" />
        </h2>
        <p className="mt-6 max-w-2xl font-ui text-[clamp(1.125rem,2vw,1.5rem)] leading-[1.25] font-medium tracking-[-0.01em]">
          Sin límites de motos ni de clientes. Elige según si tu negocio también presta con empeño.
        </p>

        <ul className="mt-12 grid max-w-5xl gap-5 md:grid-cols-2">
          {PLANES.map((plan) => (
            <li
              key={plan.nombre}
              className={`relative flex flex-col gap-5 rounded-tarjeta-xl border border-carbon p-7 ${plan.color}`}
            >
              {plan.destacado ? (
                <span className={`${PILDORA} absolute -top-4 right-6 rotate-3 bg-ember`}>Con empeños</span>
              ) : null}
              <div>
                <h3 className="font-display text-[clamp(2.25rem,3.6vw,3rem)] leading-[0.8] uppercase">
                  {plan.nombre}
                </h3>
                <p className="mt-3 font-ui text-[15px] font-medium">{plan.para}</p>
              </div>
              <p className="font-ui text-3xl leading-none font-bold tracking-[-0.01em]">A convenir</p>
              <div>
                <p className="font-ui text-sm font-bold">{plan.encabezadoLista}</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {plan.incluye.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 font-ui text-[15px] font-medium">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-carbon bg-paper-white">
                        <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <a href="#demo" className={`${plan.destacado ? BOTON_LLENO : BOTON_CONTORNO} mt-auto`}>
                Quiero el plan {plan.nombre}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
