/**
 * Ventas de motos (tabla `ventas`, migración 0003).
 *
 * Como en el resto de repositorios, todo pasa por `conTenant` y ninguna
 * consulta filtra por `tenant_id` a mano. Solo cuentan las ventas `activas`: una
 * venta devuelta se conserva como historia pero no es ingreso.
 */

import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";

import { conTenant } from "@/db";
import { clientes, gastos, motos, ventas } from "@/db/schema";
import type { EstadoMoto, MetodoPago } from "@/domain/enums";
import { ErrorNegocio } from "@/domain/errores";
import {
  problemaConFechaDeVenta,
  type FiltrosVentas,
  type RegistrarVentaInput,
  type TotalesVentas,
} from "@/domain/venta";
import { hoyISO } from "@/lib/fechas";

/** Estados desde los que se puede vender una moto. */
const ESTADOS_VENDIBLES: EstadoMoto[] = ["disponible", "reservada", "en_reparacion", "devuelta"];

const ventaActiva = eq(ventas.estado, "activa");
const nombreCliente = sql<string>`concat_ws(' ', ${clientes.nombres}, ${clientes.apellidos})`;

export type VentaListada = {
  ventaId: string;
  motoId: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  fecha: string;
  precioPactado: number;
  precioPublicado: number | null;
  descuentoAplicado: number;
  precioCompra: number;
  gastosAsociados: number;
  compradorNombre: string;
  compradorCedula: string;
  metodoPago: MetodoPago;
};

export type MotoVendible = {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  precioCompra: number;
  precioPublicado: number | null;
  /** Gastos ya cargados a la moto. */
  gastos: number;
};

export type VentasPorMes = TotalesVentas & {
  /** AAAA-MM. */
  mes: string;
};

/**
 * Registra la venta, en una sola transacción:
 *
 * 1. Bloquea la moto (`for update`) y valida que sea vendible y la fecha.
 * 2. Encuentra o crea al comprador en `clientes`. Si ya existe solo se
 *    actualiza su teléfono: su nombre puede estar partido en nombres/apellidos y
 *    no se pisa con el texto libre del formulario.
 * 3. Inserta la venta con el precio publicado que tenía la moto.
 * 4. Pasa la moto a `vendida`.
 *
 * Si dos ventas de la misma moto llegaran a la vez, el bloqueo las ordena y el
 * índice `ventas_moto_activa_unique` es la última red.
 */
export async function registrarVenta(tenantId: string, datos: RegistrarVentaInput) {
  return conTenant(tenantId, async (tx) => {
    const [moto] = await tx
      .select({ estado: motos.estado, fechaCompra: motos.fechaCompra, precioPublicado: motos.precioPublicado })
      .from(motos)
      .where(and(eq(motos.id, datos.motoId), isNull(motos.eliminadaEn)))
      .limit(1)
      .for("update");

    if (!moto) throw new ErrorNegocio("La moto no existe en el inventario.");
    if (!ESTADOS_VENDIBLES.includes(moto.estado as EstadoMoto)) {
      throw new ErrorNegocio("Esta moto no se puede vender: ya está vendida o dada de baja.");
    }
    const problema = problemaConFechaDeVenta({ fechaCompra: moto.fechaCompra, fechaVenta: datos.fecha, hoy: hoyISO() });
    if (problema) throw new ErrorNegocio(problema);

    const [cliente] = await tx
      .insert(clientes)
      .values({
        tenantId,
        numeroDocumento: datos.compradorCedula,
        nombres: datos.compradorNombre,
        telefono: datos.compradorTelefono,
      })
      .onConflictDoUpdate({
        target: [clientes.tenantId, clientes.numeroDocumento],
        set: { telefono: datos.compradorTelefono, actualizadoEn: new Date() },
      })
      .returning({ id: clientes.id });
    if (!cliente) throw new Error("No se pudo registrar al comprador.");

    const [venta] = await tx
      .insert(ventas)
      .values({
        tenantId,
        motoId: datos.motoId,
        clienteId: cliente.id,
        precioPublicado: moto.precioPublicado,
        precioPactado: datos.precioPactado,
        fecha: datos.fecha,
        metodoPago: datos.metodoPago,
        observaciones: datos.observaciones ?? null,
      })
      .returning();

    await tx.update(motos).set({ estado: "vendida", actualizadoEn: new Date() }).where(eq(motos.id, datos.motoId));

    return venta ?? null;
  });
}

