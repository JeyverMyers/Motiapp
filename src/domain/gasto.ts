/**
 * Gastos del negocio.
 *
 * Un gasto cuelga de un módulo (compra/venta o empeño) para que un reporte no
 * mezcle el arreglo de una moto del inventario con el trámite de un empeño. Si
 * además cuelga de una moto, baja la ganancia de ESA moto; si es general, baja
 * la del período.
 */

import { z } from "zod";

import { fechaSchema, idSchema, montoDesdeTexto, textoOpcional } from "./comun";
import { CATEGORIAS_GASTO, MODULOS } from "./enums";

const vacioComoIndefinido = (valor: unknown) => (valor === "" ? undefined : valor);

export const crearGastoSchema = z
  .object({
    modulo: z.enum(MODULOS, { error: "Elige a qué módulo pertenece el gasto" }),
    motoId: z.preprocess(vacioComoIndefinido, idSchema.optional()),
    empenoId: z.preprocess(vacioComoIndefinido, idSchema.optional()),
    monto: montoDesdeTexto({ campo: "El monto", min: 1 }),
    fecha: fechaSchema,
    categoria: z.enum(CATEGORIAS_GASTO, { error: "Elige una categoría" }),
    descripcion: textoOpcional(300, "La descripción"),
  })
  .superRefine((gasto, contexto) => {
    if (gasto.motoId && gasto.empenoId) {
      contexto.addIssue({
        code: "custom",
        path: ["modulo"],
        message: "Un gasto es de una moto o de un empeño, no de los dos.",
      });
    }
    if (gasto.motoId && gasto.modulo !== "compra_venta") {
      contexto.addIssue({
        code: "custom",
        path: ["modulo"],
        message: "El gasto de una moto del inventario va en Compra/Venta.",
      });
    }
    if (gasto.empenoId && gasto.modulo !== "empeno") {
      contexto.addIssue({
        code: "custom",
        path: ["modulo"],
        message: "El gasto de un empeño va en el módulo de Empeño.",
      });
    }
  });

export const filtrosGastoSchema = z.object({
  modulo: z.preprocess(vacioComoIndefinido, z.enum(MODULOS).optional()),
  categoria: z.preprocess(vacioComoIndefinido, z.enum(CATEGORIAS_GASTO).optional()),
  desde: z.preprocess(vacioComoIndefinido, fechaSchema.optional()),
  hasta: z.preprocess(vacioComoIndefinido, fechaSchema.optional()),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(30),
});

export const eliminarGastoSchema = z.object({ gastoId: idSchema });

export type CrearGastoInput = z.infer<typeof crearGastoSchema>;
export type FiltrosGasto = z.infer<typeof filtrosGastoSchema>;

/**
 * Resultado de compra/venta en un período.
 *
 * Es la única fórmula de ganancia del período: el panel y los reportes la usan
 * en vez de restar por su cuenta, para que no puedan dar números distintos. Los
 * gastos entran completos, generales y de cada moto, porque todos salieron de
 * la caja en el período.
 */
export function resultadoDelPeriodo(entrada: {
  totalVendido: number;
  costoDeVentas: number;
  gastos: number;
}): { gananciaBruta: number; gananciaNeta: number; margenPorcentaje: number } {
  const gananciaBruta = entrada.totalVendido - entrada.costoDeVentas;
  const gananciaNeta = gananciaBruta - entrada.gastos;
  return {
    gananciaBruta,
    gananciaNeta,
    margenPorcentaje: entrada.totalVendido > 0 ? (gananciaNeta / entrada.totalVendido) * 100 : 0,
  };
}
