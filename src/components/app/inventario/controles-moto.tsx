"use client";

import Link from "next/link";

import { useFormularioAccion } from "@/components/app/use-formulario-accion";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { Selector } from "@/components/ui/formulario";
import { ETIQUETA_ESTADO_MOTO, type EstadoMoto } from "@/domain/enums";
import { TRANSICIONES_MOTO, puedeEliminarse } from "@/domain/moto";
import { comoRuta } from "@/lib/rutas";
import { accionCambiarEstadoMoto, accionEliminarMoto } from "@/server/acciones/motos";

/**
 * Acciones sobre una moto desde su ficha: editar, cambiar de estado (solo a
 * los estados permitidos desde el actual) y borrar.
 */
export function ControlesMoto({ motoId, estado }: { motoId: string; estado: EstadoMoto }) {
  const cambio = useFormularioAccion(accionCambiarEstadoMoto);
  const borrado = useFormularioAccion(accionEliminarMoto);
  const destinos = TRANSICIONES_MOTO[estado];
  const mensaje = cambio.estado.mensaje ?? borrado.estado.mensaje;
  const ok = cambio.estado.mensaje ? cambio.estado.ok : borrado.estado.ok;

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <Boton variant="outline" size="sm" asChild>
          <Link href={comoRuta(`/app/inventario/${motoId}/editar`)}>Editar datos</Link>
        </Boton>

        {destinos.length > 0 ? (
          <form onSubmit={cambio.alEnviar} className="flex items-center gap-2">
            <input type="hidden" name="motoId" value={motoId} />
            <label htmlFor="nuevo-estado" className="sr-only">
              Nuevo estado
            </label>
            <Selector id="nuevo-estado" name="estado" defaultValue={destinos[0]} className="h-9 w-auto text-sm">
              {destinos.map((destino) => (
                <option key={destino} value={destino}>
                  {ETIQUETA_ESTADO_MOTO[destino]}
                </option>
              ))}
            </Selector>
            <Boton type="submit" variant="secondary" size="sm" disabled={cambio.enviando}>
              {cambio.enviando ? "Cambiando…" : "Cambiar estado"}
            </Boton>
          </form>
        ) : null}

        {puedeEliminarse(estado) ? (
          <form
            onSubmit={(evento) => {
              if (!window.confirm("¿Borrar esta moto del inventario? Sus gastos se conservan.")) {
                evento.preventDefault();
                return;
              }
              borrado.alEnviar(evento);
            }}
          >
            <input type="hidden" name="motoId" value={motoId} />
            <Boton type="submit" variant="ghost" size="sm" disabled={borrado.enviando} className="text-destructive">
              {borrado.enviando ? "Borrando…" : "Borrar"}
            </Boton>
          </form>
        ) : null}
      </div>
      {mensaje ? <Aviso tono={ok ? "exito" : "error"}>{mensaje}</Aviso> : null}
    </div>
  );
}
