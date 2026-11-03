"use client";

import type { FormEvent, ReactNode } from "react";

import { useFormularioAccion } from "@/components/app/use-formulario-accion";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { Campo, Entrada, Selector } from "@/components/ui/formulario";
import { DIAS_MES_COMERCIAL, DIAS_MAXIMOS_RENOVACION } from "@/domain/empeno";
import { ETIQUETA_METODO_PAGO, METODOS_PAGO } from "@/domain/enums";
import { formatearFecha, formatearMoneda } from "@/lib/formato";
import {
  accionDeclararPerdido,
  accionLiquidarEmpeno,
  accionRenovarEmpeno,
} from "@/server/acciones/empenos";
import type { EstadoAccion } from "@/server/acciones/comun";

type Props = {
  empenoId: string;
  hoy: string;
  total: number;
  interesPendiente: number;
  fechaVencimiento: string;
  puedePerderse: boolean;
  esMoto: boolean;
};

/**
 * Las tres maneras de cerrar o extender un empeño. Cada una es un formulario
 * propio: tienen campos distintos y un error en una no debe tocar las otras.
 */
export function OperacionesEmpeno(props: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Liquidar {...props} />
      <Renovar {...props} />
      <DeclararPerdido {...props} />
    </div>
  );
}

function Liquidar({ empenoId, hoy, total }: Props) {
  const { estado, enviando, formulario, alEnviar } = useFormularioAccion(accionLiquidarEmpeno);

  return (
    <Operacion
      titulo="El cliente paga todo"
      descripcion={`Hoy debe ${formatearMoneda(total)}. Se registra como abono a interés y capital y el empeño se cierra: el cliente recupera el bien.`}
    >
      <form
        ref={formulario}
        onSubmit={(evento) =>
          confirmarYEnviar(
            evento,
            `¿Confirmas que el cliente pagó ${formatearMoneda(total)} y se lleva el bien? El empeño quedará cerrado.`,
            alEnviar,
          )
        }
        className="flex flex-col gap-3"
        noValidate
      >
        <input type="hidden" name="empenoId" value={empenoId} />
        <input type="hidden" name="totalEsperado" value={total} />
        <ResultadoAccion estado={estado} />
        <CamposFechaYMedio prefijo="liquidar" hoy={hoy} estado={estado} />
        <Boton type="submit" variant="exito" disabled={enviando}>
          {enviando ? "Liquidando…" : "Liquidar empeño"}
        </Boton>
      </form>
    </Operacion>
  );
}

function Renovar({ empenoId, hoy, interesPendiente, fechaVencimiento }: Props) {
  const { estado, enviando, formulario, alEnviar } = useFormularioAccion(accionRenovarEmpeno);
  const cobro =
    interesPendiente > 0
      ? `Al renovar se cobra el interés pendiente a la fecha (hoy, ${formatearMoneda(interesPendiente)}).`
      : "No hay interés pendiente: la renovación no cobra nada.";

  return (
    <Operacion
      titulo="Renovar el plazo"
      descripcion={`Vence el ${formatearFecha(fechaVencimiento)}. ${cobro}`}
    >
      <form ref={formulario} onSubmit={alEnviar} className="flex flex-col gap-3" noValidate>
        <input type="hidden" name="empenoId" value={empenoId} />
        <ResultadoAccion estado={estado} />
        <Campo
          etiqueta="Días de plazo nuevo"
          htmlFor="renovar-dias"
          requerido
          ayuda="Se cuentan desde el vencimiento, o desde hoy si ya venció"
          error={estado.errores?.dias}
        >
          <Entrada
            id="renovar-dias"
            name="dias"
            type="number"
            inputMode="numeric"
            min={1}
            max={DIAS_MAXIMOS_RENOVACION}
            defaultValue={DIAS_MES_COMERCIAL}
            aria-invalid={Boolean(estado.errores?.dias)}
          />
        </Campo>
        <CamposFechaYMedio prefijo="renovar" hoy={hoy} estado={estado} />
        <Boton type="submit" variant="outline" disabled={enviando}>
          {enviando ? "Renovando…" : "Renovar"}
        </Boton>
      </form>
    </Operacion>
  );
}

