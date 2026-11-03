"use client";

import { useFormularioAccion } from "@/components/app/use-formulario-accion";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo, Entrada, Selector } from "@/components/ui/formulario";
import { ESTADOS_INICIALES_MOTO } from "@/domain/moto";
import { ETIQUETA_ESTADO_MOTO } from "@/domain/enums";
import { accionCrearMoto, accionEditarMoto } from "@/server/acciones/motos";

/** Valores para precargar el formulario al editar. */
export type ValoresMoto = {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  cilindraje: number | null;
  numeroMotor: string | null;
  numeroChasis: string | null;
  precioCompra: number;
  precioPublicado: number | null;
  fechaCompra: string;
  proveedorNombre: string | null;
  proveedorCedula: string | null;
  proveedorTelefono: string | null;
  descripcion: string | null;
};

/**
 * Alta y edición de una moto. Sin `moto` crea; con `moto` edita, y entonces el
 * estado no aparece: cambiar de estado tiene su propio control en la ficha.
 */
export function FormularioMoto({ moto, hoy }: { moto?: ValoresMoto; hoy: string }) {
  const { estado, enviando, formulario, alEnviar } = useFormularioAccion(
    moto ? accionEditarMoto : accionCrearMoto,
  );
  const error = (campo: string) => estado.errores?.[campo];
  const valor = (texto: string | number | null | undefined) => (texto ?? "").toString();

  return (
    <form ref={formulario} onSubmit={alEnviar} className="flex flex-col gap-6" noValidate>
      {moto ? <input type="hidden" name="motoId" value={moto.id} /> : null}
      {estado.mensaje ? <Aviso tono={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso> : null}

      <Seccion titulo="La moto">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Placa" htmlFor="placa" requerido error={error("placa")}>
            <Entrada id="placa" name="placa" placeholder="ABC12D" autoCapitalize="characters"
              className="uppercase" defaultValue={valor(moto?.placa)} aria-invalid={Boolean(error("placa"))} />
          </Campo>
          <Campo etiqueta="Marca" htmlFor="marca" requerido error={error("marca")}>
            <Entrada id="marca" name="marca" placeholder="Yamaha" defaultValue={valor(moto?.marca)} />
          </Campo>
          <Campo etiqueta="Modelo" htmlFor="modelo" requerido error={error("modelo")}>
            <Entrada id="modelo" name="modelo" placeholder="FZ 2.0" defaultValue={valor(moto?.modelo)} />
          </Campo>
          <Campo etiqueta="Año" htmlFor="anio" requerido error={error("anio")}>
            <Entrada id="anio" name="anio" type="number" inputMode="numeric" placeholder="2021"
              defaultValue={valor(moto?.anio)} />
          </Campo>
          <Campo etiqueta="Color" htmlFor="color" requerido error={error("color")}>
            <Entrada id="color" name="color" placeholder="Negro" defaultValue={valor(moto?.color)} />
          </Campo>
          <Campo etiqueta="Cilindraje" htmlFor="cilindraje" ayuda="Opcional, en cc" error={error("cilindraje")}>
            <Entrada id="cilindraje" name="cilindraje" type="number" inputMode="numeric" placeholder="150"
              defaultValue={valor(moto?.cilindraje)} />
          </Campo>
          <Campo etiqueta="Número de motor" htmlFor="numeroMotor" ayuda="Opcional" error={error("numeroMotor")}>
            <Entrada id="numeroMotor" name="numeroMotor" defaultValue={valor(moto?.numeroMotor)} />
          </Campo>
          <Campo etiqueta="Número de chasis" htmlFor="numeroChasis" ayuda="Opcional" error={error("numeroChasis")}>
            <Entrada id="numeroChasis" name="numeroChasis" defaultValue={valor(moto?.numeroChasis)} />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="La compra">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Precio de compra" htmlFor="precioCompra" requerido ayuda="En pesos" error={error("precioCompra")}>
            <Entrada id="precioCompra" name="precioCompra" inputMode="numeric" placeholder="4500000"
              defaultValue={valor(moto?.precioCompra)} aria-invalid={Boolean(error("precioCompra"))} />
          </Campo>
          <Campo etiqueta="Precio publicado" htmlFor="precioPublicado" ayuda="Opcional. Al vender se propone este precio" error={error("precioPublicado")}>
            <Entrada id="precioPublicado" name="precioPublicado" inputMode="numeric" placeholder="5800000"
              defaultValue={valor(moto?.precioPublicado)} aria-invalid={Boolean(error("precioPublicado"))} />
          </Campo>
          <Campo etiqueta="Fecha de compra" htmlFor="fechaCompra" requerido error={error("fechaCompra")}>
            <Entrada id="fechaCompra" name="fechaCompra" type="date" max={hoy}
              defaultValue={moto?.fechaCompra ?? hoy} />
          </Campo>
          <Campo etiqueta="Le compré a (dueño anterior)" htmlFor="proveedorNombre" ayuda="Opcional" error={error("proveedorNombre")}>
            <Entrada id="proveedorNombre" name="proveedorNombre" defaultValue={valor(moto?.proveedorNombre)} />
          </Campo>
          <Campo etiqueta="Cédula del dueño anterior" htmlFor="proveedorCedula" ayuda="Opcional" error={error("proveedorCedula")}>
            <Entrada id="proveedorCedula" name="proveedorCedula" inputMode="numeric"
              defaultValue={valor(moto?.proveedorCedula)} />
          </Campo>
          <Campo etiqueta="Teléfono del dueño anterior" htmlFor="proveedorTelefono" ayuda="Opcional" error={error("proveedorTelefono")}>
            <Entrada id="proveedorTelefono" name="proveedorTelefono" type="tel" inputMode="numeric"
              defaultValue={valor(moto?.proveedorTelefono)} />
          </Campo>
          {moto ? null : (
            <Campo etiqueta="Estado inicial" htmlFor="estado" error={error("estado")}>
              <Selector id="estado" name="estado" defaultValue="disponible">
                {ESTADOS_INICIALES_MOTO.map((opcion) => (
                  <option key={opcion} value={opcion}>{ETIQUETA_ESTADO_MOTO[opcion]}</option>
                ))}
              </Selector>
            </Campo>
          )}
          <Campo etiqueta="Descripción" htmlFor="descripcion" ayuda="Opcional" error={error("descripcion")} className="sm:col-span-2">
            <AreaTexto id="descripcion" name="descripcion" defaultValue={valor(moto?.descripcion)} />
          </Campo>
        </div>
      </Seccion>

      <Boton type="submit" disabled={enviando} className="sm:self-start">
        {enviando ? "Guardando…" : moto ? "Guardar cambios" : "Registrar moto"}
      </Boton>
    </form>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="superficie p-4">
      <legend className="px-1 text-sm font-semibold">{titulo}</legend>
      <div className="mt-2">{children}</div>
    </fieldset>
  );
}
