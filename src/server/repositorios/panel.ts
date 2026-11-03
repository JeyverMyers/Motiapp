/**
 * Consultas del panel de control.
 *
 * Todo se calcula contra «hoy» en la zona del negocio (`hoyISO()`), que se pasa
 * como parámetro: ni la hora de Postgres ni la del proceso de Node, que en Neon
 * y en Vercel están en UTC. La ventana de N días va de `inicioDeVentana` a hoy,
 * inclusive, y es la misma para las tarjetas y para la gráfica.
 *
 * La serie diaria usa `generate_series`: los días sin movimiento aparecen como
 * cero en vez de faltar, que es lo que rompe los gráficos.
 */

import { sql } from "drizzle-orm";

import { conTenant } from "@/db";
import { DIAS_ALERTA_VENCIMIENTO } from "@/domain/empeno";
import {
  atrasoDeEmpeno,
  corteStockEstancado,
  diasEntre,
  inicioDeVentana,
  resultadoCompraVenta,
  type VentanaDias,
} from "@/domain/panel";
import { hoyISO } from "@/lib/fechas";

export type PuntoSerie = {
  /** AAAA-MM-DD. */
  fecha: string;
  ventas: number;
  /** Ventas menos lo que costaron esas motos (sin gastos: es la gráfica diaria). */
  ganancia: number;
  operaciones: number;
  /** Capital de los empeños abiertos ese día. */
  capitalPrestado: number;
  /** Intereses cobrados ese día. */
  intereses: number;
};

export type AlertaPorVencer = {
  empenoId: string;
  numero: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  fechaVencimiento: string;
  diasRestantes: number;
  capital: number;
};

export type AlertaVencido = Omit<AlertaPorVencer, "diasRestantes"> & {
  diasAtraso: number;
  /** Todavía dentro del plazo de gracia: puede pagar o renovar. */
  enGracia: boolean;
};

export type MotoEstancada = {
  motoId: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  estado: string;
  fechaCompra: string;
  diasEnInventario: number;
  precioCompra: number;
};

export type ResumenPanel = {
  ventana: VentanaDias;
  desde: string;
  hasta: string;
  compraVenta: {
    unidadesVendidas: number;
    totalVendido: number;
    costoDeVentas: number;
    /** Gastos de las motos vendidas en la ventana. */
    gastosDeVentas: number;
    gananciaVentas: number;
    margenPorcentaje: number;
    /** Gastos generales de compra/venta del período (sin moto). */
    gastosOperativos: number;
    resultado: number;
    motosEnInventario: number;
    capitalInvertido: number;
    motosEstancadas: number;
    capitalEstancado: number;
  };
  empeno: {
    empenosNuevos: number;
    capitalPrestadoPeriodo: number;
    activos: number;
    porVencer: number;
    vencidos: number;
    pagados: number;
    capitalColocado: number;
    interesesCobrados: number;
    gastos: number;
  };
  serie: PuntoSerie[];
  alertas: {
    porVencer: AlertaPorVencer[];
    vencidos: AlertaVencido[];
    stockEstancado: MotoEstancada[];
  };
};

const LIMITE_ALERTAS = 20;
const ESTADOS_EN_INVENTARIO = sql`('disponible', 'reservada', 'en_reparacion', 'devuelta')`;

