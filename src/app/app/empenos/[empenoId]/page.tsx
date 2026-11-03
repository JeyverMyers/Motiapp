import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BotonContrato } from "@/components/app/empenos/boton-contrato";
import { FormularioAbono } from "@/components/app/empenos/formulario-abono";
import { OperacionesEmpeno } from "@/components/app/empenos/operaciones-empeno";
import {
  EtiquetaEstadoEmpeno,
  ListaDatos,
  descripcionBien,
} from "@/components/app/empenos/presentacion";
import { FormularioGasto } from "@/components/app/gastos/formulario-gasto";
import { TablaGastos } from "@/components/app/gastos/tabla-gastos";
import { TarjetaIndicador } from "@/components/app/tarjeta-indicador";
import {
  Tabla,
  TablaCelda,
  TablaCeldaEncabezado,
  TablaCuerpo,
  TablaEncabezado,
  TablaFila,
  TablaVacia,
} from "@/components/ui/tabla";
import { idSchema } from "@/domain/comun";
import {
  ETIQUETA_CONCEPTO_ABONO,
  diasParaVencer,
  estadoSegunFechas,
  puedeDeclararsePerdido,
  type ConceptoAbono,
} from "@/domain/empeno";
import {
  ETIQUETA_FRECUENCIA_PAGO,
  ETIQUETA_METODO_PAGO,
  type EstadoEmpeno,
  type FrecuenciaPago,
  type MetodoPago,
} from "@/domain/enums";
import { hoyComoFecha, hoyISO } from "@/lib/fechas";
import {
  formatearDiasRelativos,
  formatearFecha,
  formatearMoneda,
  formatearTelefono,
} from "@/lib/formato";
import type { DatosContrato } from "@/lib/contrato-empeno";
import { sesionDeDueno } from "@/server/auth/sesion";
import { obtenerEmpeno, type FichaEmpeno } from "@/server/repositorios/empenos";
import { gastosDe } from "@/server/repositorios/gastos";
import { datosDelNegocio, type DatosNegocio } from "@/server/repositorios/negocio";

export const metadata = {
  title: "Empeño",
  robots: { index: false, follow: false },
};

/**
 * Ficha de un empeño: lo que se debe hoy, el historial de pagos y las
 * operaciones del mostrador (abonar, liquidar, renovar, quedarse con el bien).
 *
 * El saldo se calcula en el servidor a la fecha de hoy en Colombia, con los
 * abonos fechados. Nada de eso se guarda: si se corrige un abono, la ficha se
 * corrige sola.
 */
