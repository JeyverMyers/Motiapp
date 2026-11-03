"use client";

import Link from "next/link";

import { useFormularioAccion } from "@/components/app/use-formulario-accion";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { Campo, Entrada } from "@/components/ui/formulario";
import { restablecerPassword, type EstadoAuth } from "@/server/acciones/auth";

const ESTADO_INICIAL: EstadoAuth = {};

export function FormularioRestablecer({ token }: { token: string }) {
  const { estado, enviando, formulario, alEnviar } = useFormularioAccion(
    restablecerPassword,
    ESTADO_INICIAL,
  );

  return (
    <form ref={formulario} onSubmit={alEnviar} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />

      <Campo
        etiqueta="Contraseña nueva"
        htmlFor="password"
        requerido
        ayuda="Al menos 8 caracteres"
        error={estado.errores?.password}
      >
        <Entrada
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(estado.errores?.password)}
        />
      </Campo>

      <Campo etiqueta="Repítela" htmlFor="confirmacion" requerido error={estado.errores?.confirmacion}>
        <Entrada
          id="confirmacion"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(estado.errores?.confirmacion)}
        />
      </Campo>

      {estado.errores?.token ? <Aviso tono="error">{estado.errores.token}</Aviso> : null}
      {estado.mensaje ? (
        <Aviso tono="error">
          {estado.mensaje}{" "}
          <Link href="/recuperar-password" className="underline">
            Pedir otro enlace
          </Link>
        </Aviso>
      ) : null}

      <Boton type="submit" disabled={enviando}>
        {enviando ? "Guardando…" : "Guardar contraseña"}
      </Boton>
    </form>
  );
}
