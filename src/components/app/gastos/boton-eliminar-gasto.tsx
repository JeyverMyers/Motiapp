"use client";

import { Trash2 } from "lucide-react";

import { useFormularioAccion } from "@/components/app/use-formulario-accion";
import { Boton } from "@/components/ui/boton";
import { formatearMoneda } from "@/lib/formato";
import { accionEliminarGasto } from "@/server/acciones/gastos";

export function BotonEliminarGasto({ gastoId, monto }: { gastoId: string; monto: number }) {
  const { estado, enviando, alEnviar } = useFormularioAccion(accionEliminarGasto);

  return (
    <form
      onSubmit={(evento) => {
        if (!window.confirm(`¿Borrar este gasto de ${formatearMoneda(monto)}? La ganancia se recalcula sola.`)) {
          evento.preventDefault();
          return;
        }
        alEnviar(evento);
      }}
      className="flex items-center justify-end gap-2"
    >
      <input type="hidden" name="gastoId" value={gastoId} />
      {estado.mensaje && !estado.ok ? (
        <span role="alert" className="text-xs text-destructive">
          {estado.mensaje}
        </span>
      ) : null}
      <Boton
        type="submit"
        variant="ghost"
        size="icono"
        disabled={enviando}
        aria-label={`Borrar gasto de ${formatearMoneda(monto)}`}
      >
        <Trash2 />
      </Boton>
    </form>
  );
}
