import Link from "next/link";
import { redirect } from "next/navigation";
import { Bike, HandCoins, PiggyBank, TrendingUp } from "lucide-react";

import { GraficaEmpenos } from "@/components/app/grafica-empenos";
import { GraficaVentas } from "@/components/app/grafica-ventas";
import { AlertasPanel } from "@/components/app/panel/alertas-panel";
import { TarjetaIndicador } from "@/components/app/tarjeta-indicador";
import { Boton } from "@/components/ui/boton";
import { Tabla, TablaCelda, TablaCuerpo, TablaFila } from "@/components/ui/tabla";
import { tieneModulo } from "@/domain/negocio";
import { esVentana, VENTANAS_DIAS, type VentanaDias } from "@/domain/panel";
import { formatearFecha, formatearMoneda, formatearPorcentaje } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { sesionDeDueno } from "@/server/auth/sesion";
import { resumenPanel } from "@/server/repositorios/panel";

export const metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

/**
 * Panel del dueño: primero lo urgente (alertas), luego los números del período
 * elegido (7, 30 o 90 días, en la URL) y sus gráficas.
 */
export default async function PaginaPanel(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");

  const parametros = await props.searchParams;
  const ventana: VentanaDias = esVentana(parametros.dias) ? (Number(parametros.dias) as VentanaDias) : 30;

  const resumen = await resumenPanel(sesion.tenantId, ventana);
  const { compraVenta, empeno } = resumen;
  // Plan Negociante: sin módulo de empeños, el panel no habla de empeños.
  const conEmpenos = tieneModulo(sesion.plan, "empenos");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em]">Panel</h1>
          <p className="text-sm text-muted-foreground">
            Del {formatearFecha(resumen.desde)} al {formatearFecha(resumen.hasta)}
          </p>
        </div>
        <SelectorVentana actual={ventana} />
      </div>

      {/* Lo que se hace a diario, a un toque (DN7). */}
      <nav aria-label="Accesos rápidos" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Boton asChild variant="exito">
          <Link href="/app/ventas/nueva">Vender una moto</Link>
        </Boton>
        <Boton asChild variant="outline">
          <Link href="/app/inventario/nueva">Registrar compra</Link>
        </Boton>
        {conEmpenos ? (
          <Boton asChild variant="outline">
            <Link href="/app/empenos/nuevo">Nuevo empeño</Link>
          </Boton>
        ) : null}
        <Boton asChild variant="outline">
          <Link href="/app/gastos">Registrar gasto</Link>
        </Boton>
      </nav>

      <AlertasPanel
        alertas={conEmpenos ? resumen.alertas : { ...resumen.alertas, vencidos: [], porVencer: [] }}
        totales={{
          vencidos: conEmpenos ? empeno.vencidos : 0,
          porVencer: conEmpenos ? empeno.porVencer : 0,
          estancadas: compraVenta.motosEstancadas,
          capitalEstancado: compraVenta.capitalEstancado,
        }}
      />

      <section aria-labelledby="titulo-compraventa" className="flex flex-col gap-4">
        <h2 id="titulo-compraventa" className="text-sm font-semibold">
          Compra y venta
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <TarjetaIndicador
            etiqueta="Vendido"
            valor={formatearMoneda(compraVenta.totalVendido)}
            detalle={`${compraVenta.unidadesVendidas} ${compraVenta.unidadesVendidas === 1 ? "moto" : "motos"}`}
            icono={<TrendingUp className="size-4" />}
          />
          <TarjetaIndicador
            etiqueta="Ganancia de ventas"
            valor={formatearMoneda(compraVenta.gananciaVentas)}
            detalle={`Margen ${formatearPorcentaje(compraVenta.margenPorcentaje)}`}
            tono={compraVenta.gananciaVentas >= 0 ? "exito" : "peligro"}
            icono={<PiggyBank className="size-4" />}
          />
          <TarjetaIndicador
            etiqueta="Resultado del período"
            valor={formatearMoneda(compraVenta.resultado)}
            detalle={`Gastos operativos ${formatearMoneda(compraVenta.gastosOperativos)}`}
            tono={compraVenta.resultado >= 0 ? "exito" : "peligro"}
          />
          <TarjetaIndicador
            etiqueta="En inventario"
            valor={String(compraVenta.motosEnInventario)}
            detalle={`Capital ${formatearMoneda(compraVenta.capitalInvertido)}`}
            icono={<Bike className="size-4" />}
          />
        </div>
        <div className="superficie p-4">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">Ventas y ganancia por día</h3>
            <Leyenda elementos={[{ color: "bg-info", texto: "Vendido" }, { color: "bg-exito", texto: "Ganancia bruta" }]} />
          </div>
          <GraficaVentas serie={resumen.serie} />
        </div>
      </section>

      {conEmpenos ? (
      <section aria-labelledby="titulo-empenos" className="flex flex-col gap-4">
        <h2 id="titulo-empenos" className="text-sm font-semibold">
          Empeños
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <TarjetaIndicador
            etiqueta="Activos"
            valor={String(empeno.activos)}
            detalle={`Capital en la calle ${formatearMoneda(empeno.capitalColocado)}`}
            icono={<HandCoins className="size-4" />}
          />
          <TarjetaIndicador
            etiqueta="Prestado en el período"
            valor={formatearMoneda(empeno.capitalPrestadoPeriodo)}
            detalle={`${empeno.empenosNuevos} nuevos · ${empeno.pagados} pagados`}
          />
          <TarjetaIndicador
            etiqueta="Intereses cobrados"
            valor={formatearMoneda(empeno.interesesCobrados)}
            tono="exito"
          />
          <TarjetaIndicador
            etiqueta="Vencidos"
            valor={String(empeno.vencidos)}
            detalle={empeno.vencidos > 0 ? "Requieren gestión" : "Al día"}
            tono={empeno.vencidos > 0 ? "peligro" : "neutro"}
          />
        </div>
        <div className="superficie p-4">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">Préstamos e intereses por día</h3>
            <Leyenda elementos={[{ color: "bg-info", texto: "Prestado" }, { color: "bg-exito", texto: "Intereses" }]} />
          </div>
          <GraficaEmpenos serie={resumen.serie} />
        </div>
      </section>
      ) : null}

      <section aria-labelledby="titulo-detalle" className="superficie">
        <h2 id="titulo-detalle" className="p-4 pb-2 text-sm font-semibold">
          Detalle del período
        </h2>
        <Tabla>
          <TablaCuerpo>
            <FilaDetalle etiqueta="Total vendido" valor={compraVenta.totalVendido} />
            <FilaDetalle etiqueta="Costo de las motos vendidas" valor={-compraVenta.costoDeVentas} />
            <FilaDetalle etiqueta="Gastos de las motos vendidas" valor={-compraVenta.gastosDeVentas} />
            <FilaDetalle etiqueta="Ganancia de ventas" valor={compraVenta.gananciaVentas} total />
            <FilaDetalle etiqueta="Gastos operativos de compra/venta" valor={-compraVenta.gastosOperativos} />
            <FilaDetalle etiqueta="Resultado de compra/venta" valor={compraVenta.resultado} total />
            {conEmpenos ? (
              <>
                <FilaDetalle etiqueta="Intereses de empeños" valor={empeno.interesesCobrados} />
                <FilaDetalle etiqueta="Gastos de empeños" valor={-empeno.gastos} />
                <FilaDetalle
                  etiqueta="Resultado de empeños"
                  valor={empeno.interesesCobrados - empeno.gastos}
                  total
                />
              </>
            ) : null}
          </TablaCuerpo>
        </Tabla>
      </section>
    </div>
  );
}

