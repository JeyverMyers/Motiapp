import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Paginacion } from "@/components/app/paginacion";
import { TarjetaIndicador } from "@/components/app/tarjeta-indicador";
import { Boton, variantesBoton } from "@/components/ui/boton";
import { Entrada, Selector } from "@/components/ui/formulario";
import {
  Tabla,
  TablaCelda,
  TablaCeldaEncabezado,
  TablaCuerpo,
  TablaEncabezado,
  TablaFila,
  TablaVacia,
} from "@/components/ui/tabla";
import { ETIQUETA_METODO_PAGO, METODOS_PAGO } from "@/domain/enums";
import { gananciaDeMoto } from "@/domain/moto";
import {
  ETIQUETA_PERIODO_VENTA,
  PERIODOS_VENTA,
  filtrosVentasSchema,
  rangoDePeriodo,
  resumenVentas,
} from "@/domain/venta";
import { hoyISO } from "@/lib/fechas";
import { formatearFecha, formatearMoneda, formatearPlaca } from "@/lib/formato";
import { comoRuta } from "@/lib/rutas";
import { cn } from "@/lib/utils";
import { sesionDeDueno } from "@/server/auth/sesion";
import { listarVentas } from "@/server/repositorios/ventas";

export const metadata = {
  title: "Ventas",
  robots: { index: false, follow: false },
};

const periodoSchema = z.enum([...PERIODOS_VENTA, "todo"]).catch("mes");

/**
 * Historial de ventas y reporte de ganancias.
 *
 * El período es un atajo que se traduce a `desde`/`hasta`; si la URL trae
 * fechas propias, mandan ellas. Por defecto se ve el mes en curso: es la
 * pregunta que el dueño se hace todos los días («¿cómo vamos este mes?»).
 */
