import Link from "next/link";
import { redirect } from "next/navigation";

import { Paginacion } from "@/components/app/paginacion";
import { EtiquetaEstadoEmpeno, resumenCortoBien } from "@/components/app/empenos/presentacion";
import { TarjetaIndicador } from "@/components/app/tarjeta-indicador";
import { Boton } from "@/components/ui/boton";
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
import {
  diasParaVencer,
  estadoSegunFechas,
  filtrosEmpenoSchema,
  saldoConAbonos,
} from "@/domain/empeno";
import {
  ESTADOS_EMPENO,
  ETIQUETA_ESTADO_EMPENO,
  ETIQUETA_TIPO_BIEN,
  TIPOS_BIEN,
  type EstadoEmpeno,
  type TipoBien,
} from "@/domain/enums";
import { hoyComoFecha, hoyISO } from "@/lib/fechas";
import { formatearDiasRelativos, formatearFecha, formatearMoneda } from "@/lib/formato";
import { comoRuta } from "@/lib/rutas";
import { sesionDeDueno } from "@/server/auth/sesion";
import { listarEmpenos, resumenEmpenos, type EmpenoListado } from "@/server/repositorios/empenos";

export const metadata = {
  title: "Empeños",
  robots: { index: false, follow: false },
};

/** `renovado` existe en el esquema pero nunca se escribe: renovar extiende el mismo empeño. */
const ESTADOS_FILTRABLES = ESTADOS_EMPENO.filter((estado) => estado !== "renovado");

/**
 * Listado de empeños.
 *
 * El estado que se muestra no es siempre el guardado: un empeño `activo` que ya
 * pasó su fecha aparece como «vencido» o «por vencer» usando `estadoSegunFechas`.
 * Así la alerta y la realidad no se separan nunca. Los filtros viven en la URL:
 * se pueden compartir y sobreviven al botón «atrás».
 */
export default async function PaginaEmpenos(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");

  const parametros = await props.searchParams;
  // Un parámetro inválido en la URL no debe tumbar la página: se ignoran todos.
  const filtros = filtrosEmpenoSchema.safeParse(parametros).data ?? filtrosEmpenoSchema.parse({});

  const [{ filas, total }, resumen] = await Promise.all([
    listarEmpenos(sesion.tenantId, filtros),
    resumenEmpenos(sesion.tenantId),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(total / filtros.porPagina));
  const hoy = hoyISO();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em]">Empeños</h1>
          <p className="text-sm text-muted-foreground">
            Módulo aparte del inventario: aquí no se mezclan motos de compra/venta.
          </p>
        </div>
        <Boton asChild>
          <Link href="/app/empenos/nuevo">Registrar empeño</Link>
        </Boton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TarjetaIndicador
          etiqueta="Activos"
          valor={String(resumen.activos)}
          detalle={`Capital en la calle ${formatearMoneda(resumen.capitalColocado)}`}
        />
        <EnlaceIndicador href="/app/empenos?soloPorVencer=true">
          <TarjetaIndicador
            etiqueta="Por vencer (7 días)"
            valor={String(resumen.porVencer)}
            tono={resumen.porVencer > 0 ? "peligro" : "neutro"}
            detalle="Requieren llamada"
          />
        </EnlaceIndicador>
        <EnlaceIndicador href="/app/empenos?estado=vencido">
          <TarjetaIndicador
            etiqueta="Vencidos sin pagar"
            valor={String(resumen.vencidos)}
            tono={resumen.vencidos > 0 ? "peligro" : "neutro"}
            detalle="Renovar, cobrar o quedarse con el bien"
          />
        </EnlaceIndicador>
        <TarjetaIndicador
          etiqueta="Cerrados"
          valor={String(resumen.pagados + resumen.perdidos)}
          detalle={`${resumen.pagados} pagados · ${resumen.perdidos} perdidos`}
        />
      </div>

      <form className="grid gap-3 superficie p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
        <Filtro etiqueta="Buscar" htmlFor="texto">
          <Entrada
            id="texto"
            name="texto"
            defaultValue={filtros.texto ?? ""}
            placeholder="Número, cliente, cédula, teléfono, placa o IMEI"
          />
        </Filtro>
        <Filtro etiqueta="Estado" htmlFor="estado">
          <Selector id="estado" name="estado" defaultValue={filtros.estado ?? ""}>
            <option value="">Todos</option>
            {ESTADOS_FILTRABLES.map((estado) => (
              <option key={estado} value={estado}>
                {ETIQUETA_ESTADO_EMPENO[estado]}
              </option>
            ))}
          </Selector>
        </Filtro>
        <Filtro etiqueta="Bien" htmlFor="tipoBien">
          <Selector id="tipoBien" name="tipoBien" defaultValue={filtros.tipoBien ?? ""}>
            <option value="">Todos</option>
            {TIPOS_BIEN.map((tipo) => (
              <option key={tipo} value={tipo}>
                {ETIQUETA_TIPO_BIEN[tipo]}
              </option>
            ))}
          </Selector>
        </Filtro>
        <Filtro etiqueta="Desde" htmlFor="desde">
          <Entrada id="desde" name="desde" type="date" defaultValue={filtros.desde ?? ""} max={hoy} />
        </Filtro>
        <Filtro etiqueta="Hasta" htmlFor="hasta">
          <Entrada id="hasta" name="hasta" type="date" defaultValue={filtros.hasta ?? ""} max={hoy} />
        </Filtro>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="soloPorVencer"
              value="true"
              defaultChecked={filtros.soloPorVencer}
              className="size-4"
            />
            Por vencer
          </label>
          <Boton type="submit">Filtrar</Boton>
        </div>
      </form>

      <div className="superficie">
        <Tabla>
          <TablaEncabezado>
            <TablaFila>
              <TablaCeldaEncabezado>Empeño</TablaCeldaEncabezado>
              <TablaCeldaEncabezado>Cliente</TablaCeldaEncabezado>
              <TablaCeldaEncabezado>Bien</TablaCeldaEncabezado>
              <TablaCeldaEncabezado className="text-right">Capital</TablaCeldaEncabezado>
              <TablaCeldaEncabezado className="text-right">Debe hoy</TablaCeldaEncabezado>
              <TablaCeldaEncabezado>Vence</TablaCeldaEncabezado>
              <TablaCeldaEncabezado>Estado</TablaCeldaEncabezado>
            </TablaFila>
          </TablaEncabezado>
          <TablaCuerpo>
            {filas.length === 0 ? (
              <TablaVacia columnas={7} mensaje="No hay empeños que coincidan con el filtro." />
            ) : (
              filas.map((empeno) => <FilaEmpeno key={empeno.id} empeno={empeno} hoy={hoy} />)
            )}
          </TablaCuerpo>
        </Tabla>
      </div>

      <Paginacion
        base="/app/empenos"
        pagina={filtros.pagina}
        totalPaginas={totalPaginas}
        parametros={parametros}
      />

      <p className="text-xs text-muted-foreground">
        «Debe hoy» suma el capital pendiente y el interés causado hasta hoy con la tasa
        pactada. Abonos, renovaciones y cierres se hacen desde la ficha de cada empeño.
      </p>
    </div>
  );
}

