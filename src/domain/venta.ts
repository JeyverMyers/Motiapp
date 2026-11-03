/**
 * Ventas de motos (tabla `ventas`, migración 0003).
 *
 * Una fila por venta: precio publicado (el de la moto al momento de vender),
 * precio pactado (el que de verdad se cobró) y el comprador como cliente. El
 * descuento lo calcula la base (columna generada) y la ganancia se deriva del
 * precio pactado, la compra y los gastos de la moto (regla 2 del proyecto).
 */

import { z } from "zod";

import {
  cedulaSchema,
  fechaSchema,
  idSchema,
  montoDesdeTexto,
  telefonoSchema,
  textoOpcional,
  textoRequerido,
} from "./comun";
import { METODOS_PAGO } from "./enums";
import { resultadoDelPeriodo } from "./gasto";

const vacioComoIndefinido = (valor: unknown) =>
  typeof valor === "string" && valor.trim() === "" ? undefined : valor;

export const ESTADOS_VENTA = ["activa", "devuelta"] as const;
export type EstadoVenta = (typeof ESTADOS_VENTA)[number];

/* ------------------------------------------------------------------ */
/* Registro                                                            */
/* ------------------------------------------------------------------ */

/**
 * Lo que escribe el dueño al vender. El precio publicado NO viene del
 * formulario: el servidor lo toma de la moto, para que el descuento registrado
 * sea contra el precio que de verdad se anunció. El teléfono es obligatorio
 * porque el comprador queda en `clientes` y ahí lo es.
 */
export const registrarVentaSchema = z.object({
  motoId: idSchema,
  precioPactado: montoDesdeTexto({ campo: "El precio de venta", min: 1 }),
  fecha: fechaSchema,
  compradorNombre: textoRequerido({ max: 120, campo: "El nombre del comprador" }),
  compradorCedula: cedulaSchema,
  compradorTelefono: telefonoSchema,
  metodoPago: z.enum(METODOS_PAGO).default("efectivo"),
  observaciones: textoOpcional(500, "Las observaciones de la venta"),
});

export type RegistrarVentaInput = z.infer<typeof registrarVentaSchema>;

/** Devolución: la venta queda `devuelta` (no se borra) y la moto vuelve. */
export const devolverVentaSchema = z.object({ ventaId: idSchema });

/**
 * Descuento frente al precio publicado. Es la misma fórmula de la columna
 * generada `ventas.descuento_aplicado`; aquí sirve para mostrarlo antes de
 * guardar.
 */
export function descuentoAplicado(precioPublicado: number | null | undefined, precioPactado: number): number {
  return precioPublicado ? precioPublicado - precioPactado : 0;
}

/* ------------------------------------------------------------------ */
/* Períodos del reporte                                                */
/* ------------------------------------------------------------------ */

export const PERIODOS_VENTA = ["mes", "mes_anterior", "90_dias", "anio"] as const;
export type PeriodoVenta = (typeof PERIODOS_VENTA)[number];

export const ETIQUETA_PERIODO_VENTA: Record<PeriodoVenta, string> = {
  mes: "Este mes",
  mes_anterior: "Mes anterior",
  "90_dias": "Últimos 90 días",
  anio: "Este año",
};

function desplazar(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/**
 * Desde y hasta (inclusive) de un período, contado a partir de `hoy`
 * (AAAA-MM-DD en la zona del negocio). Se trabaja con texto y UTC para que el
 * resultado no dependa de la zona horaria del servidor.
 */
export function rangoDePeriodo(periodo: PeriodoVenta, hoy: string): { desde: string; hasta: string } {
  const anio = hoy.slice(0, 4);
  const inicioMes = `${hoy.slice(0, 7)}-01`;
  switch (periodo) {
    case "mes":
      return { desde: inicioMes, hasta: hoy };
    case "mes_anterior": {
      const finAnterior = desplazar(inicioMes, -1);
      return { desde: `${finAnterior.slice(0, 7)}-01`, hasta: finAnterior };
    }
    case "90_dias":
      return { desde: desplazar(hoy, -89), hasta: hoy };
    case "anio":
      return { desde: `${anio}-01-01`, hasta: hoy };
  }
}

/* ------------------------------------------------------------------ */
/* Historial                                                           */
/* ------------------------------------------------------------------ */

/** Filtros del historial de ventas, tal como llegan en la URL. */
export const filtrosVentasSchema = z.object({
  texto: textoOpcional(120, "El texto de búsqueda"),
  desde: z.preprocess(vacioComoIndefinido, fechaSchema.optional()),
  hasta: z.preprocess(vacioComoIndefinido, fechaSchema.optional()),
  metodoPago: z.preprocess(vacioComoIndefinido, z.enum(METODOS_PAGO).optional()),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(30),
});

export type FiltrosVentas = z.infer<typeof filtrosVentasSchema>;

/* ------------------------------------------------------------------ */
/* Reglas                                                              */
/* ------------------------------------------------------------------ */

/**
 * ¿La fecha de venta tiene sentido? No antes de comprar la moto ni en el
 * futuro. Devuelve el mensaje de error o `null` si está bien.
 */
export function problemaConFechaDeVenta(entrada: {
  fechaCompra: string;
  fechaVenta: string;
  hoy: string;
}): string | null {
  if (entrada.fechaVenta > entrada.hoy) return "La fecha de venta no puede estar en el futuro.";
  if (entrada.fechaVenta < entrada.fechaCompra) {
    return "La fecha de venta no puede ser anterior a la fecha en que se compró la moto.";
  }
  return null;
}

/** Sumas de un grupo de ventas, tal como salen de la base. */
export type TotalesVentas = {
  unidades: number;
  totalVendido: number;
  /** Lo que costaron esas motos al comprarlas. */
  costoDeVentas: number;
  /** Gastos asociados a esas motos (reparación, papeles…). */
  gastos: number;
};

/**
 * Ganancia de un grupo de ventas. Los gastos son los de cada moto vendida, no
 * los del período: así la ganancia de una venta no cambia según el mes en que
 * se pagó el repuesto. La fórmula es `resultadoDelPeriodo`, la misma del panel.
 */
export function resumenVentas(totales: TotalesVentas) {
  return { ...totales, ...resultadoDelPeriodo(totales) };
}
