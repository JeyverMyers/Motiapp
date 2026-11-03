/**
 * Reglas del panel de control: ventanas de tiempo y alertas.
 *
 * Las fechas son texto AAAA-MM-DD en la zona del negocio (`hoyISO()`); las
 * cuentas se hacen en UTC para que no dependan del reloj del servidor.
 */

import { DIAS_GRACIA_VENCIMIENTO } from "./empeno";
import { resultadoDelPeriodo } from "./gasto";

export const VENTANAS_DIAS = [7, 30, 90] as const;
export type VentanaDias = (typeof VENTANAS_DIAS)[number];

/** Una moto sin vender después de estos días es «stock estancado». */
export const DIAS_STOCK_ESTANCADO = 60;

export function esVentana(valor: unknown): valor is VentanaDias {
  return typeof valor === "string" && VENTANAS_DIAS.includes(Number(valor) as VentanaDias);
}

/** Días de `desde` a `hasta` (positivo si `hasta` es posterior). */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);
}

function desplazar(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/**
 * Primer día de una ventana de `dias` días que termina hoy (inclusive). Las
 * tarjetas y la gráfica usan este mismo corte: «7 días» son 7 puntos, no 8.
 */
export function inicioDeVentana(hoy: string, dias: VentanaDias): string {
  return desplazar(hoy, -(dias - 1));
}

/** Fecha de compra a partir de la cual una moto ya cuenta como estancada. */
export function corteStockEstancado(hoy: string): string {
  return desplazar(hoy, -DIAS_STOCK_ESTANCADO);
}

/**
 * Un empeño vencido: cuántos días lleva de atraso y si sigue dentro del plazo
 * de gracia (todavía puede pagar o renovar) o ya puede declararse perdido.
 * Manda la fecha límite guardada en el empeño; sin ella, la regla general de
 * `DIAS_GRACIA_VENCIMIENTO` días.
 */
export function atrasoDeEmpeno(
  fechaVencimiento: string,
  hoy: string,
  fechaLimiteGracia?: string,
): { diasAtraso: number; enGracia: boolean } {
  const diasAtraso = Math.max(0, diasEntre(fechaVencimiento, hoy));
  const enGracia = fechaLimiteGracia ? hoy <= fechaLimiteGracia : diasAtraso <= DIAS_GRACIA_VENCIMIENTO;
  return { diasAtraso, enGracia };
}

/**
 * Números de compra/venta del período.
 *
 * - La **ganancia de ventas** resta a cada moto vendida lo que costó y SUS
 *   gastos (la misma cuenta que el reporte de `/app/ventas`).
 * - Los **gastos operativos** son los generales de compra/venta del período
 *   (arriendo, nómina…: sin moto asociada).
 * - El **resultado** es la ganancia de ventas menos esos gastos.
 */
export function resultadoCompraVenta(entrada: {
  totalVendido: number;
  costoDeVentas: number;
  gastosDeVentas: number;
  gastosOperativos: number;
}) {
  const ventas = resultadoDelPeriodo({
    totalVendido: entrada.totalVendido,
    costoDeVentas: entrada.costoDeVentas,
    gastos: entrada.gastosDeVentas,
  });
  return {
    gananciaVentas: ventas.gananciaNeta,
    margenPorcentaje: ventas.margenPorcentaje,
    resultado: ventas.gananciaNeta - entrada.gastosOperativos,
  };
}
