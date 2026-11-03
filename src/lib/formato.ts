/** Formateo de montos, fechas y documentos para mostrar al usuario. */

import { LOCALE, MONEDA } from "./constantes";

const formateadorMoneda = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: MONEDA,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** `1500000` → `"$ 1.500.000"`. */
export function formatearMoneda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return formateadorMoneda.format(valor).replace(/\u00a0/g, " ");
}

/** Igual que `formatearMoneda` pero sin el símbolo, para tablas estrechas. */
export function formatearNumero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return new Intl.NumberFormat(LOCALE).format(valor);
}

/** `12.5` → `"12,5 %"`. */
export function formatearPorcentaje(valor: number | null | undefined, decimales = 1): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return `${new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor)} %`;
}

/**
 * Acepta `Date`, ISO con hora (`2026-10-15T10:00:00Z`) o fecha simple
 * (`2026-10-15`). Las fechas simples se interpretan en hora local y no en UTC,
 * para que no se corran un día.
 */
function aFecha(valor: Date | string): Date {
  if (valor instanceof Date) return valor;
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return new Date(`${valor}T00:00:00`);
  return new Date(valor);
}

/** `"15 oct 2026"`. */
export function formatearFecha(valor: Date | string | null | undefined): string {
  if (!valor) return "—";
  const fecha = aFecha(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(fecha);
}

/** `"15 oct 2026, 10:30"`. */
export function formatearFechaHora(valor: Date | string | null | undefined): string {
  if (!valor) return "—";
  const fecha = aFecha(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

/** `"hace 3 días"`, `"en 5 días"`. */
export function formatearDiasRelativos(dias: number): string {
  if (dias === 0) return "hoy";
  const absoluto = Math.abs(dias);
  const unidad =
    absoluto === 1 ? "día" : absoluto < 30 ? "días" : absoluto < 365 ? "meses" : "años";
  const cantidad =
    absoluto < 30 ? absoluto : absoluto < 365 ? Math.round(absoluto / 30) : Math.round(absoluto / 365);
  return dias > 0 ? `en ${cantidad} ${unidad}` : `hace ${cantidad} ${unidad}`;
}

/** `"ABC12D"` → `"ABC 12D"` para lectura, sin alterar el valor guardado. */
export function formatearPlaca(placa: string): string {
  return placa.length === 6 ? `${placa.slice(0, 3)} ${placa.slice(3)}` : placa;
}

/** `"3001234567"` → `"300 123 4567"`. */
export function formatearTelefono(telefono: string | null | undefined): string {
  if (!telefono) return "—";
  const limpio = telefono.replace(/[^\d]/g, "");
  if (limpio.length !== 10) return telefono;
  return `${limpio.slice(0, 3)} ${limpio.slice(3, 6)} ${limpio.slice(6)}`;
}

/** `1234567` → `"1.234.567"`. La cédula se muestra sin puntos por convención. */
export function formatearCedula(cedula: string | null | undefined): string {
  return cedula ?? "—";
}

/** Iniciales para avatares: `"Juan Pérez"` → `"JP"`. */
export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}
