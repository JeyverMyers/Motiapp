/**
 * Piezas compartidas por las Server Actions.
 *
 * Este archivo NO lleva "use server": en Next, todo lo que exporta un archivo con
 * esa directiva tiene que ser una acción asíncrona, y aquí hay un tipo y
 * funciones síncronas.
 */

import { ErrorNegocio } from "@/domain/errores";
import { tieneModulo, type ModuloNegocio } from "@/domain/negocio";
import { ErrorAutorizacion, requerirDueno } from "@/server/auth/sesion";

/** Lo que devuelve una acción a `useActionState`. */
export type EstadoAccion = {
  ok?: boolean;
  mensaje?: string;
  errores?: Record<string, string>;
};

/** Convierte los errores de Zod en un mapa campo → primer mensaje. */
export function erroresDeZod(
  problemas: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const problema of problemas) {
    // Último segmento de texto: el formulario es plano aunque el esquema anide
    // (`vehiculo.placa`, `otro.descripcion`), y el campo se llama como la hoja.
    const campo = problema.path.findLast((segmento) => typeof segmento === "string");
    if (typeof campo === "string" && !(campo in errores)) {
      errores[campo] = problema.message;
    }
  }
  return errores;
}

/**
 * Resuelve el negocio de la sesión o devuelve el estado de error listo para la
 * acción. El `tenantId` sale de la sesión firmada, nunca del formulario.
 *
 * Con `modulo`, además exige que el plan del negocio lo incluya: el plan se
 * aplica aquí, en el servidor, y no solo escondiendo el enlace del menú.
 */
export async function tenantDeLaSesion(modulo?: ModuloNegocio): Promise<
  { tenantId: string; error?: undefined } | { tenantId?: undefined; error: EstadoAccion }
> {
  try {
    const sesion = await requerirDueno();
    if (modulo && !tieneModulo(sesion.plan, modulo)) {
      return { error: { mensaje: "Tu plan no incluye este módulo. Habla con el administrador para cambiarlo." } };
    }
    return { tenantId: sesion.tenantId };
  } catch (error) {
    if (error instanceof ErrorAutorizacion) return { error: { mensaje: error.message } };
    throw error;
  }
}

/**
 * Traduce un error a un mensaje para el dueño, o lo registra y devuelve uno
 * genérico. `traducirBaseDeDatos` permite a cada módulo nombrar sus propias
 * restricciones únicas.
 */
export function mensajeDeError(
  error: unknown,
  contexto: { accion: string; generico: string },
  traducirBaseDeDatos?: (error: unknown) => string | null,
): string {
  if (error instanceof ErrorNegocio) return error.message;

  // Drizzle envuelve el error de Postgres («Failed query: …») y deja el original
  // —el que trae `code` y `constraint`— en `cause`. Se prueba cada eslabón.
  for (let eslabon: unknown = error; eslabon; eslabon = (eslabon as { cause?: unknown }).cause) {
    const traducido = traducirBaseDeDatos?.(eslabon);
    if (traducido) return traducido;
    if (typeof eslabon !== "object") break;
  }

  console.error(`[${contexto.accion}] error inesperado`, error);
  return contexto.generico;
}
