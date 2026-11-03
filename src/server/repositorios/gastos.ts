/**
 * Gastos.
 *
 * El `tenant_id` del gasto sale de la sesión, y la moto o el empeño al que se
 * asocia se busca dentro de la misma transacción con RLS: un id de otro negocio
 * simplemente no aparece, así que no se puede colgar un gasto de algo ajeno.
 */

import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";

import { conTenant } from "@/db";
import { empenos, gastos, motos } from "@/db/schema";
import { ErrorNegocio } from "@/domain/errores";
import type { CrearGastoInput, FiltrosGasto } from "@/domain/gasto";
import { hoyISO } from "@/lib/fechas";

export type GastoListado = {
  id: string;
  modulo: string;
  categoria: string;
  monto: number;
  fecha: string;
  descripcion: string | null;
  motoId: string | null;
  motoPlaca: string | null;
  empenoId: string | null;
  empenoNumero: string | null;
};

const columnasListado = {
  id: gastos.id,
  modulo: gastos.modulo,
  categoria: gastos.categoria,
  monto: gastos.monto,
  fecha: gastos.fecha,
  descripcion: gastos.descripcion,
  motoId: gastos.motoId,
  motoPlaca: motos.placa,
  empenoId: gastos.empenoId,
  empenoNumero: empenos.numero,
};

export async function listarGastos(
  tenantId: string,
  filtros: FiltrosGasto,
): Promise<{ filas: GastoListado[]; total: number; suma: number }> {
  return conTenant(tenantId, async (tx) => {
    const donde = and(
      filtros.modulo ? eq(gastos.modulo, filtros.modulo) : undefined,
      filtros.categoria ? eq(gastos.categoria, filtros.categoria) : undefined,
      filtros.desde ? gte(gastos.fecha, filtros.desde) : undefined,
      filtros.hasta ? lte(gastos.fecha, filtros.hasta) : undefined,
    );

    const filas = await tx
      .select(columnasListado)
      .from(gastos)
      .leftJoin(motos, eq(motos.id, gastos.motoId))
      .leftJoin(empenos, eq(empenos.id, gastos.empenoId))
      .where(donde)
      .orderBy(desc(gastos.fecha), desc(gastos.creadoEn))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina);

    // El total del filtro completo, no solo de la página: es el número que el
    // dueño quiere ver («¿cuánto gasté en reparaciones este mes?»).
    const [totales] = await tx
      .select({
        total: count(),
        suma: sql<number>`coalesce(sum(${gastos.monto}), 0)::bigint`,
      })
      .from(gastos)
      .where(donde);

    return {
      filas: filas.map((fila) => ({ ...fila, monto: Number(fila.monto) })),
      total: Number(totales?.total ?? 0),
      suma: Number(totales?.suma ?? 0),
    };
  });
}

/** Gastos de una moto o de un empeño, para su ficha. */
export async function gastosDe(
  tenantId: string,
  referencia: { motoId: string } | { empenoId: string },
): Promise<{ filas: GastoListado[]; suma: number }> {
  return conTenant(tenantId, async (tx) => {
    const condicion =
      "motoId" in referencia
        ? eq(gastos.motoId, referencia.motoId)
        : eq(gastos.empenoId, referencia.empenoId);

    const filas = await tx
      .select(columnasListado)
      .from(gastos)
      .leftJoin(motos, eq(motos.id, gastos.motoId))
      .leftJoin(empenos, eq(empenos.id, gastos.empenoId))
      .where(condicion)
      .orderBy(desc(gastos.fecha), desc(gastos.creadoEn));

    const lista = filas.map((fila) => ({ ...fila, monto: Number(fila.monto) }));
    return { filas: lista, suma: lista.reduce((total, fila) => total + fila.monto, 0) };
  });
}

export async function crearGasto(tenantId: string, datos: CrearGastoInput) {
  return conTenant(tenantId, async (tx) => {
    if (datos.fecha > hoyISO()) {
      throw new ErrorNegocio("La fecha del gasto no puede estar en el futuro.");
    }

    if (datos.motoId) {
      const [moto] = await tx
        .select({ id: motos.id })
        .from(motos)
        .where(eq(motos.id, datos.motoId))
        .limit(1);
      if (!moto) throw new ErrorNegocio("La moto no existe en este negocio.");
    }

    if (datos.empenoId) {
      const [empeno] = await tx
        .select({ id: empenos.id })
        .from(empenos)
        .where(eq(empenos.id, datos.empenoId))
        .limit(1);
      if (!empeno) throw new ErrorNegocio("El empeño no existe en este negocio.");
    }

    const [fila] = await tx
      .insert(gastos)
      .values({
        tenantId,
        modulo: datos.modulo,
        motoId: datos.motoId ?? null,
        empenoId: datos.empenoId ?? null,
        monto: datos.monto,
        fecha: datos.fecha,
        categoria: datos.categoria,
        descripcion: datos.descripcion,
      })
      .returning({ id: gastos.id, motoId: gastos.motoId, empenoId: gastos.empenoId });

    return fila ?? null;
  });
}

/**
 * Borra un gasto mal registrado. Devuelve a qué colgaba, para revalidar su
 * ficha; `null` si no existe (o es de otro negocio, que para RLS es lo mismo).
 */
export async function eliminarGasto(tenantId: string, gastoId: string) {
  return conTenant(tenantId, async (tx) => {
    const [fila] = await tx
      .delete(gastos)
      .where(eq(gastos.id, gastoId))
      .returning({ motoId: gastos.motoId, empenoId: gastos.empenoId });
    return fila ?? null;
  });
}