function FilaEmpeno({ empeno, hoy }: { empeno: EmpenoListado; hoy: string }) {
  const estado = estadoSegunFechas({
    estado: empeno.estado as EstadoEmpeno,
    fechaVencimiento: empeno.fechaVencimiento,
    hoy: hoyComoFecha(),
  });
  const abierto = empeno.estado === "activo" || empeno.estado === "vencido";
  const saldo = saldoConAbonos({
    capital: empeno.capital,
    tasaMensual: empeno.tasaMensual,
    fechaInicio: empeno.fechaInicio,
    abonos: empeno.abonos,
    hasta: hoy,
  });
  const dias = diasParaVencer(empeno.fechaVencimiento, hoyComoFecha());
  const enlace = comoRuta(`/app/empenos/${empeno.id}`);

  return (
    <TablaFila>
      <TablaCelda className="font-medium whitespace-nowrap">
        <Link href={enlace} className="underline-offset-4 hover:underline">
          {empeno.numero}
        </Link>
      </TablaCelda>
      <TablaCelda>
        <Link href={enlace} className="underline-offset-4 hover:underline">
          {empeno.clienteNombre}
        </Link>
        <span className="block text-xs text-muted-foreground">{empeno.clienteCedula}</span>
      </TablaCelda>
      <TablaCelda>
        {ETIQUETA_TIPO_BIEN[empeno.tipoBien as TipoBien]}
        <span className="block text-xs text-muted-foreground">
          {resumenCortoBien(empeno.bien)}
        </span>
      </TablaCelda>
      <TablaCelda className="text-right tabular-nums whitespace-nowrap">
        {formatearMoneda(empeno.capital)}
        <span className="block text-xs text-muted-foreground">{empeno.tasaMensual}% mes</span>
      </TablaCelda>
      <TablaCelda className="text-right tabular-nums whitespace-nowrap">
        {abierto ? formatearMoneda(saldo.total) : "—"}
        {abierto ? (
          <span className="block text-xs text-muted-foreground">
            interés {formatearMoneda(saldo.interesPendiente)}
          </span>
        ) : null}
      </TablaCelda>
      <TablaCelda className="whitespace-nowrap">
        {formatearFecha(empeno.fechaVencimiento)}
        {abierto ? (
          <span className="block text-xs text-muted-foreground">{formatearDiasRelativos(dias)}</span>
        ) : null}
      </TablaCelda>
      <TablaCelda>
        <EtiquetaEstadoEmpeno estado={estado} />
      </TablaCelda>
    </TablaFila>
  );
}

function Filtro({
  etiqueta,
  htmlFor,
  children,
}: {
  etiqueta: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}

function EnlaceIndicador({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={comoRuta(href)}
      className="rounded-lg outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {children}
    </Link>
  );
}
