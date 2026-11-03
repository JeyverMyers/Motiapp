import Link from "next/link";
import { AlertTriangle, CalendarClock, Clock } from "lucide-react";

import { EtiquetaEstado } from "@/components/ui/etiqueta-estado";
import { DIAS_GRACIA_VENCIMIENTO } from "@/domain/empeno";
import { DIAS_STOCK_ESTANCADO } from "@/domain/panel";
import { formatearMoneda, formatearPlaca } from "@/lib/formato";
import { comoRuta } from "@/lib/rutas";
import { cn } from "@/lib/utils";
import type { ResumenPanel } from "@/server/repositorios/panel";

/**
 * Lo que el dueño tiene que atender hoy: empeños vencidos, empeños por vencer
 * y motos que llevan más de 60 días sin venderse. Cada tarjeta muestra lo más
 * urgente primero; el total va en el encabezado.
 */
export function AlertasPanel({
  alertas,
  totales,
}: {
  alertas: ResumenPanel["alertas"];
  totales: { vencidos: number; porVencer: number; estancadas: number; capitalEstancado: number };
}) {
  if (totales.vencidos + totales.porVencer + totales.estancadas === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-4 text-sm text-muted-foreground">
        Nada urgente: no hay empeños vencidos ni por vencer, y ninguna moto lleva más de {DIAS_STOCK_ESTANCADO} días
        en inventario.
      </p>
    );
  }

  return (
    <section aria-label="Alertas" className="grid gap-4 lg:grid-cols-3">
      <Tarjeta
        tono="peligro"
        icono={<AlertTriangle className="size-4" />}
        titulo={`${totales.vencidos} ${totales.vencidos === 1 ? "empeño vencido" : "empeños vencidos"}`}
        vacio="Ningún empeño vencido."
        total={totales.vencidos}
        mostrados={alertas.vencidos.length}
      >
        {alertas.vencidos.map((alerta) => (
          <Fila
            key={alerta.empenoId}
            href={comoRuta(`/app/empenos/${alerta.empenoId}`)}
            titulo={alerta.numero}
            detalle={alerta.clienteNombre}
            valor={formatearMoneda(alerta.capital)}
            telefono={alerta.clienteTelefono}
            etiqueta={
              <EtiquetaEstado variant={alerta.enGracia ? "alerta" : "peligro"}>
                {alerta.enGracia
                  ? `${alerta.diasAtraso} ${alerta.diasAtraso === 1 ? "día" : "días"} de atraso`
                  : `${alerta.diasAtraso} días · fuera de gracia`}
              </EtiquetaEstado>
            }
          />
        ))}
        <p className="pt-2 text-xs text-muted-foreground">
          Pasados {DIAS_GRACIA_VENCIMIENTO} días de gracia, el bien puede declararse perdido desde la ficha.
        </p>
      </Tarjeta>

      <Tarjeta
        tono="alerta"
        icono={<CalendarClock className="size-4" />}
        titulo={`${totales.porVencer} por vencer esta semana`}
        vacio="Ninguno vence en los próximos 7 días."
        total={totales.porVencer}
        mostrados={alertas.porVencer.length}
      >
        {alertas.porVencer.map((alerta) => (
          <Fila
            key={alerta.empenoId}
            href={comoRuta(`/app/empenos/${alerta.empenoId}`)}
            titulo={alerta.numero}
            detalle={alerta.clienteNombre}
            valor={formatearMoneda(alerta.capital)}
            telefono={alerta.clienteTelefono}
            etiqueta={
              <EtiquetaEstado variant={alerta.diasRestantes <= 2 ? "peligro" : "alerta"}>
                {alerta.diasRestantes === 0
                  ? "vence hoy"
                  : `en ${alerta.diasRestantes} ${alerta.diasRestantes === 1 ? "día" : "días"}`}
              </EtiquetaEstado>
            }
          />
        ))}
      </Tarjeta>

      <Tarjeta
        tono="info"
        icono={<Clock className="size-4" />}
        titulo={`${totales.estancadas} ${totales.estancadas === 1 ? "moto" : "motos"} con +${DIAS_STOCK_ESTANCADO} días`}
        subtitulo={totales.estancadas ? `${formatearMoneda(totales.capitalEstancado)} quietos` : undefined}
        vacio={`Ninguna moto pasa de ${DIAS_STOCK_ESTANCADO} días en inventario.`}
        total={totales.estancadas}
        mostrados={alertas.stockEstancado.length}
      >
        {alertas.stockEstancado.map((moto) => (
          <Fila
            key={moto.motoId}
            href={comoRuta(`/app/inventario/${moto.motoId}`)}
            titulo={`${moto.marca} ${moto.modelo} ${moto.anio}`}
            detalle={formatearPlaca(moto.placa)}
            valor={formatearMoneda(moto.precioCompra)}
            etiqueta={<EtiquetaEstado variant="neutro">{moto.diasEnInventario} días</EtiquetaEstado>}
          />
        ))}
      </Tarjeta>
    </section>
  );
}

const BORDE = {
  peligro: "border-destructive/40",
  alerta: "border-alerta/50",
  info: "border-info/40",
} as const;

const ICONO = {
  peligro: "text-destructive",
  alerta: "text-alerta",
  info: "text-info",
} as const;

function Tarjeta({
  tono,
  icono,
  titulo,
  subtitulo,
  vacio,
  total,
  mostrados,
  children,
}: {
  tono: keyof typeof BORDE;
  icono: React.ReactNode;
  titulo: string;
  subtitulo?: string;
  vacio: string;
  total: number;
  mostrados: number;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col superficie p-4", total > 0 && BORDE[tono])}>
      <div className="flex items-center gap-2">
        <span className={cn(total > 0 ? ICONO[tono] : "text-muted-foreground")}>{icono}</span>
        <h2 className="text-sm font-semibold">{titulo}</h2>
      </div>
      {subtitulo ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitulo}</p> : null}
      {total === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{vacio}</p>
      ) : (
        <ul className="mt-3 flex max-h-80 flex-col divide-y overflow-y-auto">{children}</ul>
      )}
      {total > mostrados ? (
        <p className="pt-2 text-xs text-muted-foreground">Se muestran los {mostrados} más urgentes.</p>
      ) : null}
    </div>
  );
}

function Fila({
  href,
  titulo,
  detalle,
  valor,
  etiqueta,
  telefono,
}: {
  href: ReturnType<typeof comoRuta>;
  titulo: string;
  detalle: string;
  valor: string;
  etiqueta: React.ReactNode;
  telefono?: string | null;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <Link href={href} className="font-medium underline-offset-4 hover:underline">
          {titulo}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{detalle}</p>
      </div>
      {etiqueta}
      <span className="tabular-nums">{valor}</span>
      {telefono ? (
        <a href={`tel:${telefono}`} className="text-xs font-medium underline">
          Llamar
        </a>
      ) : null}
    </li>
  );
}
