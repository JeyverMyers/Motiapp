/**
 * Inventario de motos (módulo Compra/Venta).
 *
 * Toda función recibe el `tenantId` ya resuelto desde la sesión y envuelve su
 * trabajo en `conTenant`, que es lo que activa las políticas RLS. Ninguna
 * consulta filtra por `tenant_id` a mano: si lo hiciéramos, el día que alguien
 * olvide el filtro habría una fuga. RLS es la red, no el filtro.
 *
 * Borrado lógico (migración 0002): una moto con `eliminada_en` no aparece en
 * ninguna consulta de este archivo. `noEliminada` es la condición; cualquier
 * consulta nueva sobre `motos` debe incluirla.
 */

import { and, asc, count, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";

import { conTenant } from "@/db";
import { clientes, gastos, motos, ventas } from "@/db/schema";
import type { EstadoMoto } from "@/domain/enums";
import { ErrorNegocio } from "@/domain/errores";
import {
  puedeCambiarEstado,
  puedeEliminarse,
  type CrearMotoInput,
  type EditarMotoInput,
  type FiltrosInventario,
  type OrdenInventario,
} from "@/domain/moto";

export type MotoListada = {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  estado: string;
  precioCompra: number;
  precioPublicado: number | null;
  /** Precio pactado de la venta activa (tabla `ventas`). */
  precioVenta: number | null;
  fechaCompra: string;
  fechaVenta: string | null;
  proveedorNombre: string | null;
  proveedorCedula: string | null;
  compradorNombre: string | null;
  compradorCedula: string | null;
  /** Suma de gastos asociados a esta moto. */
  gastosAsociados: number;
};

const noEliminada = isNull(motos.eliminadaEn);

/** Lista blanca de columnas ordenables: la URL nunca llega cruda al ORDER BY. */
const COLUMNA_ORDEN = {
  fechaCompra: motos.fechaCompra,
  precioCompra: motos.precioCompra,
  placa: motos.placa,
  marca: motos.marca,
  anio: motos.anio,
} satisfies Record<OrdenInventario, unknown>;

/**
 * Buscador del inventario: placa, marca, modelo, cédula o nombre del dueño
 * anterior (el proveedor) o del comprador, estado y fechas, todos combinables.
 *
 * El "dueño" cambia según el estado: mientras la moto está en inventario el
 * dueño es el proveedor que la vendió; una vez vendida, el comprador. Por eso el
 * buscador mira las dos columnas.
 */
export async function buscarInventario(
  tenantId: string,
  filtros: FiltrosInventario,
): Promise<{ filas: MotoListada[]; total: number }> {
  return conTenant(tenantId, async (tx) => {
    // La venta activa de cada moto, con su comprador. Una moto tiene a lo sumo
    // una (índice `ventas_moto_activa_unique`), así que el join no duplica filas.
    const venta = tx
      .select({
        motoId: ventas.motoId,
        precioPactado: sql<number>`${ventas.precioPactado}`.as("precio_pactado"),
        fecha: sql<string>`${ventas.fecha}`.as("fecha_venta"),
        compradorNombre: sql<string>`concat_ws(' ', ${clientes.nombres}, ${clientes.apellidos})`.as("comprador_nombre"),
        compradorCedula: sql<string>`${clientes.numeroDocumento}`.as("comprador_cedula"),
      })
      .from(ventas)
      .innerJoin(clientes, eq(clientes.id, ventas.clienteId))
      .where(eq(ventas.estado, "activa"))
      .as("venta_activa");

    const texto = filtros.texto ? `%${filtros.texto}%` : undefined;
    const donde = and(
      noEliminada,
      filtros.placa ? eq(motos.placa, filtros.placa) : undefined,
      filtros.marca ? ilike(motos.marca, `%${filtros.marca}%`) : undefined,
      filtros.modelo ? ilike(motos.modelo, `%${filtros.modelo}%`) : undefined,
      filtros.estado ? eq(motos.estado, filtros.estado) : undefined,
      filtros.desde ? gte(motos.fechaCompra, filtros.desde) : undefined,
      filtros.hasta ? lte(motos.fechaCompra, filtros.hasta) : undefined,
      filtros.cedula
        ? or(eq(motos.proveedorCedula, filtros.cedula), eq(venta.compradorCedula, filtros.cedula))
        : undefined,
      filtros.nombreDueno
        ? or(
            ilike(motos.proveedorNombre, `%${filtros.nombreDueno}%`),
            ilike(venta.compradorNombre, `%${filtros.nombreDueno}%`),
          )
        : undefined,
      // Una sola caja para el celular: placa, marca, modelo, nombres y cédulas.
      texto
        ? or(
            ilike(motos.placa, texto),
            ilike(motos.marca, texto),
            ilike(motos.modelo, texto),
            ilike(motos.proveedorNombre, texto),
            ilike(motos.proveedorCedula, texto),
            ilike(venta.compradorNombre, texto),
            ilike(venta.compradorCedula, texto),
          )
        : undefined,
    );

    const gastosPorMoto = tx
      .select({
        motoId: gastos.motoId,
        total: sql<number>`coalesce(sum(${gastos.monto}), 0)::bigint`.as("total"),
      })
      .from(gastos)
      .where(eq(gastos.modulo, "compra_venta"))
      .groupBy(gastos.motoId)
      .as("gastos_por_moto");

    const columna = COLUMNA_ORDEN[filtros.orden];
    const filas = await tx
      .select({
        id: motos.id,
        placa: motos.placa,
        marca: motos.marca,
        modelo: motos.modelo,
        anio: motos.anio,
        color: motos.color,
        estado: motos.estado,
        precioCompra: motos.precioCompra,
        precioPublicado: motos.precioPublicado,
        precioVenta: venta.precioPactado,
        fechaCompra: motos.fechaCompra,
        fechaVenta: venta.fecha,
        proveedorNombre: motos.proveedorNombre,
        proveedorCedula: motos.proveedorCedula,
        compradorNombre: venta.compradorNombre,
        compradorCedula: venta.compradorCedula,
        gastosAsociados: sql<number>`coalesce(${gastosPorMoto.total}, 0)::bigint`,
      })
      .from(motos)
      .leftJoin(gastosPorMoto, eq(gastosPorMoto.motoId, motos.id))
      .leftJoin(venta, eq(venta.motoId, motos.id))
      .where(donde)
      // El id desempata: sin él, dos motos con la misma fecha podrían cambiar de
      // página entre una consulta y la siguiente.
      .orderBy(filtros.dir === "asc" ? asc(columna) : desc(columna), asc(motos.id))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina);

    const [conteo] = await tx
      .select({ total: count() })
      .from(motos)
      .leftJoin(venta, eq(venta.motoId, motos.id))
      .where(donde);

    return {
      filas: filas.map((fila) => ({
        ...fila,
        precioVenta: fila.precioVenta === null ? null : Number(fila.precioVenta),
        gastosAsociados: Number(fila.gastosAsociados),
      })),
      total: Number(conteo?.total ?? 0),
    };
  });
}

