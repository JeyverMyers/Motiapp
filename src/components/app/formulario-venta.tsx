"use client";

import { useState } from "react";

import { BuscadorMoto } from "@/components/app/buscador-moto";
import { useFormularioAccion } from "@/components/app/use-formulario-accion";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo, Entrada, Selector } from "@/components/ui/formulario";
import { ETIQUETA_METODO_PAGO, METODOS_PAGO } from "@/domain/enums";
import { gananciaDeMoto, margenDeMoto } from "@/domain/moto";
import { descuentoAplicado } from "@/domain/venta";
import { formatearMoneda } from "@/lib/formato";
import { accionRegistrarVenta } from "@/server/acciones/motos";
import type { MotoVendible } from "@/server/repositorios/ventas";

/**
 * Formulario de venta, en el orden del mostrador: moto → comprador → precio →
 * forma de pago. Desde la ficha de una moto, la moto ya viene elegida
 * (`motoFija`); desde «Nueva venta» se escoge de la lista.
 *
 * El precio se precarga con el publicado de la moto; si el dueño rebaja, el
 * descuento se ve antes de confirmar. La ganancia es solo una vista previa: la
 * que vale es la que calcula el servidor con los datos guardados.
 */
export function FormularioVenta({
  motos,
  hoy,
  motoFija,
  comprador,
}: {
  motos: MotoVendible[];
  /** Comprador precargado desde la ficha de un cliente. */
  comprador?: { nombre: string; cedula: string; telefono: string };
  /** AAAA-MM-DD en la zona del negocio. */
  hoy: string;
  motoFija?: string;
}) {
  const { estado, enviando, formulario, alEnviar } = useFormularioAccion(accionRegistrarVenta);
  const [motoId, setMotoId] = useState(motoFija ?? "");
  const publicadoDe = (id: string) => motos.find((opcion) => opcion.id === id)?.precioPublicado;
  const [precioTexto, setPrecioTexto] = useState(() => String(publicadoDe(motoFija ?? "") ?? ""));

  function elegirMoto(id: string) {
    setMotoId(id);
    setPrecioTexto(String(publicadoDe(id) ?? ""));
  }

  const moto = motos.find((opcion) => opcion.id === motoId);
  const precioVenta = Number(precioTexto.replace(/\D/g, "")) || undefined;
  const precios = moto ? { precioCompra: moto.precioCompra, precioVenta } : null;
  const ganancia = precios ? gananciaDeMoto(precios, moto?.gastos) : null;
  const margen = precios ? margenDeMoto(precios, moto?.gastos) : null;
  const descuento = moto && precioVenta ? descuentoAplicado(moto.precioPublicado, precioVenta) : 0;

  return (
    <form ref={formulario} onSubmit={alEnviar} className="flex flex-col gap-5" noValidate>
      {estado.mensaje ? <Aviso tono="error">{estado.mensaje}</Aviso> : null}

      <Paso numero={1} titulo="La moto">
        {motoFija ? (
          <input type="hidden" name="motoId" value={motoFija} />
        ) : (
          <Campo etiqueta="Moto que se vende" htmlFor="motoId" requerido error={estado.errores?.motoId}>
            <BuscadorMoto
              id="motoId"
              name="motoId"
              motos={motos}
              valor={motoId}
              alElegir={elegirMoto}
              invalido={Boolean(estado.errores?.motoId)}
            />
          </Campo>
        )}
        {moto ? (
          <p className="text-xs text-muted-foreground">
            Comprada en {formatearMoneda(moto.precioCompra)} · gastos {formatearMoneda(moto.gastos)} ·{" "}
            {moto.precioPublicado === null ? "sin precio publicado" : `publicada en ${formatearMoneda(moto.precioPublicado)}`}
          </p>
        ) : null}
      </Paso>

      <Paso numero={2} titulo="El comprador">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo etiqueta="Nombre completo" htmlFor="compradorNombre" requerido error={estado.errores?.compradorNombre}>
            <Entrada id="compradorNombre" name="compradorNombre" autoComplete="off" placeholder="Ana Ramírez" defaultValue={comprador?.nombre} />
          </Campo>
          <Campo etiqueta="Cédula" htmlFor="compradorCedula" requerido error={estado.errores?.compradorCedula}>
            <Entrada id="compradorCedula" name="compradorCedula" inputMode="numeric" autoComplete="off" placeholder="1020304050" defaultValue={comprador?.cedula} />
          </Campo>
          <Campo etiqueta="Celular" htmlFor="compradorTelefono" requerido error={estado.errores?.compradorTelefono}>
            <Entrada id="compradorTelefono" name="compradorTelefono" type="tel" inputMode="numeric" placeholder="3001234567" defaultValue={comprador?.telefono} />
          </Campo>
        </div>
        <p className="text-xs text-muted-foreground">
          Queda guardado en Clientes. Si la cédula ya existe, se actualiza su celular.
        </p>
      </Paso>

      <Paso numero={3} titulo="El precio y el pago">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo
            etiqueta="Precio pactado"
            htmlFor="precioPactado"
            requerido
            error={estado.errores?.precioPactado}
            ayuda={descuento > 0 ? `Descuento de ${formatearMoneda(descuento)} sobre el publicado` : undefined}
          >
            <Entrada
              id="precioPactado"
              name="precioPactado"
              inputMode="numeric"
              placeholder="5800000"
              value={precioTexto}
              onChange={(evento) => setPrecioTexto(evento.target.value)}
            />
          </Campo>
          <Campo etiqueta="Forma de pago" htmlFor="metodoPago" error={estado.errores?.metodoPago}>
            <Selector id="metodoPago" name="metodoPago" defaultValue="efectivo">
              {METODOS_PAGO.map((metodo) => (
                <option key={metodo} value={metodo}>
                  {ETIQUETA_METODO_PAGO[metodo]}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Fecha de venta" htmlFor="fecha" requerido error={estado.errores?.fecha}>
            <Entrada id="fecha" name="fecha" type="date" max={hoy} defaultValue={hoy} />
          </Campo>
        </div>

        <Campo etiqueta="Observaciones" htmlFor="observaciones" ayuda="Opcional" error={estado.errores?.observaciones}>
          <AreaTexto id="observaciones" name="observaciones" placeholder="Se entrega con SOAT vigente…" />
        </Campo>
      </Paso>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/40 p-4">
        <div aria-live="polite">
          <span className="text-xs font-medium text-muted-foreground">Ganancia estimada</span>
          <p
            className={`text-2xl font-semibold tabular-nums ${
              ganancia === null ? "text-muted-foreground" : ganancia >= 0 ? "text-exito" : "text-destructive"
            }`}
          >
            {ganancia === null ? "—" : formatearMoneda(ganancia)}
          </p>
          <p className="text-xs text-muted-foreground">
            {margen === null ? "Escoge la moto y escribe el precio." : `Margen ${margen.toFixed(1)} % sobre la venta`}
          </p>
        </div>
        <Boton type="submit" variant="exito" disabled={enviando}>
          {enviando ? "Registrando…" : "Confirmar venta"}
        </Boton>
      </div>
    </form>
  );
}

function Paso({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <span
          aria-hidden
          className="grid size-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
        >
          {numero}
        </span>
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}