export default async function PaginaVentas(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");

  const parametros = await props.searchParams;
  const hoy = hoyISO();
  const filtrosUrl = filtrosVentasSchema.safeParse(parametros).data ?? filtrosVentasSchema.parse({});
  const fechasPropias = Boolean(filtrosUrl.desde || filtrosUrl.hasta);
  const periodo = fechasPropias ? null : periodoSchema.parse(parametros.periodo);
  const filtros =
    periodo && periodo !== "todo" ? { ...filtrosUrl, ...rangoDePeriodo(periodo, hoy) } : filtrosUrl;

  const { filas, total, totales, porMes } = await listarVentas(sesion.tenantId, filtros);
  const resumen = resumenVentas(totales);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em]">Ventas</h1>
          <p className="text-sm text-muted-foreground">
            {filtros.desde || filtros.hasta
              ? `Del ${filtros.desde ? formatearFecha(filtros.desde) : "inicio"} al ${formatearFecha(filtros.hasta ?? hoy)}`
              : "Todas las ventas registradas"}
          </p>
        </div>
        <Boton asChild variant="exito">
          <Link href="/app/ventas/nueva">Registrar venta</Link>
        </Boton>
      </div>

      <nav aria-label="Período" className="flex flex-wrap gap-2">
        {[...PERIODOS_VENTA, "todo" as const].map((opcion) => (
          <Link
            key={opcion}
            href={comoRuta(`/app/ventas?periodo=${opcion}`)}
            aria-current={periodo === opcion ? "page" : undefined}
            className={cn(
              variantesBoton({ variant: periodo === opcion ? "default" : "outline", size: "sm" }),
              "rounded-full",
            )}
          >
            {opcion === "todo" ? "Todo" : ETIQUETA_PERIODO_VENTA[opcion]}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <TarjetaIndicador etiqueta="Motos vendidas" valor={String(resumen.unidades)} />
        <TarjetaIndicador etiqueta="Total vendido" valor={formatearMoneda(resumen.totalVendido)} />
        <TarjetaIndicador
          etiqueta="Costo y gastos"
          valor={formatearMoneda(resumen.costoDeVentas + resumen.gastos)}
          detalle={`Compra ${formatearMoneda(resumen.costoDeVentas)} · gastos ${formatearMoneda(resumen.gastos)}`}
        />
        <TarjetaIndicador
          etiqueta="Ganancia"
          valor={formatearMoneda(resumen.gananciaNeta)}
          detalle={`Margen ${resumen.margenPorcentaje.toFixed(1)} %`}
          tono={resumen.gananciaNeta >= 0 ? "exito" : "peligro"}
        />
      </div>

      {porMes.length > 1 ? (
        <section aria-labelledby="titulo-por-mes" className="flex flex-col gap-2">
          <h2 id="titulo-por-mes" className="text-sm font-semibold">
            Ganancia por mes
          </h2>
          <div className="overflow-x-auto superficie">
            <Tabla>
              <TablaEncabezado>
                <TablaFila>
                  <TablaCeldaEncabezado>Mes</TablaCeldaEncabezado>
                  <TablaCeldaEncabezado className="text-right">Motos</TablaCeldaEncabezado>
                  <TablaCeldaEncabezado className="text-right">Vendido</TablaCeldaEncabezado>
                  <TablaCeldaEncabezado className="text-right">Costo + gastos</TablaCeldaEncabezado>
                  <TablaCeldaEncabezado className="text-right">Ganancia</TablaCeldaEncabezado>
                  <TablaCeldaEncabezado className="text-right">Margen</TablaCeldaEncabezado>
                </TablaFila>
              </TablaEncabezado>
              <TablaCuerpo>
                {porMes.map((fila) => {
                  const mes = resumenVentas(fila);
                  return (
                    <TablaFila key={fila.mes}>
                      <TablaCelda className="capitalize">{nombreDelMes(fila.mes)}</TablaCelda>
                      <TablaCelda className="text-right tabular-nums">{mes.unidades}</TablaCelda>
                      <TablaCelda className="text-right tabular-nums">{formatearMoneda(mes.totalVendido)}</TablaCelda>
                      <TablaCelda className="text-right tabular-nums">
                        {formatearMoneda(mes.costoDeVentas + mes.gastos)}
                      </TablaCelda>
                      <TablaCelda
                        className={cn(
                          "text-right font-semibold tabular-nums",
                          mes.gananciaNeta >= 0 ? "text-exito" : "text-destructive",
                        )}
                      >
                        {formatearMoneda(mes.gananciaNeta)}
                      </TablaCelda>
                      <TablaCelda className="text-right tabular-nums">{mes.margenPorcentaje.toFixed(1)} %</TablaCelda>
                    </TablaFila>
                  );
                })}
              </TablaCuerpo>
            </Tabla>
          </div>
        </section>
      ) : null}

      <form className="grid gap-3 superficie p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <Filtro etiqueta="Buscar" htmlFor="texto">
          <Entrada
            id="texto"
            name="texto"
            defaultValue={filtros.texto ?? ""}
            placeholder="Placa, marca, modelo, comprador o cédula"
          />
        </Filtro>
        <Filtro etiqueta="Forma de pago" htmlFor="metodoPago">
          <Selector id="metodoPago" name="metodoPago" defaultValue={filtros.metodoPago ?? ""}>
            <option value="">Todas</option>
            {METODOS_PAGO.map((metodo) => (
              <option key={metodo} value={metodo}>
                {ETIQUETA_METODO_PAGO[metodo]}
              </option>
            ))}
          </Selector>
        </Filtro>
        <Filtro etiqueta="Vendida desde" htmlFor="desde">
          <Entrada id="desde" name="desde" type="date" max={hoy} defaultValue={filtros.desde ?? ""} />
        </Filtro>
        <Filtro etiqueta="Hasta" htmlFor="hasta">
          <Entrada id="hasta" name="hasta" type="date" max={hoy} defaultValue={filtros.hasta ?? ""} />
        </Filtro>
        <div className="flex items-end">
          <Boton type="submit" className="w-full">
            Buscar
          </Boton>
        </div>
      </form>

      <div className="overflow-x-auto superficie">
        <Tabla>
          <TablaEncabezado>
            <TablaFila>
              <TablaCeldaEncabezado>Fecha</TablaCeldaEncabezado>
              <TablaCeldaEncabezado>Moto</TablaCeldaEncabezado>
              <TablaCeldaEncabezado>Comprador</TablaCeldaEncabezado>
              <TablaCeldaEncabezado>Pago</TablaCeldaEncabezado>
              <TablaCeldaEncabezado className="text-right">Precio</TablaCeldaEncabezado>
              <TablaCeldaEncabezado className="text-right">Ganancia</TablaCeldaEncabezado>
            </TablaFila>
          </TablaEncabezado>
          <TablaCuerpo>
            {filas.length === 0 ? (
              <TablaVacia columnas={6} mensaje="No hay ventas en este período." />
            ) : (
              filas.map((venta) => {
                const ganancia =
                  gananciaDeMoto(
                    { precioCompra: venta.precioCompra, precioVenta: venta.precioPactado },
                    venta.gastosAsociados,
                  ) ?? 0;
                return (
                  <TablaFila key={venta.ventaId}>
                    <TablaCelda className="whitespace-nowrap">{formatearFecha(venta.fecha)}</TablaCelda>
                    <TablaCelda>
                      <Link
                        href={comoRuta(`/app/inventario/${venta.motoId}`)}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {venta.marca} {venta.modelo} {venta.anio}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{formatearPlaca(venta.placa)}</span>
                    </TablaCelda>
                    <TablaCelda>
                      {venta.compradorNombre}
                      <span className="block text-xs text-muted-foreground">C.C. {venta.compradorCedula}</span>
                    </TablaCelda>
                    <TablaCelda>{ETIQUETA_METODO_PAGO[venta.metodoPago]}</TablaCelda>
                    <TablaCelda className="text-right tabular-nums">
                      {formatearMoneda(venta.precioPactado)}
                      {venta.descuentoAplicado > 0 ? (
                        <span className="block text-xs text-muted-foreground">
                          −{formatearMoneda(venta.descuentoAplicado)} de descuento
                        </span>
                      ) : null}
                    </TablaCelda>
                    <TablaCelda
                      className={cn(
                        "text-right font-semibold tabular-nums",
                        ganancia >= 0 ? "text-exito" : "text-destructive",
                      )}
                    >
                      {formatearMoneda(ganancia)}
                    </TablaCelda>
                  </TablaFila>
                );
              })
            )}
          </TablaCuerpo>
        </Tabla>
      </div>

      <p className="text-xs text-muted-foreground">
        {total} ventas. La ganancia de cada venta descuenta lo que costó la moto y los gastos registrados en su
        ficha.
      </p>
      <Paginacion
        base="/app/ventas"
        pagina={filtros.pagina}
        totalPaginas={Math.max(1, Math.ceil(total / filtros.porPagina))}
        parametros={parametros}
      />
    </div>
  );
}

/** «2026-10» → «octubre de 2026». */
function nombreDelMes(mes: string): string {
  return new Date(`${mes}-01T00:00:00Z`).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Filtro({ etiqueta, htmlFor, children }: { etiqueta: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