/** Ficha completa de una moto. `null` si no existe, está eliminada o es de otro negocio. */
export async function obtenerMoto(tenantId: string, motoId: string) {
  return conTenant(tenantId, async (tx) => {
    const [fila] = await tx
      .select()
      .from(motos)
      .where(and(eq(motos.id, motoId), noEliminada))
      .limit(1);
    return fila ?? null;
  });
}

/**
 * Registra la compra de una moto.
 *
 * No hace falta verificar la placa repetida a mano: el índice único parcial
 * `(tenant_id, placa)` la rechaza, y el error de Postgres es la respuesta
 * correcta ante una condición de carrera.
 */
export async function crearMoto(tenantId: string, datos: CrearMotoInput) {
  return conTenant(tenantId, async (tx) => {
    const [fila] = await tx
      .insert(motos)
      .values({ tenantId, ...datos })
      .returning();
    return fila ?? null;
  });
}

/**
 * Corrige los datos de una moto. No cambia el estado (ver `cambiarEstadoMoto`).
 * Corregir el precio de compra corrige solo la ganancia: no se guarda en
 * ninguna parte (regla 2 del proyecto).
 */
export async function actualizarMoto(tenantId: string, datos: EditarMotoInput) {
  const { motoId, ...cambios } = datos;
  return conTenant(tenantId, async (tx) => {
    const [fila] = await tx
      .update(motos)
      .set({
        ...cambios,
        // Un opcional vacío debe BORRAR el valor anterior, no conservarlo.
        cilindraje: cambios.cilindraje ?? null,
        numeroMotor: cambios.numeroMotor ?? null,
        numeroChasis: cambios.numeroChasis ?? null,
        proveedorNombre: cambios.proveedorNombre ?? null,
        proveedorCedula: cambios.proveedorCedula ?? null,
        proveedorTelefono: cambios.proveedorTelefono ?? null,
        precioPublicado: cambios.precioPublicado ?? null,
        descripcion: cambios.descripcion ?? null,
        actualizadoEn: new Date(),
      })
      .where(and(eq(motos.id, motoId), noEliminada))
      .returning();
    return fila ?? null;
  });
}

