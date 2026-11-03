"use client";

import { useRef } from "react";

import { useFormularioAccion } from "@/components/app/use-formulario-accion";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { Campo, Entrada, Selector } from "@/components/ui/formulario";
import { CONCEPTOS_ABONO, ETIQUETA_CONCEPTO_ABONO, type ConceptoAbono } from "@/domain/empeno";
import { ETIQUETA_METODO_PAGO, METODOS_PAGO } from "@/domain/enums";
import { formatearMoneda } from "@/lib/formato";
import { accionRegistrarAbono } from "@/server/acciones/empenos";

type Props = {
  empenoId: string;
  hoy: string;
  interesPendiente: number;
  capitalVigente: number;
};

export function FormularioAbono({ empenoId, hoy, interesPendiente, capitalVigente }: Props) {
  const { estado, enviando, formulario, alEnviar } = useFormularioAccion(accionRegistrarAbono);
  const campoMonto = useRef<HTMLInputElement>(null);
  const campoConcepto = useRef<HTMLSelectElement>(null);

  const atajos: { etiqueta: string; monto: number; concepto: ConceptoAbono }[] = [
    { etiqueta: "Solo el interés", monto: interesPendiente, concepto: "interes" },
    { etiqueta: "Todo lo que debe", monto: interesPendiente + capitalVigente, concepto: "ambos" },
  ];

  function usarAtajo(monto: number, concepto: ConceptoAbono) {
    if (campoMonto.current) campoMonto.current.value = String(monto);
    if (campoConcepto.current) campoConcepto.current.value = concepto;
    campoMonto.current?.focus();
  }

  return (
    <form ref={formulario} onSubmit={alEnviar} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="empenoId" value={empenoId} />

      {estado.mensaje ? (
        <Aviso tono={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {atajos
          .filter((atajo) => atajo.monto > 0)
          .map((atajo) => (
            <Boton
              key={atajo.concepto}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => usarAtajo(atajo.monto, atajo.concepto)}
            >
              {atajo.etiqueta}
              <span className="tabular-nums text-muted-foreground">
                {formatearMoneda(atajo.monto)}
              </span>
            </Boton>
          ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Monto"
          htmlFor="abono-monto"
          requerido
          ayuda="En pesos, sin puntos"
          error={estado.errores?.monto}
        >
          <Entrada
            ref={campoMonto}
            id="abono-monto"
            name="monto"
            inputMode="numeric"
            placeholder="150000"
            aria-invalid={Boolean(estado.errores?.monto)}
          />
        </Campo>

        <Campo etiqueta="Se aplica a" htmlFor="abono-concepto" error={estado.errores?.concepto}>
          <Selector ref={campoConcepto} id="abono-concepto" name="concepto" defaultValue="interes">
            {CONCEPTOS_ABONO.map((valor) => (
              <option key={valor} value={valor}>
                {ETIQUETA_CONCEPTO_ABONO[valor]}
              </option>
            ))}
          </Selector>
        </Campo>

        <Campo etiqueta="Fecha del pago" htmlFor="abono-fecha" requerido error={estado.errores?.fecha}>
          <Entrada
            id="abono-fecha"
            name="fecha"
            type="date"
            defaultValue={hoy}
            max={hoy}
            aria-invalid={Boolean(estado.errores?.fecha)}
          />
        </Campo>

        <Campo etiqueta="Medio de pago" htmlFor="abono-metodo" error={estado.errores?.metodoPago}>
          <Selector id="abono-metodo" name="metodoPago" defaultValue="efectivo">
            {METODOS_PAGO.map((valor) => (
              <option key={valor} value={valor}>
                {ETIQUETA_METODO_PAGO[valor]}
              </option>
            ))}
          </Selector>
        </Campo>

        <Campo
          etiqueta="Nota"
          htmlFor="abono-nota"
          ayuda="Opcional"
          error={estado.errores?.nota}
          className="sm:col-span-2"
        >
          <Entrada id="abono-nota" name="nota" placeholder="Pagó el hermano, recibo 123…" />
        </Campo>
      </div>

      <Boton type="submit" disabled={enviando} className="sm:self-start">
        {enviando ? "Registrando…" : "Registrar abono"}
      </Boton>
    </form>
  );
}