/**
 * Registra la devolución de una venta, en una transacción: la venta queda
 * `devuelta` con su fecha (la fila no se borra: es la auditoría) y la moto pasa
 * a `devuelta`, desde donde puede volver a venderse o ir al inventario. La
 * venta deja de contar en los reportes, que solo suman ventas activas.
 */
export async function devolverVenta(tenantId: string, ventaId: string): Promise<{ motoId: string }> {
  return conTenant(tenantId, async (tx) => {
    const [venta] = await tx
      .select({ estado: ventas.estado, motoId: ventas.motoId })
      .from(ventas)
      .where(eq(ventas.id, ventaId))
      .limit(1)
      .for("update");

    if (!venta) throw new ErrorNegocio("La venta no existe.");
    if (venta.estado !== "activa") throw new ErrorNegocio("Esta venta ya fue devuelta.");

    const ahora = new Date();
    await tx
      .update(ventas)
      .set({ estado: "devuelta", devueltaEn: ahora, actualizadoEn: ahora })
      .where(eq(ventas.id, ventaId));
    await tx.update(motos).set({ estado: "devuelta", actualizadoEn: ahora }).where(eq(motos.id, venta.motoId));

    return { motoId: venta.motoId };
  });
}

/** Todas las ventas de una moto, activas y devueltas, de la más reciente a la más antigua. */
export async function historialDeVentasDeMoto(tenantId: string, motoId: string) {
  return conTenant(tenantId, async (tx) =>
    tx
      .select({
        id: ventas.id,
        fecha: ventas.fecha,
        precioPactado: ventas.precioPactado,
        estado: ventas.estado,
        devueltaEn: ventas.devueltaEn,
        compradorNombre: nombreCliente,
      })
      .from(ventas)
      .innerJoin(clientes, eq(clientes.id, ventas.clienteId))
      .where(eq(ventas.motoId, motoId))
      .orderBy(desc(ventas.creadoEn)),
  );
}

/**
 * Historial de ventas activas con los totales del filtro completo (no solo de
 * la página) y su desglose por mes, que es el reporte de ganancias por período.
 */
