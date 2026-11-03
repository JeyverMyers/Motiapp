"use client";

import { useFormularioAccion } from "@/components/app/use-formulario-accion";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { Campo, Entrada, Selector } from "@/components/ui/formulario";
import {
  CATEGORIAS_GASTO,
  ETIQUETA_CATEGORIA_GASTO,
  ETIQUETA_MODULO,
  MODULOS,
  type Modulo,
} from "@/domain/enums";
import { accionCrearGasto } from "@/server/acciones/gastos";

type Props = {
  hoy: string;
  /**
   * Desde la ficha de una moto o de un empeño, el módulo y la referencia van
   * fijos. Sin `fijo`, el dueño elige el módulo y el gasto queda como general.
   */
  fijo?: { modulo: Modulo; motoId?: string; empenoId?: string };
};

export function FormularioGasto({ hoy, fijo }: Props) {
  const { estado, enviando, formulario, alEnviar } = useFormularioAccion(accionCrearGasto);
  const prefijo = fijo?.motoId ?? fijo?.empenoId ?? "general";

  return (
    <form ref={formulario} onSubmit={alEnviar} className="flex flex-col gap-4" noValidate>
      {fijo ? (
        <>
          <input type="hidden" name="modulo" value={fijo.modulo} />
          {fijo.motoId ? <input type="hidden" name="motoId" value={fijo.motoId} /> : null}
          {fijo.empenoId ? <input type="hidden" name="empenoId" value={fijo.empenoId} /> : null}
        </>
      ) : null}

      {estado.mensaje ? (
        <Aviso tono={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>
      ) : null}
      {fijo && estado.errores?.modulo ? <Aviso tono="error">{estado.errores.modulo}</Aviso> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fijo ? null : (
          <Campo etiqueta="Módulo" htmlFor={`${prefijo}-modulo`} requerido error={estado.errores?.modulo}>
            <Selector id={`${prefijo}-modulo`} name="modulo" defaultValue="compra_venta">
              {MODULOS.map((modulo) => (
                <option key={modulo} value={modulo}>
                  {ETIQUETA_MODULO[modulo]}
                </option>
              ))}
            </Selector>
          </Campo>
        )}

        <Campo etiqueta="Categoría" htmlFor={`${prefijo}-categoria`} requerido error={estado.errores?.categoria}>
          <Selector id={`${prefijo}-categoria`} name="categoria" defaultValue={fijo?.motoId ? "reparacion" : "otro"}>
            {CATEGORIAS_GASTO.map((categoria) => (
              <option key={categoria} value={categoria}>
                {ETIQUETA_CATEGORIA_GASTO[categoria]}
              </option>
            ))}
          </Selector>
        </Campo>

        <Campo
          etiqueta="Monto"
          htmlFor={`${prefijo}-monto`}
          requerido
          ayuda="En pesos"
          error={estado.errores?.monto}
        >
          <Entrada
            id={`${prefijo}-monto`}
            name="monto"
            inputMode="numeric"
            placeholder="85000"
            aria-invalid={Boolean(estado.errores?.monto)}
          />
        </Campo>

        <Campo etiqueta="Fecha" htmlFor={`${prefijo}-fecha`} requerido error={estado.errores?.fecha}>
          <Entrada id={`${prefijo}-fecha`} name="fecha" type="date" defaultValue={hoy} max={hoy} />
        </Campo>

        <Campo
          etiqueta="Descripción"
          htmlFor={`${prefijo}-descripcion`}
          ayuda="Opcional"
          error={estado.errores?.descripcion}
          className={fijo ? "sm:col-span-2 lg:col-span-1" : "sm:col-span-2 lg:col-span-4"}
        >
          <Entrada
            id={`${prefijo}-descripcion`}
            name="descripcion"
            placeholder={fijo?.motoId ? "Cambio de llantas, SOAT…" : "Arriendo de octubre…"}
          />
        </Campo>
      </div>

      <Boton type="submit" disabled={enviando} className="sm:self-start">
        {enviando ? "Guardando…" : "Registrar gasto"}
      </Boton>
    </form>
  );
}
