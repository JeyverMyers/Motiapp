/**
 * Módulo Compra/Venta: motos que el negocio compra para revender.
 *
 * La ganancia NO se guarda: se deriva de los hechos (venta - compra - gastos)
 * para que corregir un precio corrija el reporte. Ver `gananciaDeMoto`.
 */

import { z } from "zod";
import {
  anoSchema,
  cedulaSchema,
  colorSchema,
  fechaSchema,
  idSchema,
  monto,
  montoDesdeTexto,
  placaSchema,
  textoOpcional,
  textoRequerido,
  timestampSchema,
} from "./comun";
import { ESTADOS_MOTO, METODOS_PAGO, type EstadoMoto } from "./enums";

export const estadoMotoSchema = z.enum(ESTADOS_MOTO);
export const metodoPagoSchema = z.enum(METODOS_PAGO);

/* ------------------------------------------------------------------ */
/* Entidad                                                             */
/* ------------------------------------------------------------------ */

export const motoSchema = z.object({
  id: idSchema,
  tenantId: idSchema,

  // Identificación del vehículo
  placa: placaSchema,
  marca: textoRequerido({ max: 50, campo: "La marca" }),
  modelo: textoRequerido({ max: 80, campo: "El modelo" }),
  anio: anoSchema,
  color: colorSchema,
  cilindraje: z.number().int().positive().max(3000).optional(),
  numeroMotor: textoOpcional(40, "El número de motor"),
  numeroChasis: textoOpcional(40, "El número de chasis"),

  // Compra
  precioCompra: monto({ campo: "El precio de compra", min: 1 }),
  fechaCompra: fechaSchema,
  proveedorNombre: textoOpcional(120, "El nombre del proveedor"),
  proveedorCedula: cedulaSchema.optional(),
  proveedorTelefono: textoOpcional(20, "El teléfono del proveedor"),

  // Precio al que se ofrece. La venta real vive en `ventas` (domain/venta.ts).
  precioPublicado: monto({ campo: "El precio publicado", min: 1 }).optional(),

  estado: estadoMotoSchema,
  descripcion: textoOpcional(1000, "La descripción"),
  creadoEn: timestampSchema,
  actualizadoEn: timestampSchema,
});

/** Un campo vacío de formulario llega como "": para un opcional, es «no enviado». */
const vacioComoIndefinido = (valor: unknown) =>
  typeof valor === "string" && valor.trim() === "" ? undefined : valor;

/**
 * Estados con los que puede ENTRAR una moto al inventario. `vendida` no está:
 * exige una fila en `ventas`, y para eso existe el registro de venta.
 */
export const ESTADOS_INICIALES_MOTO = ["disponible", "reservada", "en_reparacion"] as const;

/** Campos de la moto que el dueño escribe, comunes a alta y edición. */
const datosMoto = {
  placa: placaSchema,
  marca: textoRequerido({ max: 50, campo: "La marca" }),
  modelo: textoRequerido({ max: 80, campo: "El modelo" }),
  anio: anoSchema,
  color: colorSchema,
  // Sin el preprocess, un cilindraje vacío se volvía 0 y fallaba `positive()`.
  cilindraje: z.preprocess(
    vacioComoIndefinido,
    z.coerce.number().int("El cilindraje va en números enteros").positive().max(3000).optional(),
  ),
  numeroMotor: textoOpcional(40, "El número de motor"),
  numeroChasis: textoOpcional(40, "El número de chasis"),
  precioCompra: montoDesdeTexto({ campo: "El precio de compra", min: 1 }),
  fechaCompra: fechaSchema,
  // Opcional: una moto recién comprada puede no tener precio todavía.
  precioPublicado: z.preprocess(
    vacioComoIndefinido,
    montoDesdeTexto({ campo: "El precio publicado", min: 1 }).optional(),
  ),
  proveedorNombre: textoOpcional(120, "El nombre del proveedor"),
  // Sin el preprocess, una cédula vacía fallaba la validación de 5 a 12 dígitos.
  proveedorCedula: z.preprocess(vacioComoIndefinido, cedulaSchema.optional()),
  proveedorTelefono: textoOpcional(20, "El teléfono del proveedor"),
  descripcion: textoOpcional(1000, "La descripción"),
};

/**
 * Datos del formulario de registro. La placa es única por tenant: eso lo
 * garantiza un índice en la base, no esta validación.
 */
export const crearMotoSchema = z.object({
  ...datosMoto,
  estado: z.enum(ESTADOS_INICIALES_MOTO).default("disponible"),
});

/**
 * Edición. No toca el estado: cambiar de estado tiene reglas propias
 * (`TRANSICIONES_MOTO`) y la venta su propio registro.
 */
export const editarMotoSchema = z.object({ motoId: idSchema, ...datosMoto });

/**
 * Cambios de estado permitidos a mano.
 *
 * - `vendida` no aparece como destino: solo se llega registrando la venta, que
 *   crea la fila en `ventas`.
 * - Una moto vendida no se mueve desde aquí: su historia es la de la venta.
 * - `devuelta` (el comprador la regresó) vuelve al inventario como disponible.
 * - `dada_de_baja` (chatarrizada, robada, sin papeles) se puede revertir.
 * - No hay estado «empeñada»: la moto del negocio no se empeña, y los bienes
 *   empeñados viven en `vehiculos_empeno` (regla 3 del proyecto).
 */
