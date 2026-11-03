"use client";

import { Check, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { useFormularioAccion } from "@/components/app/use-formulario-accion";
import { AreaTexto, Campo, Entrada } from "@/components/ui/formulario";
import { CAMPO_TRAMPA } from "@/domain/solicitud-demo";
import {
  enviarSolicitudDemo,
  type EstadoFormulario,
} from "@/server/acciones/solicitud-demo";

import { BOTON_LLENO } from "./estilos";

const ESTADO_INICIAL: EstadoFormulario = { ok: false };

/** Campos con el lenguaje Slush: píldora blanca con borde negro. */
const CAMPO = "h-12 rounded-full border-carbon bg-paper-white px-5 font-ui font-medium";

/**
 * Formulario de solicitud de demo. La lógica es la de antes
 * (`enviarSolicitudDemo`, validada con Zod en el servidor); cambia el estilo y
 * que ya no se vacía cuando hay un error de validación (`useFormularioAccion`).
 */
export function FormularioDemo() {
  const { estado, enviando, formulario, alEnviar } = useFormularioAccion(
    enviarSolicitudDemo,
    ESTADO_INICIAL,
  );

  if (estado.ok) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-tarjeta border border-carbon bg-mint-pop p-5">
        <CheckCircle2 className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
        <div className="font-ui">
          <p className="text-lg font-bold">Recibimos tu solicitud.</p>
          <p className="mt-1 text-[15px] font-medium">
            Te contactamos al teléfono que dejaste para agendar la demo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form ref={formulario} onSubmit={alEnviar} className="flex flex-col gap-5 font-ui" noValidate>
      {/* Trampa anti-robots: fuera de pantalla, sin tabulación y sin autocompletar. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Sitio web
          <input type="text" name={CAMPO_TRAMPA} tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Tu nombre" htmlFor="nombre" requerido error={estado.errores?.nombre}>
          <Entrada
            id="nombre"
            name="nombre"
            autoComplete="name"
            placeholder="Juan Pérez"
            aria-invalid={Boolean(estado.errores?.nombre)}
            className={CAMPO}
          />
        </Campo>

        <Campo etiqueta="Nombre del negocio" htmlFor="negocio" requerido error={estado.errores?.negocio}>
          <Entrada
            id="negocio"
            name="negocio"
            placeholder="Motos El Retiro"
            aria-invalid={Boolean(estado.errores?.negocio)}
            className={CAMPO}
          />
        </Campo>

        <Campo
          etiqueta="Teléfono (celular)"
          htmlFor="telefono"
          requerido
          ayuda="10 dígitos, por ejemplo 3001234567"
          error={estado.errores?.telefono}
        >
          <Entrada
            id="telefono"
            name="telefono"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="3001234567"
            aria-invalid={Boolean(estado.errores?.telefono)}
            className={CAMPO}
          />
        </Campo>

        <Campo etiqueta="Correo" htmlFor="email" ayuda="Opcional" error={estado.errores?.email}>
          <Entrada
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="juan@motoselretiro.co"
            aria-invalid={Boolean(estado.errores?.email)}
            className={CAMPO}
          />
        </Campo>

        <Campo etiqueta="Ciudad" htmlFor="ciudad" ayuda="Opcional" error={estado.errores?.ciudad} className="sm:col-span-2">
          <Entrada id="ciudad" name="ciudad" placeholder="Medellín" className={CAMPO} />
        </Campo>

        <Campo
          etiqueta="¿Qué quieres resolver?"
          htmlFor="mensaje"
          ayuda="Opcional"
          error={estado.errores?.mensaje}
          className="sm:col-span-2"
        >
          <AreaTexto
            id="mensaje"
            name="mensaje"
            placeholder="Hoy llevo el inventario en un cuaderno y se me pierden los vencimientos de los empeños."
            className="min-h-28 rounded-tarjeta border-carbon bg-paper-white px-5 py-3 font-ui font-medium"
          />
        </Campo>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Autorizaciones</legend>
        <Casilla
          name="aceptaTratamientoDatos"
          error={estado.errores?.aceptaTratamientoDatos}
          requerida
        >
          Acepto la{" "}
          <Link href="/privacidad" target="_blank" className="font-bold underline underline-offset-2">
            política de tratamiento de datos personales
          </Link>
          .
        </Casilla>
        <Casilla name="aceptaComunicaciones">Acepto recibir comunicaciones comerciales.</Casilla>
        <p className="text-[13px] leading-[1.5] font-medium text-carbon/70">
          Usamos tus datos solo para contactarte por esta solicitud y, si lo autorizas, para enviarte novedades.
          Puedes pedir que los borremos cuando quieras. Lee los{" "}
          <Link href="/terminos" target="_blank" className="underline underline-offset-2">
            términos
          </Link>
          .
        </p>
      </fieldset>

      {estado.mensaje ? (
        <p role="alert" className="text-sm font-bold text-destructive">
          {estado.mensaje}
        </p>
      ) : null}

      <button type="submit" disabled={enviando} className={`${BOTON_LLENO} w-full disabled:opacity-60 sm:w-auto sm:self-start`}>
        {enviando ? "Enviando…" : "Solicitar demo"}
      </button>
    </form>
  );
}

/**
 * Casilla de autorización con el lenguaje de la landing: cuadro con borde
 * negro que se llena de carbón al marcarse. El input nativo sigue ahí (solo
 * visualmente oculto), así que teclado, lector de pantalla y `FormData`
 * funcionan sin JavaScript extra.
 */
function Casilla({
  name,
  error,
  requerida = false,
  children,
}: {
  name: string;
  error?: string;
  requerida?: boolean;
  children: React.ReactNode;
}) {
  const idError = error ? `${name}-error` : undefined;
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-[1.45] font-medium">
        <input
          type="checkbox"
          name={name}
          required={requerida}
          aria-invalid={Boolean(error)}
          aria-describedby={idError}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-[5px] border border-carbon bg-paper-white text-paper-white transition-colors duration-150 peer-checked:bg-carbon peer-focus-visible:ring-[3px] peer-focus-visible:ring-carbon/30 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
        >
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        <span>
          {children}
          {requerida ? <span className="sr-only"> (obligatoria)</span> : null}
        </span>
      </label>
      {error ? (
        <p id={idError} role="alert" className="mt-1.5 pl-8 text-sm font-bold text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
