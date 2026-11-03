"use client";

import Link from "next/link";

import { useFormularioAccion } from "@/components/app/use-formulario-accion";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { Campo, Entrada } from "@/components/ui/formulario";
import { solicitarRecuperacion, type EstadoAuth } from "@/server/acciones/auth";

const ESTADO_INICIAL: EstadoAuth = {};

export function FormularioRecuperar() {
  const { estado, enviando, formulario, alEnviar } = useFormularioAccion(
    solicitarRecuperacion,
    ESTADO_INICIAL,
  );

  if (estado.ok) {
    return (
      <div className="flex flex-col gap-4">
        <Aviso tono="exito">{estado.mensaje}</Aviso>
        <Link href="/login" className="text-center text-sm font-medium underline">
          Volver a ingresar
        </Link>
      </div>
    );
  }

  return (
    <form ref={formulario} onSubmit={alEnviar} className="flex flex-col gap-4" noValidate>
      <Campo etiqueta="Correo" htmlFor="email" requerido error={estado.errores?.email}>
        <Entrada
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@negocio.co"
          aria-invalid={Boolean(estado.errores?.email)}
        />
      </Campo>

      {estado.mensaje ? <Aviso tono="error">{estado.mensaje}</Aviso> : null}

      <Boton type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar enlace"}
      </Boton>

      <Link href="/login" className="text-center text-xs font-medium text-muted-foreground underline">
        Volver a ingresar
      </Link>
    </form>
  );
}
