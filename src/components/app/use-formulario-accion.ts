"use client";

import { useActionState, useEffect, useRef, startTransition, type FormEvent } from "react";

import type { EstadoAccion } from "@/server/acciones/comun";

/** Cualquier estado que diga si la acción salió bien. */
type EstadoConOk = { ok?: boolean };

const ESTADO_INICIAL: EstadoAccion = {};

/**
 * Conecta un formulario a una Server Action sin perder lo escrito.
 *
 * ## Por qué no `<form action={accion}>`
 *
 * En React 19, un formulario con `action` se vacía solo cuando la acción
 * termina, aunque haya devuelto errores de validación. En el mostrador eso
 * significa volver a escribir 20 campos por una cédula mal puesta.
 *
 * Aquí el envío va por `onSubmit` dentro de una transición, que no vacía nada, y
 * el formulario se limpia solo cuando la acción responde `ok`. Limpiarlo tras un
 * abono exitoso importa: evita registrar dos veces el mismo pago.
 */
export function useFormularioAccion<E extends EstadoConOk = EstadoAccion>(
  accion: (estadoPrevio: E, formData: FormData) => Promise<E>,
  estadoInicial: E = ESTADO_INICIAL as E,
) {
  // Los estados de las acciones son objetos planos, nunca promesas: `Awaited<E>`
  // es `E`, pero TypeScript no puede probarlo para un genérico.
  const [estado, despachar, enviando] = useActionState<E, FormData>(
    accion,
    estadoInicial as Awaited<E>,
  );
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formulario.current?.reset();
  }, [estado]);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    startTransition(() => despachar(datos));
  }

  return { estado, enviando, formulario, alEnviar };
}