/** Cambia el estado si la transición está permitida (`TRANSICIONES_MOTO`). */
export async function cambiarEstadoMoto(tenantId: string, motoId: string, estado: EstadoMoto) {
  return conTenant(tenantId, async (tx) => {
    const [moto] = await tx
      .select({ estado: motos.estado })
      .from(motos)
      .where(and(eq(motos.id, motoId), noEliminada))
      .limit(1)
      .for("update");

    if (!moto) throw new ErrorNegocio("La moto no existe en el inventario.");
    if (!puedeCambiarEstado(moto.estado as EstadoMoto, estado)) {
      throw new ErrorNegocio(
        estado === "vendida"
          ? "Para vender la moto usa «Registrar la venta»: guarda el precio y el comprador."
          : "Ese cambio de estado no está permitido para esta moto.",
      );
    }

    await tx
      .update(motos)
      .set({ estado, actualizadoEn: new Date() })
      .where(eq(motos.id, motoId));
  });
}

/**
 * Borrado lógico. La fila se conserva (y sus gastos siguen contando: ese dinero
 * sí salió), pero la moto desaparece de listados y reportes. Una moto vendida
 * no se borra: desaparecería de la ganancia histórica.
 */
export async function eliminarMoto(tenantId: string, motoId: string) {
  return conTenant(tenantId, async (tx) => {
    const [moto] = await tx
      .select({ estado: motos.estado })
      .from(motos)
      .where(and(eq(motos.id, motoId), noEliminada))
      .limit(1)
      .for("update");

    if (!moto) throw new ErrorNegocio("La moto no existe en el inventario.");
    if (!puedeEliminarse(moto.estado as EstadoMoto)) {
      throw new ErrorNegocio("Una moto vendida no se puede borrar: es parte de la ganancia registrada.");
    }

    await tx
      .update(motos)
      .set({ eliminadaEn: new Date(), actualizadoEn: new Date() })
      .where(eq(motos.id, motoId));
  });
}

/** Totales del inventario para las tarjetas del listado. */
export async function resumenInventario(tenantId: string) {
  return conTenant(tenantId, async (tx) => {
    const [fila] = await tx
      .select({
        enInventario: sql<number>`count(*) filter (where ${motos.estado} in ('disponible', 'reservada', 'en_reparacion', 'devuelta'))::int`,
        vendidas: sql<number>`count(*) filter (where ${motos.estado} = 'vendida')::int`,
        capitalInvertido: sql<number>`coalesce(sum(${motos.precioCompra}) filter (where ${motos.estado} in ('disponible', 'reservada', 'en_reparacion', 'devuelta')), 0)::bigint`,
      })
      .from(motos)
      .where(noEliminada);

    return {
      enInventario: Number(fila?.enInventario ?? 0),
      vendidas: Number(fila?.vendidas ?? 0),
      capitalInvertido: Number(fila?.capitalInvertido ?? 0),
    };
  });
}