export async function resumenPanel(
  tenantId: string,
  ventana: VentanaDias,
  hoy: string = hoyISO(),
): Promise<ResumenPanel> {
  const desde = inicioDeVentana(hoy, ventana);
  const corte = corteStockEstancado(hoy);

  return conTenant(tenantId, async (tx) => {
    const [ventas] = await tx
      .execute<{ unidades: number; total_vendido: string; costo: string; gastos_ventas: string }>(
        sql`
          with gastos_por_moto as (
            select moto_id, sum(monto) as total from gastos
            where modulo = 'compra_venta' and moto_id is not null
            group by moto_id
          )
          select
            count(*)::int as unidades,
            coalesce(sum(v.precio_pactado), 0)::bigint as total_vendido,
            coalesce(sum(m.precio_compra), 0)::bigint as costo,
            coalesce(sum(coalesce(g.total, 0)), 0)::bigint as gastos_ventas
          from ventas v
          join motos m on m.id = v.moto_id
          left join gastos_por_moto g on g.moto_id = v.moto_id
          where v.estado = 'activa'
            and m.eliminada_en is null
            and v.fecha between ${desde}::date and ${hoy}::date
        `,
      )
      .then((resultado) => resultado.rows);

    const [gastosPeriodo] = await tx
      .execute<{ operativos: string; empeno: string }>(
        sql`
          select
            coalesce(sum(monto) filter (where modulo = 'compra_venta' and moto_id is null), 0)::bigint as operativos,
            coalesce(sum(monto) filter (where modulo = 'empeno'), 0)::bigint as empeno
          from gastos
          where fecha between ${desde}::date and ${hoy}::date
        `,
      )
      .then((resultado) => resultado.rows);

    const [inventario] = await tx
      .execute<{ motos: number; capital: string; estancadas: number; capital_estancado: string }>(
        sql`
          select
            count(*)::int as motos,
            coalesce(sum(precio_compra), 0)::bigint as capital,
            count(*) filter (where fecha_compra <= ${corte}::date)::int as estancadas,
            coalesce(sum(precio_compra) filter (where fecha_compra <= ${corte}::date), 0)::bigint as capital_estancado
          from motos
          where eliminada_en is null and estado in ${ESTADOS_EN_INVENTARIO}
        `,
      )
      .then((resultado) => resultado.rows);

    const [empeno] = await tx
      .execute<{
        nuevos: number;
        capital_periodo: string;
        activos: number;
        por_vencer: number;
        vencidos: number;
        pagados: number;
        capital_colocado: string;
        intereses: string;
      }>(
        sql`
          select
            count(*) filter (where e.fecha_inicio between ${desde}::date and ${hoy}::date)::int as nuevos,
            coalesce(sum(e.capital) filter (where e.fecha_inicio between ${desde}::date and ${hoy}::date), 0)::bigint as capital_periodo,
            count(*) filter (where e.estado = 'activo')::int as activos,
            count(*) filter (
              where e.estado = 'activo'
                and e.fecha_vencimiento between ${hoy}::date and ${hoy}::date + ${DIAS_ALERTA_VENCIMIENTO}::int
            )::int as por_vencer,
            -- 'vencido' casi nunca se guarda: es un empeño abierto con la fecha ya pasada.
            count(*) filter (
              where e.estado in ('activo', 'vencido') and e.fecha_vencimiento < ${hoy}::date
            )::int as vencidos,
            count(*) filter (
              where e.estado = 'pagado' and e.actualizado_en::date between ${desde}::date and ${hoy}::date
            )::int as pagados,
            -- Capital en la calle: lo prestado menos lo que ya se devolvió.
            (
              coalesce(sum(e.capital) filter (where e.estado in ('activo', 'vencido')), 0)
              - coalesce((
                  select sum(a.a_capital) from abonos a
                  join empenos e2 on e2.id = a.empeno_id
                  where e2.estado in ('activo', 'vencido')
                ), 0)
            )::bigint as capital_colocado,
            coalesce((
              select sum(a.a_interes) from abonos a
              where a.fecha between ${desde}::date and ${hoy}::date
            ), 0)::bigint as intereses
          from empenos e
        `,
      )
      .then((resultado) => resultado.rows);

    const serie = await tx
      .execute<{
        fecha: string;
        ventas: string;
        costo: string;
        operaciones: number;
        capital: string;
        intereses: string;
      }>(
        sql`
          with dias as (
            select generate_series(${desde}::date, ${hoy}::date, interval '1 day')::date as dia
          ),
          ventas_dia as (
            select v.fecha, sum(v.precio_pactado) as ventas, sum(m.precio_compra) as costo, count(*) as operaciones
            from ventas v
            join motos m on m.id = v.moto_id
            where v.estado = 'activa' and m.eliminada_en is null
              and v.fecha between ${desde}::date and ${hoy}::date
            group by v.fecha
          ),
          empenos_dia as (
            select fecha_inicio as fecha, sum(capital) as capital
            from empenos
            where fecha_inicio between ${desde}::date and ${hoy}::date
            group by fecha_inicio
          ),
          intereses_dia as (
            select fecha, sum(a_interes) as intereses
            from abonos
            where fecha between ${desde}::date and ${hoy}::date
            group by fecha
          )
          select
            to_char(d.dia, 'YYYY-MM-DD') as fecha,
            coalesce(vd.ventas, 0)::bigint as ventas,
            coalesce(vd.costo, 0)::bigint as costo,
            coalesce(vd.operaciones, 0)::int as operaciones,
            coalesce(ed.capital, 0)::bigint as capital,
            coalesce(id.intereses, 0)::bigint as intereses
          from dias d
          left join ventas_dia vd on vd.fecha = d.dia
          left join empenos_dia ed on ed.fecha = d.dia
          left join intereses_dia id on id.fecha = d.dia
          order by d.dia
        `,
      )
      .then((resultado) => resultado.rows);

    const porVencer = await tx
      .execute<{
        empeno_id: string;
        numero: string;
        cliente_nombre: string;
        cliente_telefono: string | null;
        fecha_vencimiento: string;
        capital: string;
      }>(
        sql`
          select e.id as empeno_id, e.numero, e.cliente_nombre, e.cliente_telefono,
                 to_char(e.fecha_vencimiento, 'YYYY-MM-DD') as fecha_vencimiento, e.capital
          from empenos e
          where e.estado = 'activo'
            and e.fecha_vencimiento between ${hoy}::date and ${hoy}::date + ${DIAS_ALERTA_VENCIMIENTO}::int
          order by e.fecha_vencimiento
          limit ${LIMITE_ALERTAS}
        `,
      )
      .then((resultado) => resultado.rows);

    const vencidos = await tx
      .execute<{
        empeno_id: string;
        numero: string;
        cliente_nombre: string;
        cliente_telefono: string | null;
        fecha_vencimiento: string;
        fecha_limite_gracia: string;
        capital: string;
      }>(
        sql`
          select e.id as empeno_id, e.numero, e.cliente_nombre, e.cliente_telefono,
                 to_char(e.fecha_vencimiento, 'YYYY-MM-DD') as fecha_vencimiento,
                 to_char(e.fecha_limite_gracia, 'YYYY-MM-DD') as fecha_limite_gracia, e.capital
          from empenos e
          where e.estado in ('activo', 'vencido') and e.fecha_vencimiento < ${hoy}::date
          order by e.fecha_vencimiento
          limit ${LIMITE_ALERTAS}
        `,
      )
      .then((resultado) => resultado.rows);

    const estancadas = await tx
      .execute<{
        moto_id: string;
        placa: string;
        marca: string;
        modelo: string;
        anio: number;
        estado: string;
        fecha_compra: string;
        precio_compra: string;
      }>(
        sql`
          select id as moto_id, placa, marca, modelo, anio, estado,
                 to_char(fecha_compra, 'YYYY-MM-DD') as fecha_compra, precio_compra
          from motos
          where eliminada_en is null
            and estado in ${ESTADOS_EN_INVENTARIO}
            and fecha_compra <= ${corte}::date
          order by fecha_compra
          limit ${LIMITE_ALERTAS}
        `,
      )
      .then((resultado) => resultado.rows);

    const totalVendido = Number(ventas?.total_vendido ?? 0);
    const costoDeVentas = Number(ventas?.costo ?? 0);
    const gastosDeVentas = Number(ventas?.gastos_ventas ?? 0);
    const gastosOperativos = Number(gastosPeriodo?.operativos ?? 0);

    return {
      ventana,
      desde,
      hasta: hoy,
      compraVenta: {
        unidadesVendidas: Number(ventas?.unidades ?? 0),
        totalVendido,
        costoDeVentas,
        gastosDeVentas,
        gastosOperativos,
        ...resultadoCompraVenta({ totalVendido, costoDeVentas, gastosDeVentas, gastosOperativos }),
        motosEnInventario: Number(inventario?.motos ?? 0),
        capitalInvertido: Number(inventario?.capital ?? 0),
        motosEstancadas: Number(inventario?.estancadas ?? 0),
        capitalEstancado: Number(inventario?.capital_estancado ?? 0),
      },
      empeno: {
        empenosNuevos: Number(empeno?.nuevos ?? 0),
        capitalPrestadoPeriodo: Number(empeno?.capital_periodo ?? 0),
        activos: Number(empeno?.activos ?? 0),
        porVencer: Number(empeno?.por_vencer ?? 0),
        vencidos: Number(empeno?.vencidos ?? 0),
        pagados: Number(empeno?.pagados ?? 0),
        capitalColocado: Number(empeno?.capital_colocado ?? 0),
        interesesCobrados: Number(empeno?.intereses ?? 0),
        gastos: Number(gastosPeriodo?.empeno ?? 0),
      },
      serie: serie.map((punto) => ({
        fecha: punto.fecha,
        ventas: Number(punto.ventas),
        ganancia: Number(punto.ventas) - Number(punto.costo),
        operaciones: Number(punto.operaciones),
        capitalPrestado: Number(punto.capital),
        intereses: Number(punto.intereses),
      })),
      alertas: {
        porVencer: porVencer.map((fila) => ({
          empenoId: fila.empeno_id,
          numero: fila.numero,
          clienteNombre: fila.cliente_nombre,
          clienteTelefono: fila.cliente_telefono,
          fechaVencimiento: fila.fecha_vencimiento,
          diasRestantes: diasEntre(hoy, fila.fecha_vencimiento),
          capital: Number(fila.capital),
        })),
        vencidos: vencidos.map((fila) => ({
          empenoId: fila.empeno_id,
          numero: fila.numero,
          clienteNombre: fila.cliente_nombre,
          clienteTelefono: fila.cliente_telefono,
          fechaVencimiento: fila.fecha_vencimiento,
          capital: Number(fila.capital),
          ...atrasoDeEmpeno(fila.fecha_vencimiento, hoy, fila.fecha_limite_gracia),
        })),
        stockEstancado: estancadas.map((fila) => ({
          motoId: fila.moto_id,
          placa: fila.placa,
          marca: fila.marca,
          modelo: fila.modelo,
          anio: Number(fila.anio),
          estado: fila.estado,
          fechaCompra: fila.fecha_compra,
          diasEnInventario: diasEntre(fila.fecha_compra, hoy),
          precioCompra: Number(fila.precio_compra),
        })),
      },
    };
  });
}
