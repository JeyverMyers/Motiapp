import { ZONA_HORARIA } from "./constantes";

/**
 * Fecha de hoy (AAAA-MM-DD) en la zona horaria del negocio.
 *
 * `new Date().toISOString().slice(0, 10)` da la fecha en UTC: en Colombia, desde
 * las 7 de la noche ya es "mañana", y un empeño que vence hoy aparecería vencido.
 * `en-CA` se usa solo porque su formato de fecha es justamente AAAA-MM-DD.
 */
export function hoyISO(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

/** Hoy como `Date` a medianoche UTC, que es como el dominio compara días. */
export function hoyComoFecha(ahora: Date = new Date()): Date {
  return new Date(`${hoyISO(ahora)}T00:00:00Z`);
}