function FilaDetalle({ etiqueta, valor, total = false }: { etiqueta: string; valor: number; total?: boolean }) {
  return (
    <TablaFila className={total ? "bg-muted/40 hover:bg-muted/40" : undefined}>
      <TablaCelda className={total ? "font-semibold" : "text-muted-foreground"}>{etiqueta}</TablaCelda>
      <TablaCelda
        className={cn(
          "text-right tabular-nums",
          total && "font-semibold",
          total && (valor >= 0 ? "text-exito" : "text-destructive"),
        )}
      >
        {valor < 0 ? `- ${formatearMoneda(-valor)}` : formatearMoneda(valor)}
      </TablaCelda>
    </TablaFila>
  );
}

function Leyenda({ elementos }: { elementos: { color: string; texto: string }[] }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      {elementos.map((elemento) => (
        <span key={elemento.texto} className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", elemento.color)} /> {elemento.texto}
        </span>
      ))}
    </div>
  );
}

function SelectorVentana({ actual }: { actual: VentanaDias }) {
  return (
    <nav aria-label="Período" className="flex rounded-md border p-0.5">
      {VENTANAS_DIAS.map((dias) => (
        <Link
          key={dias}
          href={`/app?dias=${dias}`}
          aria-current={dias === actual ? "page" : undefined}
          className={cn(
            "rounded px-3 py-1.5 text-sm font-medium",
            dias === actual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
          )}
        >
          {dias} días
        </Link>
      ))}
    </nav>
  );
}