function DeclararPerdido({ empenoId, hoy, fechaVencimiento, puedePerderse, esMoto }: Props) {
  const { estado, enviando, formulario, alEnviar } = useFormularioAccion(accionDeclararPerdido);

  return (
    <Operacion
      titulo="Quedarse con el bien"
      descripcion={
        puedePerderse
          ? "El plazo venció sin pago. El empeño se cierra como perdido y el bien pasa a ser del negocio."
          : `Disponible a partir del ${formatearFecha(fechaVencimiento)}: antes de esa fecha el bien sigue siendo del cliente.`
      }
    >
      <form
        ref={formulario}
        onSubmit={(evento) =>
          confirmarYEnviar(
            evento,
            "¿Confirmas que el negocio se queda con el bien? Esto cierra el empeño y no se puede deshacer desde la aplicación.",
            alEnviar,
          )
        }
        className="flex flex-col gap-3"
        noValidate
      >
        <input type="hidden" name="empenoId" value={empenoId} />
        <ResultadoAccion estado={estado} />
        <Campo etiqueta="Fecha" htmlFor="perdido-fecha" requerido error={estado.errores?.fecha}>
          <Entrada
            id="perdido-fecha"
            name="fecha"
            type="date"
            defaultValue={hoy}
            max={hoy}
            disabled={!puedePerderse}
          />
        </Campo>
        {esMoto ? (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="pasarAInventario"
              defaultChecked
              disabled={!puedePerderse}
              className="mt-0.5 size-4"
            />
            <span>
              Pasar la moto al inventario de compra/venta
              <span className="block text-xs text-muted-foreground">
                Entra con el capital que no se recuperó como precio de compra.
              </span>
            </span>
          </label>
        ) : null}
        <Boton type="submit" variant="destructive" disabled={enviando || !puedePerderse}>
          {enviando ? "Cerrando…" : "Declarar perdido"}
        </Boton>
      </form>
    </Operacion>
  );
}

function confirmarYEnviar(
  evento: FormEvent<HTMLFormElement>,
  pregunta: string,
  enviar: (evento: FormEvent<HTMLFormElement>) => void,
) {
  if (!window.confirm(pregunta)) {
    evento.preventDefault();
    return;
  }
  enviar(evento);
}

function Operacion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 superficie p-4">
      <div>
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{descripcion}</p>
      </div>
      {children}
    </section>
  );
}

function ResultadoAccion({ estado }: { estado: EstadoAccion }) {
  if (!estado.mensaje) return null;
  return <Aviso tono={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>;
}

function CamposFechaYMedio({
  prefijo,
  hoy,
  estado,
}: {
  prefijo: string;
  hoy: string;
  estado: EstadoAccion;
}) {
  return (
    <>
      <Campo etiqueta="Fecha" htmlFor={`${prefijo}-fecha`} requerido error={estado.errores?.fecha}>
        <Entrada
          id={`${prefijo}-fecha`}
          name="fecha"
          type="date"
          defaultValue={hoy}
          max={hoy}
          aria-invalid={Boolean(estado.errores?.fecha)}
        />
      </Campo>
      <Campo etiqueta="Medio de pago" htmlFor={`${prefijo}-metodo`} error={estado.errores?.metodoPago}>
        <Selector id={`${prefijo}-metodo`} name="metodoPago" defaultValue="efectivo">
          {METODOS_PAGO.map((valor) => (
            <option key={valor} value={valor}>
              {ETIQUETA_METODO_PAGO[valor]}
            </option>
          ))}
        </Selector>
      </Campo>
    </>
  );
}