export default async function PaginaEmpeno(props: { params: Promise<{ empenoId: string }> }) {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");

  const { empenoId } = await props.params;
  // Un id mal formado no debe llegar a Postgres como error de sintaxis.
  if (!idSchema.safeParse(empenoId).success) notFound();

  const [ficha, negocio, gastosEmpeno] = await Promise.all([
    obtenerEmpeno(sesion.tenantId, empenoId),
    datosDelNegocio(sesion.tenantId),
    gastosDe(sesion.tenantId, { empenoId }),
  ]);
  if (!ficha) notFound();

  const { empeno, bien, saldo, historial } = ficha;
  const hoy = hoyISO();
  const estado = estadoSegunFechas({
    estado: empeno.estado as EstadoEmpeno,
    fechaVencimiento: empeno.fechaVencimiento,
    hoy: hoyComoFecha(),
  });
  const dias = diasParaVencer(empeno.fechaVencimiento, hoyComoFecha());
  const abierto = empeno.estado === "activo" || empeno.estado === "vencido";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/app/empenos"
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Volver a empeños
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.025em]">Empeño N.º {empeno.numero}</h1>
            <EtiquetaEstadoEmpeno estado={estado} />
          </div>
          <p className="text-sm text-muted-foreground">
            {empeno.clienteNombre} · C.C. {empeno.clienteCedula}
          </p>
        </div>
        <BotonContrato datos={datosContrato(ficha, negocio)} />
      </header>

      <section aria-label="Saldo" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TarjetaIndicador
          etiqueta={abierto ? "Debe hoy" : "Saldo"}
          valor={formatearMoneda(abierto ? saldo.total : 0)}
          tono={abierto && estado === "vencido" ? "peligro" : "neutro"}
          detalle={abierto ? "Capital pendiente más interés causado" : "Empeño cerrado"}
        />
        <TarjetaIndicador
          etiqueta="Capital pendiente"
          valor={formatearMoneda(saldo.capitalVigente)}
          detalle={`De ${formatearMoneda(Number(empeno.capital))} prestados`}
        />
        <TarjetaIndicador
          etiqueta="Interés pendiente"
          valor={formatearMoneda(saldo.interesPendiente)}
          detalle={`${Number(empeno.tasaMensual)}% mensual`}
        />
        <TarjetaIndicador
          etiqueta="Vence"
          valor={formatearFecha(empeno.fechaVencimiento)}
          tono={abierto && dias < 0 ? "peligro" : "neutro"}
          detalle={abierto ? formatearDiasRelativos(dias) : `Límite de gracia ${formatearFecha(empeno.fechaLimiteGracia)}`}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Bloque titulo="Contrato">
          <ListaDatos
            filas={[
              { etiqueta: "Fecha", valor: formatearFecha(empeno.fechaInicio) },
              { etiqueta: "Capital", valor: formatearMoneda(Number(empeno.capital)) },
              { etiqueta: "Interés", valor: `${Number(empeno.tasaMensual)}% mensual` },
              {
                etiqueta: "Pagos",
                valor: ETIQUETA_FRECUENCIA_PAGO[empeno.frecuenciaPago as FrecuenciaPago],
              },
              { etiqueta: "Vence", valor: formatearFecha(empeno.fechaVencimiento) },
              { etiqueta: "Gracia hasta", valor: formatearFecha(empeno.fechaLimiteGracia) },
            ]}
          />
        </Bloque>

        <Bloque titulo="Bien empeñado">
          <p className="text-sm font-medium">{descripcionBien(bien)}</p>
        </Bloque>

        <Bloque titulo="Cliente">
          <ListaDatos
            filas={[
              { etiqueta: "Nombre", valor: empeno.clienteNombre },
              { etiqueta: "Cédula", valor: empeno.clienteCedula },
              { etiqueta: "Teléfono", valor: formatearTelefono(empeno.clienteTelefono) },
              ...(empeno.garanteNombre
                ? [{ etiqueta: "Garante", valor: empeno.garanteNombre }]
                : []),
            ]}
          />
          {empeno.clienteTelefono ? (
            <a
              href={`tel:${empeno.clienteTelefono}`}
              className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Llamar al cliente
            </a>
          ) : null}
        </Bloque>
      </div>

      {empeno.observaciones ? (
        <Bloque titulo="Observaciones">
          <p className="text-sm whitespace-pre-line">{empeno.observaciones}</p>
        </Bloque>
      ) : null}

      {abierto ? (
        <>
          <Bloque titulo="Registrar abono">
            <FormularioAbono
              empenoId={empeno.id}
              hoy={hoy}
              interesPendiente={saldo.interesPendiente}
              capitalVigente={saldo.capitalVigente}
            />
          </Bloque>

          <section aria-labelledby="titulo-cierre" className="flex flex-col gap-3">
            <h2 id="titulo-cierre" className="text-sm font-semibold">
              Cerrar o extender el empeño
            </h2>
            <OperacionesEmpeno
              empenoId={empeno.id}
              hoy={hoy}
              total={saldo.total}
              interesPendiente={saldo.interesPendiente}
              fechaVencimiento={empeno.fechaVencimiento}
              esMoto={empeno.tipoBien === "moto"}
              puedePerderse={puedeDeclararsePerdido({
                estado: empeno.estado as EstadoEmpeno,
                fechaVencimiento: empeno.fechaVencimiento,
                hoy,
              })}
            />
          </section>
        </>
      ) : null}

      <section aria-labelledby="titulo-historial" className="flex flex-col gap-3">
        <h2 id="titulo-historial" className="text-sm font-semibold">
          Historial de pagos
        </h2>
        <div className="superficie">
          <Tabla>
            <TablaEncabezado>
              <TablaFila>
                <TablaCeldaEncabezado>Fecha</TablaCeldaEncabezado>
                <TablaCeldaEncabezado>Concepto</TablaCeldaEncabezado>
                <TablaCeldaEncabezado className="text-right">Pagó</TablaCeldaEncabezado>
                <TablaCeldaEncabezado className="text-right">A interés</TablaCeldaEncabezado>
                <TablaCeldaEncabezado className="text-right">A capital</TablaCeldaEncabezado>
                <TablaCeldaEncabezado className="text-right">Quedó debiendo</TablaCeldaEncabezado>
                <TablaCeldaEncabezado>Medio</TablaCeldaEncabezado>
              </TablaFila>
            </TablaEncabezado>
            <TablaCuerpo>
              {historial.length === 0 ? (
                <TablaVacia columnas={7} mensaje="Todavía no hay abonos a este empeño." />
              ) : (
                historial.map((abono) => (
                  <TablaFila key={abono.id}>
                    <TablaCelda className="whitespace-nowrap">{formatearFecha(abono.fecha)}</TablaCelda>
                    <TablaCelda>
                      {ETIQUETA_CONCEPTO_ABONO[abono.concepto as ConceptoAbono]}
                      {abono.nota ? (
                        <span className="block text-xs text-muted-foreground">{abono.nota}</span>
                      ) : null}
                    </TablaCelda>
                    <TablaCelda className="text-right font-medium tabular-nums whitespace-nowrap">
                      {formatearMoneda(abono.monto)}
                    </TablaCelda>
                    <TablaCelda className="text-right tabular-nums whitespace-nowrap">
                      {formatearMoneda(abono.aInteres)}
                    </TablaCelda>
                    <TablaCelda className="text-right tabular-nums whitespace-nowrap">
                      {formatearMoneda(abono.aCapital)}
                    </TablaCelda>
                    <TablaCelda className="text-right tabular-nums whitespace-nowrap">
                      {formatearMoneda(abono.saldoDespues)}
                    </TablaCelda>
                    <TablaCelda>{ETIQUETA_METODO_PAGO[abono.metodoPago as MetodoPago]}</TablaCelda>
                  </TablaFila>
                ))
              )}
            </TablaCuerpo>
          </Tabla>
        </div>
      </section>

      <section aria-labelledby="titulo-gastos" className="superficie p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-gastos" className="text-sm font-semibold">
            Gastos de este empeño
          </h2>
          <span className="text-sm font-semibold tabular-nums">
            {formatearMoneda(gastosEmpeno.suma)}
          </span>
        </div>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">
          Bodegaje, grúa, trámites… Se descuentan de lo que el negocio gana con el
          módulo de empeño.
        </p>
        <FormularioGasto hoy={hoy} fijo={{ modulo: "empeno", empenoId: empeno.id }} />
        <div className="mt-4 rounded-md border">
          <TablaGastos gastos={gastosEmpeno.filas} mensajeVacio="Este empeño no tiene gastos registrados." />
        </div>
      </section>
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="superficie p-4">
      <h2 className="mb-3 text-sm font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

function datosContrato(ficha: FichaEmpeno, negocio: DatosNegocio | null): DatosContrato {
  const { empeno, bien } = ficha;
  return {
    negocio: negocio ?? { nombre: "", nit: null, direccion: null, ciudad: null, telefono: null },
    numero: empeno.numero,
    fechaInicio: empeno.fechaInicio,
    fechaVencimiento: empeno.fechaVencimiento,
    fechaLimiteGracia: empeno.fechaLimiteGracia,
    cliente: {
      nombre: empeno.clienteNombre,
      cedula: empeno.clienteCedula,
      telefono: empeno.clienteTelefono,
    },
    bien: descripcionBien(bien),
    capital: Number(empeno.capital),
    tasaMensual: Number(empeno.tasaMensual),
    garante: empeno.garanteNombre
      ? {
          nombre: empeno.garanteNombre,
          cedula: empeno.garanteCedula,
          telefono: empeno.garanteTelefono,
        }
      : null,
    observaciones: empeno.observaciones,
  };
}