export const TRANSICIONES_MOTO: Record<EstadoMoto, readonly EstadoMoto[]> = {
  disponible: ["reservada", "en_reparacion", "dada_de_baja"],
  reservada: ["disponible", "en_reparacion", "dada_de_baja"],
  en_reparacion: ["disponible", "reservada", "dada_de_baja"],
  vendida: [],
  devuelta: ["disponible", "en_reparacion", "dada_de_baja"],
  dada_de_baja: ["disponible"],
};

export function puedeCambiarEstado(desde: EstadoMoto, hacia: EstadoMoto): boolean {
  return TRANSICIONES_MOTO[desde].includes(hacia);
}

export const cambiarEstadoMotoSchema = z.object({
  motoId: idSchema,
  estado: estadoMotoSchema,
});

export const eliminarMotoSchema = z.object({ motoId: idSchema });

/** Una moto vendida no se borra: desaparecería de la ganancia histórica. */
export function puedeEliminarse(estado: EstadoMoto): boolean {
  return estado !== "vendida";
}

/** Columnas por las que se puede ordenar el inventario (lista blanca). */
export const ORDENES_INVENTARIO = ["fechaCompra", "precioCompra", "placa", "marca", "anio"] as const;
export type OrdenInventario = (typeof ORDENES_INVENTARIO)[number];

/**
 * Filtros del buscador de inventario, tal como llegan en la URL. Todos
 * opcionales y combinables; un filtro vacío ("") es «sin filtro», no un error.
 */
export const filtrosInventarioSchema = z.object({
  texto: textoOpcional(120, "El texto de búsqueda"),
  placa: z.preprocess(vacioComoIndefinido, placaSchema.optional()),
  nombreDueno: textoOpcional(120, "El nombre del dueño"),
  cedula: z.preprocess(vacioComoIndefinido, cedulaSchema.optional()),
  marca: textoOpcional(50, "La marca"),
  modelo: textoOpcional(80, "El modelo"),
  estado: z.preprocess(vacioComoIndefinido, estadoMotoSchema.optional()),
  desde: z.preprocess(vacioComoIndefinido, fechaSchema.optional()),
  hasta: z.preprocess(vacioComoIndefinido, fechaSchema.optional()),
  orden: z.preprocess(vacioComoIndefinido, z.enum(ORDENES_INVENTARIO).default("fechaCompra")),
  dir: z.preprocess(vacioComoIndefinido, z.enum(["asc", "desc"]).default("desc")),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

export type Moto = z.infer<typeof motoSchema>;
export type CrearMotoInput = z.infer<typeof crearMotoSchema>;
export type EditarMotoInput = z.infer<typeof editarMotoSchema>;
export type FiltrosInventario = z.infer<typeof filtrosInventarioSchema>;

/* ------------------------------------------------------------------ */
/* Reglas de negocio derivadas                                         */
/* ------------------------------------------------------------------ */

/**
 * Precios para calcular la ganancia. `precioVenta` es el precio PACTADO de la
 * venta (`ventas.precio_pactado`), no el publicado.
 */
export type PreciosDeMoto = { precioCompra: number; precioVenta?: number | null };

/**
 * Ganancia bruta de la moto: precio de venta menos precio de compra.
 * Devuelve `null` si todavía no se vendió, para no confundir "0" con "sin venta".
 */
export function gananciaBruta(moto: PreciosDeMoto): number | null {
  if (moto.precioVenta === undefined || moto.precioVenta === null) return null;
  return moto.precioVenta - moto.precioCompra;
}

/**
 * Ganancia neta de la moto: venta menos compra menos los gastos asociados.
 * `gastosAsociados` sale de sumar `gastos` con `moto_id` = esta moto.
 */
export function gananciaDeMoto(
  moto: PreciosDeMoto,
  gastosAsociados = 0,
): number | null {
  const bruta = gananciaBruta(moto);
  return bruta === null ? null : bruta - gastosAsociados;
}

/** Margen sobre el precio de venta, en porcentaje. `null` si no hay venta. */
export function margenDeMoto(
  moto: PreciosDeMoto,
  gastosAsociados = 0,
): number | null {
  const ganancia = gananciaDeMoto(moto, gastosAsociados);
  if (ganancia === null || !moto.precioVenta) return null;
  return (ganancia / moto.precioVenta) * 100;
}

/** Días que la moto lleva en inventario; si se vendió, hasta la venta. */
export function diasEnInventario(
  moto: { fechaCompra: string; fechaVenta?: string | null },
  hoy: Date = new Date(),
): number {
  const inicio = new Date(moto.fechaCompra);
  const fin = moto.fechaVenta ? new Date(moto.fechaVenta) : hoy;
  return Math.max(0, Math.floor((fin.getTime() - inicio.getTime()) / 86_400_000));
}
