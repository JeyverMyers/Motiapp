"use client";

import Link from "next/link";

import { useFormularioAccion } from "@/components/app/use-formulario-accion";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { Campo, Entrada } from "@/components/ui/formulario";
import { iniciarSesion, type EstadoAuth } from "@/server/acciones/auth";

const ESTADO_INICIAL: EstadoAuth = {};

/**
 * `destino` es la página que se pidió sin sesión (lo agrega el proxy a la URL).
 * El servidor decide si la respeta: solo rutas internas del área del rol.
 */
export function FormularioIngreso({ destino }: { destino?: string }) {
  const { estado, enviando, formulario, alEnviar } = useFormularioAccion(
    iniciarSesion,
    ESTADO_INICIAL,
  );

  return (
    <form ref={formulario} onSubmit={alEnviar} className="flex flex-col gap-4" noValidate>
      {destino ? <input type="hidden" name="destino" value={destino} /> : null}

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

      <Campo etiqueta="Contraseña" htmlFor="password" requerido error={estado.errores?.password}>
        <Entrada
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(estado.errores?.password)}
        />
      </Campo>

      <div className="-mt-1 text-right">
        <Link
          href="/recuperar-password"
          className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {estado.mensaje ? <Aviso tono="error">{estado.mensaje}</Aviso> : null}

      <Boton type="submit" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Boton>

      <p className="text-center text-xs text-muted-foreground">
        ¿No tienes cuenta? Te la crea el administrador de MotiApp.
      </p>
    </form>
  );
}
