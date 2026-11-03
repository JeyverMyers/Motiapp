"use client";

import { useState } from "react";

import { useFormularioAccion } from "@/components/app/use-formulario-accion";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo, Entrada, Selector } from "@/components/ui/formulario";
import { formatearDocumento } from "@/domain/cliente";
import { ETIQUETA_TIPO_DOCUMENTO, TIPOS_DOCUMENTO, type TipoDocumento } from "@/domain/enums";
import { accionCrearCliente, accionEditarCliente } from "@/server/acciones/clientes";

export type ValoresCliente = {
  id: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string | null;
  telefono: string;
  telefonoAlterno: string | null;
  email: string | null;
  direccion: string | null;
  ciudad: string | null;
  notas: string | null;
};

const AYUDA_DOCUMENTO: Record<TipoDocumento, string> = {
  CC: "Solo números. La cédula no lleva dígito de verificación",
  CE: "Solo números",
  NIT: "Con el dígito de verificación, por ejemplo 900123456-8",
  PP: "Letras y números",
  TI: "Solo números",
};

/**
 * Alta y edición de un cliente. Sin `cliente` crea; con `cliente` edita. El
 * documento se valida según su tipo en el servidor (ver `domain/cliente.ts`).
 */
export function FormularioCliente({ cliente }: { cliente?: ValoresCliente }) {
  const { estado, enviando, formulario, alEnviar } = useFormularioAccion(
    cliente ? accionEditarCliente : accionCrearCliente,
  );
  const [tipo, setTipo] = useState<TipoDocumento>((cliente?.tipoDocumento as TipoDocumento) ?? "CC");
  const error = (campo: string) => estado.errores?.[campo];

  return (
    <form ref={formulario} onSubmit={alEnviar} className="flex flex-col gap-5" noValidate>
      {cliente ? <input type="hidden" name="clienteId" value={cliente.id} /> : null}
      {estado.mensaje ? <Aviso tono="error">{estado.mensaje}</Aviso> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Tipo de documento" htmlFor="tipoDocumento" requerido error={error("tipoDocumento")}>
          <Selector
            id="tipoDocumento"
            name="tipoDocumento"
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value as TipoDocumento)}
          >
            {TIPOS_DOCUMENTO.map((opcion) => (
              <option key={opcion} value={opcion}>
                {ETIQUETA_TIPO_DOCUMENTO[opcion]}
              </option>
            ))}
          </Selector>
        </Campo>
        <Campo
          etiqueta="Número de documento"
          htmlFor="numeroDocumento"
          requerido
          ayuda={AYUDA_DOCUMENTO[tipo]}
          error={error("numeroDocumento")}
        >
          <Entrada
            id="numeroDocumento"
            name="numeroDocumento"
            inputMode={tipo === "PP" ? "text" : "numeric"}
            autoComplete="off"
            defaultValue={cliente ? formatearDocumento(cliente.tipoDocumento, cliente.numeroDocumento) : ""}
            aria-invalid={Boolean(error("numeroDocumento"))}
          />
        </Campo>
        <Campo etiqueta="Nombres" htmlFor="nombres" requerido error={error("nombres")}>
          <Entrada id="nombres" name="nombres" autoComplete="off" defaultValue={cliente?.nombres ?? ""} />
        </Campo>
        <Campo etiqueta="Apellidos" htmlFor="apellidos" ayuda="Opcional" error={error("apellidos")}>
          <Entrada id="apellidos" name="apellidos" autoComplete="off" defaultValue={cliente?.apellidos ?? ""} />
        </Campo>
        <Campo etiqueta="Celular" htmlFor="telefono" requerido error={error("telefono")}>
          <Entrada id="telefono" name="telefono" type="tel" inputMode="numeric" defaultValue={cliente?.telefono ?? ""} />
        </Campo>
        <Campo etiqueta="Otro teléfono" htmlFor="telefonoAlterno" ayuda="Opcional" error={error("telefonoAlterno")}>
          <Entrada
            id="telefonoAlterno"
            name="telefonoAlterno"
            type="tel"
            inputMode="numeric"
            defaultValue={cliente?.telefonoAlterno ?? ""}
          />
        </Campo>
        <Campo etiqueta="Correo" htmlFor="email" ayuda="Opcional" error={error("email")}>
          <Entrada id="email" name="email" type="email" defaultValue={cliente?.email ?? ""} />
        </Campo>
        <Campo etiqueta="Ciudad" htmlFor="ciudad" ayuda="Opcional" error={error("ciudad")}>
          <Entrada id="ciudad" name="ciudad" defaultValue={cliente?.ciudad ?? ""} />
        </Campo>
        <Campo etiqueta="Dirección" htmlFor="direccion" ayuda="Opcional" error={error("direccion")} className="sm:col-span-2">
          <Entrada id="direccion" name="direccion" defaultValue={cliente?.direccion ?? ""} />
        </Campo>
        <Campo etiqueta="Notas" htmlFor="notas" ayuda="Opcional" error={error("notas")} className="sm:col-span-2">
          <AreaTexto id="notas" name="notas" defaultValue={cliente?.notas ?? ""} />
        </Campo>
      </div>

      <div>
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : cliente ? "Guardar cambios" : "Registrar cliente"}
        </Boton>
      </div>
    </form>
  );
}