export async function listarVentas(
  tenantId: string,
  filtros: FiltrosVentas,
): Promise<{ filas: VentaListada[]; total: number; totales: TotalesVentas; porMes: VentasPorMes[] }> {
  return conTenant(tenantId, async (tx) => {
    const texto = filtros.texto ? `%${filtros.texto}%` : undefined;
    const donde = and(
      ventaActiva,
      isNull(motos.eliminadaEn),
      filtros.desde ? gte(ventas.fecha, filtros.desde) : undefined,
      filtros.hasta ? lte(ventas.fecha, filtros.hasta) : undefined,
      filtros.metodoPago ? eq(ventas.metodoPago, filtros.metodoPago) : undefined,
      texto
        ? or(
            ilike(motos.placa, texto),
            ilike(motos.marca, texto),
            ilike(motos.modelo, texto),
            ilike(nombreCliente, texto),
            ilike(clientes.numeroDocumento, texto),
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
    const gastoDeLaMoto = sql<number>`coalesce(${gastosPorMoto.total}, 0)`;

    const filas = await tx
      .select({
        ventaId: ventas.id,
        motoId: motos.id,
        placa: motos.placa,
        marca: motos.marca,
        modelo: motos.modelo,
        anio: motos.anio,
        fecha: ventas.fecha,
        precioPactado: ventas.precioPactado,
        precioPublicado: ventas.precioPublicado,
        descuentoAplicado: ventas.descuentoAplicado,
        precioCompra: motos.precioCompra,
        gastosAsociados: sql<number>`${gastoDeLaMoto}::bigint`,
        compradorNombre: nombreCliente,
        compradorCedula: clientes.numeroDocumento,
        metodoPago: ventas.metodoPago,
      })
      .from(ventas)
      .innerJoin(motos, eq(motos.id, ventas.motoId))
      .innerJoin(clientes, eq(clientes.id, ventas.clienteId))
      .leftJoin(gastosPorMoto, eq(gastosPorMoto.motoId, ventas.motoId))
      .where(donde)
      .orderBy(desc(ventas.fecha), desc(ventas.creadoEn), asc(ventas.id))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina);

    const mes = sql<string>`to_char(${ventas.fecha}, 'YYYY-MM')`;
    const porMes = await tx
      .select({
        mes,
        unidades: sql<number>`count(*)::int`,
        totalVendido: sql<number>`coalesce(sum(${ventas.precioPactado}), 0)::bigint`,
        costoDeVentas: sql<number>`coalesce(sum(${motos.precioCompra}), 0)::bigint`,
        gastos: sql<number>`coalesce(sum(${gastoDeLaMoto}), 0)::bigint`,
      })
      .from(ventas)
      .innerJoin(motos, eq(motos.id, ventas.motoId))
      .innerJoin(clientes, eq(clientes.id, ventas.clienteId))
      .leftJoin(gastosPorMoto, eq(gastosPorMoto.motoId, ventas.motoId))
      .where(donde)
      .groupBy(mes)
      .orderBy(desc(mes));

    const meses = porMes.map((fila) => ({
      mes: fila.mes,
      unidades: Number(fila.unidades),
      totalVendido: Number(fila.totalVendido),
      costoDeVentas: Number(fila.costoDeVentas),
      gastos: Number(fila.gastos),
    }));
    const totales = meses.reduce<TotalesVentas>(
      (suma, fila) => ({
        unidades: suma.unidades + fila.unidades,
        totalVendido: suma.totalVendido + fila.totalVendido,
        costoDeVentas: suma.costoDeVentas + fila.costoDeVentas,
        gastos: suma.gastos + fila.gastos,
      }),
      { unidades: 0, totalVendido: 0, costoDeVentas: 0, gastos: 0 },
    );

    return {
      filas: filas.map((fila) => ({
        ...fila,
        descuentoAplicado: Number(fila.descuentoAplicado ?? 0),
        gastosAsociados: Number(fila.gastosAsociados),
        metodoPago: fila.metodoPago as MetodoPago,
      })),
      total: totales.unidades,
      totales,
      porMes: meses,
    };
  });
}

/**
 * La venta activa de una moto, con su comprador, para la ficha y el recibo.
 * `null` si la moto no está vendida.
 */
export async function ventaActivaDeMoto(tenantId: string, motoId: string) {
  return conTenant(tenantId, async (tx) => {
    const [fila] = await tx
      .select({
        id: ventas.id,
        fecha: ventas.fecha,
        precioPublicado: ventas.precioPublicado,
        precioPactado: ventas.precioPactado,
        descuentoAplicado: ventas.descuentoAplicado,
        metodoPago: ventas.metodoPago,
        observaciones: ventas.observaciones,
        clienteId: clientes.id,
        compradorNombre: nombreCliente,
        compradorCedula: clientes.numeroDocumento,
        compradorTelefono: clientes.telefono,
      })
      .from(ventas)
      .innerJoin(clientes, eq(clientes.id, ventas.clienteId))
      .where(and(eq(ventas.motoId, motoId), ventaActiva))
      .limit(1);
    if (!fila) return null;
    return {
      ...fila,
      descuentoAplicado: Number(fila.descuentoAplicado ?? 0),
      metodoPago: fila.metodoPago as MetodoPago,
    };
  });
}

export type VentaDeMoto = NonNullable<Awaited<ReturnType<typeof ventaActivaDeMoto>>>;

/**
 * Motos que se pueden vender, con sus gastos, para el selector de «Nueva venta»
 * y la ganancia estimada mientras se escribe el precio.
 */
export async function motosVendibles(tenantId: string): Promise<MotoVendible[]> {
  return conTenant(tenantId, async (tx) => {
    const filas = await tx
      .select({
        id: motos.id,
        placa: motos.placa,
        marca: motos.marca,
        modelo: motos.modelo,
        anio: motos.anio,
        precioCompra: motos.precioCompra,
        precioPublicado: motos.precioPublicado,
        gastos: sql<number>`coalesce((
          select sum(${gastos.monto}) from ${gastos}
          where ${gastos.motoId} = ${motos.id} and ${gastos.modulo} = 'compra_venta'
        ), 0)::bigint`,
      })
      .from(motos)
      .where(and(isNull(motos.eliminadaEn), inArray(motos.estado, ESTADOS_VENDIBLES)))
      .orderBy(asc(motos.marca), asc(motos.placa))
      .limit(500);
    return filas.map((fila) => ({ ...fila, gastos: Number(fila.gastos) }));
  });
}
