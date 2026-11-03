/**
 * Módulo Empeño.
 *
 * Un empeño toca dos tablas: el bien (`vehiculos_empeno` o `telefonos_empeno`) y
 * el empeño mismo. Las dos escrituras van en la misma transacción de `conTenant`,
 * así que no puede quedar un bien huérfano si algo falla a mitad de camino.
 *
 * Los saldos y los intereses no se guardan: se calculan con las funciones puras
 * de `@/domain/empeno` a partir del capital y de los abonos FECHADOS. Guardar un
 * saldo es garantizar que algún día no cuadre.
 *
 * Toda operación que cambia el dinero de un empeño (abonar, liquidar, renovar,
 * declararlo perdido) bloquea la fila con `select ... for update` antes de
 * calcular. Así dos personas en el mostrador no pueden abonar a la vez sobre el
 * mismo saldo: la segunda espera y calcula con el abono de la primera ya hecho.
 */

import { and, asc, count, eq, gte, ilike, inArray, lt, lte, or, sql } from "drizzle-orm";

import { conTenant, type TransaccionTenant } from "@/db";
import {
  abonos,
  clientes,
  consecutivosEmpeno,
  empenos,
  motos,
  telefonosEmpeno,
  tenants,
  vehiculosEmpeno,
} from "@/db/schema";
import {
  DIAS_ALERTA_VENCIMIENTO,
  DIAS_GRACIA_VENCIMIENTO,
  DIAS_MES_COMERCIAL,
  calcularRenovacion,
  formatearNumeroEmpeno,
  historialDeAbonos,
  puedeDeclararsePerdido,
  repartirAbono,
  saldoConAbonos,
  sobranteDeAbono,
  sumarDiasISO,
  type AbonoAplicado,
  type ConceptoAbono,
  type CrearEmpenoInput,
  type DeclararPerdidoInput,
  type Empeno,
  type FiltrosEmpeno,
  type LiquidarEmpenoInput,
  type RegistrarAbonoInput,
  type RenovarEmpenoInput,
} from "@/domain/empeno";
import type { MetodoPago } from "@/domain/enums";
import { ErrorNegocio } from "@/domain/errores";
import { hoyISO } from "@/lib/fechas";
import { formatearFecha, formatearMoneda } from "@/lib/formato";

/** El bien empeñado, ya unificado para poder mostrarlo sin distinguir tablas. */
export type BienEmpenado =
  | {
      tipo: "moto" | "carro";
      id: string;
      placa: string;
      marca: string;
      modelo: string;
      anio: number;
      color: string;
      numeroMotor: string | null;
      numeroChasis: string | null;
    }
  | {
      tipo: "telefono";
      id: string;
      marca: string;
      modelo: string;
      imei: string | null;
      capacidad: string | null;
      color: string;
    }
  | {
      /** Vive en la misma fila del empeño (0006): no tiene id propio. */
      tipo: "otro";
      descripcion: string;
      identificador: string | null;
      valorTasacion: number;
    };

export type EmpenoListado = {
  id: string;
  numero: string;
  estado: string;
  tipoBien: string;
  clienteNombre: string;
  clienteCedula: string;
  clienteTelefono: string | null;
  capital: number;
  tasaMensual: number;
  fechaInicio: string;
  fechaVencimiento: string;
  /** Abonos fechados: el saldo de la fila se calcula por tramos con ellos. */
  abonos: AbonoAplicado[];
  bien: BienEmpenado | null;
};

/** Columnas del bien en forma plana, para traerlo en la misma consulta. */
const columnasBien = {
  vehiculoId: vehiculosEmpeno.id,
  vehiculoPlaca: vehiculosEmpeno.placa,
  vehiculoMarca: vehiculosEmpeno.marca,
  vehiculoModelo: vehiculosEmpeno.modelo,
  vehiculoAnio: vehiculosEmpeno.anio,
  vehiculoColor: vehiculosEmpeno.color,
  vehiculoNumeroMotor: vehiculosEmpeno.numeroMotor,
  vehiculoNumeroChasis: vehiculosEmpeno.numeroChasis,
  telefonoId: telefonosEmpeno.id,
  telefonoMarca: telefonosEmpeno.marca,
  telefonoModelo: telefonosEmpeno.modelo,
  telefonoImei: telefonosEmpeno.imei,
  telefonoCapacidad: telefonosEmpeno.capacidad,
  telefonoColor: telefonosEmpeno.color,
  bienDescripcion: empenos.bienDescripcion,
  bienIdentificador: empenos.bienIdentificador,
  valorTasacion: empenos.valorTasacion,
};

type FilaEmpenoConBien = {
  tipoBien: string;
  vehiculoId: string | null;
  vehiculoPlaca: string | null;
  vehiculoMarca: string | null;
  vehiculoModelo: string | null;
  vehiculoAnio: number | null;
  vehiculoColor: string | null;
  vehiculoNumeroMotor: string | null;
  vehiculoNumeroChasis: string | null;
  telefonoId: string | null;
  telefonoMarca: string | null;
  telefonoModelo: string | null;
  telefonoImei: string | null;
  telefonoCapacidad: string | null;
  telefonoColor: string | null;
  bienDescripcion: string | null;
  bienIdentificador: string | null;
  valorTasacion: number | null;
};

function construirBien(fila: FilaEmpenoConBien): BienEmpenado | null {
  if (fila.tipoBien === "otro" && fila.bienDescripcion) {
    return {
      tipo: "otro",
      descripcion: fila.bienDescripcion,
      identificador: fila.bienIdentificador,
      valorTasacion: fila.valorTasacion ?? 0,
    };
  }

  if (fila.tipoBien === "telefono" && fila.telefonoId) {
    return {
      tipo: "telefono",
      id: fila.telefonoId,
      marca: fila.telefonoMarca ?? "",
      modelo: fila.telefonoModelo ?? "",
      imei: fila.telefonoImei,
      capacidad: fila.telefonoCapacidad,
      color: fila.telefonoColor ?? "",
    };
  }

  if ((fila.tipoBien === "moto" || fila.tipoBien === "carro") && fila.vehiculoId) {
    return {
      tipo: fila.tipoBien,
      id: fila.vehiculoId,
      placa: fila.vehiculoPlaca ?? "",
      marca: fila.vehiculoMarca ?? "",
      modelo: fila.vehiculoModelo ?? "",
      anio: fila.vehiculoAnio ?? 0,
      color: fila.vehiculoColor ?? "",
      numeroMotor: fila.vehiculoNumeroMotor,
      numeroChasis: fila.vehiculoNumeroChasis,
    };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Lecturas                                                            */
/* ------------------------------------------------------------------ */

/**
 * Condición de estado. `vencido` no se guarda nunca: es un empeño activo cuya
 * fecha ya pasó. Filtrar por la columna devolvería siempre cero filas.
 */
function condicionEstado(estado: FiltrosEmpeno["estado"], hoy: string) {
  if (!estado) return undefined;
  if (estado === "activo") {
    return and(eq(empenos.estado, "activo"), gte(empenos.fechaVencimiento, hoy));
  }
  if (estado === "vencido") {
    return and(
      inArray(empenos.estado, ["activo", "vencido"]),
      lt(empenos.fechaVencimiento, hoy),
    );
  }
  return eq(empenos.estado, estado);
}

/**
 * Listado de empeños con filtros y paginación. `soloPorVencer` es el que
 * alimenta la alerta de vencimiento a 7 días.
 */
export async function listarEmpenos(
  tenantId: string,
  filtros: FiltrosEmpeno,
): Promise<{ filas: EmpenoListado[]; total: number }> {
  return conTenant(tenantId, async (tx) => {
    const hoy = hoyISO();
    const limiteAlerta = sumarDiasISO(hoy, DIAS_ALERTA_VENCIMIENTO);
    const texto = filtros.texto ? `%${filtros.texto}%` : undefined;

    const donde = and(
      condicionEstado(filtros.estado, hoy),
      filtros.tipoBien ? eq(empenos.tipoBien, filtros.tipoBien) : undefined,
      filtros.desde ? gte(empenos.fechaInicio, filtros.desde) : undefined,
      filtros.hasta ? lte(empenos.fechaInicio, filtros.hasta) : undefined,
      filtros.soloPorVencer
        ? and(
            eq(empenos.estado, "activo"),
            gte(empenos.fechaVencimiento, hoy),
            lte(empenos.fechaVencimiento, limiteAlerta),
          )
        : undefined,
      texto
        ? or(
            ilike(empenos.numero, texto),
            ilike(empenos.clienteNombre, texto),
            ilike(empenos.clienteCedula, texto),
            ilike(empenos.clienteTelefono, texto),
            ilike(vehiculosEmpeno.placa, texto),
            ilike(telefonosEmpeno.imei, texto),
          )
        : undefined,
    );

    const filas = await tx
      .select({
        id: empenos.id,
        numero: empenos.numero,
        estado: empenos.estado,
        tipoBien: empenos.tipoBien,
        clienteNombre: empenos.clienteNombre,
        clienteCedula: empenos.clienteCedula,
        clienteTelefono: empenos.clienteTelefono,
        capital: empenos.capital,
        tasaMensual: empenos.tasaMensual,
        fechaInicio: empenos.fechaInicio,
        fechaVencimiento: empenos.fechaVencimiento,
        ...columnasBien,
      })
      .from(empenos)
      .leftJoin(vehiculosEmpeno, eq(vehiculosEmpeno.id, empenos.vehiculoId))
      .leftJoin(telefonosEmpeno, eq(telefonosEmpeno.id, empenos.telefonoId))
      .where(donde)
      .orderBy(asc(empenos.fechaVencimiento), asc(empenos.numero))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina);

    const [conteo] = await tx
      .select({ total: count() })
      .from(empenos)
      .leftJoin(vehiculosEmpeno, eq(vehiculosEmpeno.id, empenos.vehiculoId))
      .leftJoin(telefonosEmpeno, eq(telefonosEmpeno.id, empenos.telefonoId))
      .where(donde);

    // Una sola consulta para los abonos de toda la página, no una por fila.
    const ids = filas.map((fila) => fila.id);
    const abonosPagina =
      ids.length === 0
        ? []
        : await tx
            .select({
              empenoId: abonos.empenoId,
              fecha: abonos.fecha,
              aInteres: abonos.aInteres,
              aCapital: abonos.aCapital,
            })
            .from(abonos)
            .where(inArray(abonos.empenoId, ids));

    const abonosPorEmpeno = new Map<string, AbonoAplicado[]>();
    for (const abono of abonosPagina) {
      const lista = abonosPorEmpeno.get(abono.empenoId) ?? [];
      lista.push({ fecha: abono.fecha, aInteres: abono.aInteres, aCapital: abono.aCapital });
      abonosPorEmpeno.set(abono.empenoId, lista);
    }

    return {
      filas: filas.map((fila) => ({
        id: fila.id,
        numero: fila.numero,
        estado: fila.estado,
        tipoBien: fila.tipoBien,
        clienteNombre: fila.clienteNombre,
        clienteCedula: fila.clienteCedula,
        clienteTelefono: fila.clienteTelefono,
        capital: Number(fila.capital),
        tasaMensual: Number(fila.tasaMensual),
        fechaInicio: fila.fechaInicio,
        fechaVencimiento: fila.fechaVencimiento,
        abonos: abonosPorEmpeno.get(fila.id) ?? [],
        bien: construirBien(fila),
      })),
      total: Number(conteo?.total ?? 0),
    };
  });
}

/** Ficha de un empeño: contrato, bien, abonos con su historial y saldo de hoy. */
export async function obtenerEmpeno(tenantId: string, empenoId: string) {
  return conTenant(tenantId, async (tx) => {
    const [fila] = await tx
      .select({ empeno: empenos, ...columnasBien })
      .from(empenos)
      .leftJoin(vehiculosEmpeno, eq(vehiculosEmpeno.id, empenos.vehiculoId))
      .leftJoin(telefonosEmpeno, eq(telefonosEmpeno.id, empenos.telefonoId))
      .where(eq(empenos.id, empenoId))
      .limit(1);

    if (!fila) return null;
    const { empeno } = fila;

    const listaAbonos = await tx
      .select()
      .from(abonos)
      .where(eq(abonos.empenoId, empenoId))
      .orderBy(asc(abonos.fecha), asc(abonos.creadoEn));

    const prestamo = {
      capital: Number(empeno.capital),
      tasaMensual: Number(empeno.tasaMensual),
      fechaInicio: empeno.fechaInicio,
    };

    return {
      empeno,
      bien: construirBien({ ...fila, tipoBien: empeno.tipoBien }),
      historial: historialDeAbonos({ ...prestamo, abonos: listaAbonos }).reverse(),
      saldo: saldoConAbonos({ ...prestamo, abonos: listaAbonos, hasta: hoyISO() }),
    };
  });
}

export type FichaEmpeno = NonNullable<Awaited<ReturnType<typeof obtenerEmpeno>>>;

/* ------------------------------------------------------------------ */
/* Alta                                                                */
/* ------------------------------------------------------------------ */

/**
 * Crea el bien y el empeño en una sola transacción.
 *
 * `fechaVencimiento` por defecto es un mes comercial (30 días) después del
 * inicio, y la fecha límite de gracia otros 30 días después del vencimiento. El
 * CHECK de la tabla exige que la gracia no sea anterior al vencimiento, así que
 * el orden importa.
 */
export async function crearEmpeno(tenantId: string, datos: CrearEmpenoInput) {
  return conTenant(tenantId, async (tx) => {
    // El cliente tiene que ser del mismo negocio. RLS ya lo garantiza al
    // consultarlo, así que un id de otro tenant devuelve vacío.
    const [cliente] = await tx
      .select()
      .from(clientes)
      .where(eq(clientes.id, datos.clienteId))
      .limit(1);

    if (!cliente) {
      throw new ErrorNegocio("El cliente no existe en este negocio.");
    }

    const vencimiento = datos.fechaVencimiento ?? sumarDiasISO(datos.fechaInicio, DIAS_MES_COMERCIAL);
    if (vencimiento <= datos.fechaInicio) {
      throw new ErrorNegocio("La fecha de vencimiento debe ser posterior a la del empeño.");
    }

    let vehiculoId: string | null = null;
    let telefonoId: string | null = null;
    let otro: { bienDescripcion: string; bienIdentificador?: string; valorTasacion: number } | null = null;

    if (datos.tipoBien === "telefono") {
      const [telefono] = await tx
        .insert(telefonosEmpeno)
        .values({ tenantId, ...datos.telefono })
        .returning();
      telefonoId = telefono?.id ?? null;
    } else if (datos.tipoBien === "otro") {
      otro = {
        bienDescripcion: datos.otro.descripcion,
        bienIdentificador: datos.otro.identificador,
        valorTasacion: datos.otro.valorTasacion,
      };
    } else {
      const [vehiculo] = await tx
        .insert(vehiculosEmpeno)
        .values({ tenantId, tipo: datos.tipoBien, ...datos.vehiculo })
        .returning();
      vehiculoId = vehiculo?.id ?? null;
    }

    const numero = formatearNumeroEmpeno(await tomarConsecutivo(tx, tenantId));

    const [fila] = await tx
      .insert(empenos)
      .values({
        tenantId,
        numero,
        ...otro,
        clienteId: datos.clienteId,
        clienteNombre: [cliente.nombres, cliente.apellidos].filter(Boolean).join(" "),
        clienteCedula: cliente.numeroDocumento,
        clienteTelefono: cliente.telefono,
        tipoBien: datos.tipoBien,
        vehiculoId,
        telefonoId,
        capital: datos.capital,
        tasaMensual: datos.tasaMensual,
        frecuenciaPago: datos.frecuenciaPago,
        fechaInicio: datos.fechaInicio,
        fechaVencimiento: vencimiento,
        fechaLimiteGracia: sumarDiasISO(vencimiento, DIAS_GRACIA_VENCIMIENTO),
        garanteNombre: datos.garanteNombre,
        garanteCedula: datos.garanteCedula,
        garanteTelefono: datos.garanteTelefono,
        observaciones: datos.observaciones,
      })
      .returning();

    return fila ?? null;
  });
}

/* ------------------------------------------------------------------ */
/* Operaciones sobre un empeño existente                               */
/* ------------------------------------------------------------------ */

type FilaEmpeno = typeof empenos.$inferSelect;
type FilaAbono = typeof abonos.$inferSelect;

/** Estados en los que el empeño sigue corriendo y admite operaciones. */
const ESTADOS_ABIERTOS: readonly string[] = ["activo", "vencido"];

/** Lee el empeño y lo bloquea hasta el fin de la transacción. */
async function bloquearEmpeno(tx: TransaccionTenant, empenoId: string): Promise<FilaEmpeno> {
  const [empeno] = await tx
    .select()
    .from(empenos)
    .where(eq(empenos.id, empenoId))
    .limit(1)
    .for("update");

  if (!empeno) throw new ErrorNegocio("El empeño no existe en este negocio.");
  return empeno;
}

function exigirAbierto(empeno: FilaEmpeno) {
  if (!ESTADOS_ABIERTOS.includes(empeno.estado)) {
    throw new ErrorNegocio(`Este empeño ya está ${empeno.estado}: no admite más operaciones.`);
  }
}

/**
 * Fechas válidas para una operación: no antes del empeño, no en el futuro, y no
 * antes del último abono. Lo último evita registrar pagos "hacia atrás", que
 * cambiarían el saldo sobre el que ya se calcularon los abonos posteriores.
 */
function validarFechaOperacion(
  empeno: FilaEmpeno,
  abonosPrevios: readonly FilaAbono[],
  fecha: string,
) {
  if (fecha < empeno.fechaInicio) {
    throw new ErrorNegocio(
      `La fecha no puede ser anterior al empeño (${formatearFecha(empeno.fechaInicio)}).`,
    );
  }
  if (fecha > hoyISO()) {
    throw new ErrorNegocio("La fecha no puede estar en el futuro.");
  }
  const ultimo = abonosPrevios.reduce<string | null>(
    (maximo, abono) => (maximo === null || abono.fecha > maximo ? abono.fecha : maximo),
    null,
  );
  if (ultimo && fecha < ultimo) {
    throw new ErrorNegocio(
      `Ya hay un abono del ${formatearFecha(ultimo)}. Registra este con esa fecha o una posterior.`,
    );
  }
}

/**
 * Aplica un abono a un empeño ya bloqueado: reparte, valida que no sobre dinero,
 * lo guarda y cierra el empeño si quedó en cero.
 */
async function aplicarAbono(
  tx: TransaccionTenant,
  tenantId: string,
  empeno: FilaEmpeno,
  abonosPrevios: readonly FilaAbono[],
  datos: {
    monto: number;
    concepto: ConceptoAbono;
    metodoPago: MetodoPago;
    fecha: string;
    nota?: string;
  },
) {
  validarFechaOperacion(empeno, abonosPrevios, datos.fecha);

  const saldo = saldoConAbonos({
    capital: Number(empeno.capital),
    tasaMensual: Number(empeno.tasaMensual),
    fechaInicio: empeno.fechaInicio,
    abonos: abonosPrevios,
    hasta: datos.fecha,
  });

  const reparto = repartirAbono({
    monto: datos.monto,
    interesPendiente: saldo.interesPendiente,
    capitalVigente: saldo.capitalVigente,
    concepto: datos.concepto,
  });

  if (sobranteDeAbono(datos.monto, reparto) > 0) {
    const maximo = reparto.aInteres + reparto.aCapital;
    throw new ErrorNegocio(
      maximo === 0
        ? "No hay nada pendiente por ese concepto a esa fecha."
        : `El abono supera lo que se debe por ese concepto. Lo máximo que se puede abonar es ${formatearMoneda(maximo)}.`,
    );
  }

  const [fila] = await tx
    .insert(abonos)
    .values({
      tenantId,
      empenoId: empeno.id,
      monto: datos.monto,
      aInteres: reparto.aInteres,
      aCapital: reparto.aCapital,
      concepto: datos.concepto,
      metodoPago: datos.metodoPago,
      fecha: datos.fecha,
      nota: datos.nota,
    })
    .returning();

  // Si con este abono se saldó todo, el empeño se cierra solo.
  if (reparto.aCapital >= saldo.capitalVigente && reparto.aInteres >= saldo.interesPendiente) {
    await tx
      .update(empenos)
      .set({ estado: "pagado", actualizadoEn: new Date() })
      .where(eq(empenos.id, empeno.id));
  }

  return fila ?? null;
}

async function abonosDe(tx: TransaccionTenant, empenoId: string) {
  return tx.select().from(abonos).where(eq(abonos.empenoId, empenoId));
}

/** Saldo de un empeño bloqueado a una fecha, con sus abonos previos. */
function saldoA(empeno: FilaEmpeno, abonosPrevios: readonly FilaAbono[], fecha: string) {
  return saldoConAbonos({
    capital: Number(empeno.capital),
    tasaMensual: Number(empeno.tasaMensual),
    fechaInicio: empeno.fechaInicio,
    abonos: abonosPrevios,
    hasta: fecha,
  });
}

/** Registra un abono de interés, de capital o de ambos. */
export async function registrarAbono(tenantId: string, datos: RegistrarAbonoInput) {
  return conTenant(tenantId, async (tx) => {
    const empeno = await bloquearEmpeno(tx, datos.empenoId);
    exigirAbierto(empeno);
    return aplicarAbono(tx, tenantId, empeno, await abonosDe(tx, empeno.id), datos);
  });
}

/**
 * El cliente paga todo y recupera el bien. El monto lo calcula el servidor a la
 * fecha indicada; el formulario no lo envía.
 */
export async function liquidarEmpeno(
  tenantId: string,
  datos: LiquidarEmpenoInput,
): Promise<{ montoCobrado: number }> {
  return conTenant(tenantId, async (tx) => {
    const empeno = await bloquearEmpeno(tx, datos.empenoId);
    exigirAbierto(empeno);
    const abonosPrevios = await abonosDe(tx, empeno.id);
    validarFechaOperacion(empeno, abonosPrevios, datos.fecha);

    const saldo = saldoA(empeno, abonosPrevios, datos.fecha);

    // El cajero confirmó un monto en pantalla. Si a la fecha enviada el saldo es
    // otro (otro abono entre medio, cambio de día, fecha distinta), no se cobra
    // algo que nadie vio: se le pide revisar.
    if (datos.totalEsperado !== undefined && datos.totalEsperado !== saldo.total) {
      throw new ErrorNegocio(
        `A esa fecha el cliente debe ${formatearMoneda(saldo.total)}, no ${formatearMoneda(datos.totalEsperado)}. Recarga la ficha y confirma el monto de nuevo.`,
      );
    }

    if (saldo.total === 0) {
      await tx
        .update(empenos)
        .set({ estado: "pagado", actualizadoEn: new Date() })
        .where(eq(empenos.id, empeno.id));
      return { montoCobrado: 0 };
    }

    await aplicarAbono(tx, tenantId, empeno, abonosPrevios, {
      monto: saldo.total,
      concepto: "ambos",
      metodoPago: datos.metodoPago,
      fecha: datos.fecha,
      nota: "Liquidación: el cliente recuperó el bien",
    });
    return { montoCobrado: saldo.total };
  });
}

/**
 * Renueva el plazo. Si hay interés pendiente se cobra en la misma transacción,
 * como un abono a interés: un empeño no se renueva debiendo intereses.
 */
export async function renovarEmpeno(
  tenantId: string,
  datos: RenovarEmpenoInput,
): Promise<{ interesCobrado: number; fechaVencimiento: string }> {
  return conTenant(tenantId, async (tx) => {
    const empeno = await bloquearEmpeno(tx, datos.empenoId);
    exigirAbierto(empeno);
    const abonosPrevios = await abonosDe(tx, empeno.id);
    validarFechaOperacion(empeno, abonosPrevios, datos.fecha);

    const saldo = saldoA(empeno, abonosPrevios, datos.fecha);

    // Sin capital pendiente no hay préstamo que renovar: cobrar el interés lo
    // cerraría y la renovación lo reabriría con saldo cero.
    if (saldo.capitalVigente <= 0) {
      throw new ErrorNegocio(
        "Este empeño ya no tiene capital pendiente. Liquídalo en vez de renovarlo.",
      );
    }

    if (saldo.interesPendiente > 0) {
      await aplicarAbono(tx, tenantId, empeno, abonosPrevios, {
        monto: saldo.interesPendiente,
        concepto: "interes",
        metodoPago: datos.metodoPago,
        fecha: datos.fecha,
        nota: `Interés cobrado al renovar por ${datos.dias} días`,
      });
    }

    const fechas = calcularRenovacion({
      fechaVencimiento: empeno.fechaVencimiento,
      fechaRenovacion: datos.fecha,
      dias: datos.dias,
    });

    await tx
      .update(empenos)
      .set({ ...fechas, estado: "activo", actualizadoEn: new Date() })
      .where(eq(empenos.id, empeno.id));

    return { interesCobrado: saldo.interesPendiente, fechaVencimiento: fechas.fechaVencimiento };
  });
}

/**
 * El negocio se queda con el bien.
 *
 * ## El flujo hacia el inventario (regla 3 del proyecto)
 *
 * Un bien empeñado no es del negocio y por eso no vive en `motos`. Al declararse
 * perdido sí pasa a serlo. Si es una MOTO y el dueño lo pide, se crea en el
 * inventario de compra/venta como si el negocio la hubiera comprado:
 *
 * - precio de compra = capital vigente a la fecha. Es lo que el negocio de
 *   verdad puso y no recuperó. El interés no cobrado NO se suma: nunca fue un
 *   ingreso, y sumarlo inflaría el costo y escondería la pérdida en la ganancia.
 * - proveedor = el cliente del empeño, con los datos congelados en el contrato.
 * - la descripción guarda el número de empeño, para poder rastrear el origen.
 *
 * Carros y teléfonos no pasan a ningún inventario: el sistema solo lleva
 * inventario de motos. Quedan como empeño perdido y el dueño dispone de ellos
 * por fuera.
 */
export async function declararPerdido(
  tenantId: string,
  datos: DeclararPerdidoInput,
): Promise<{ motoId: string | null }> {
  return conTenant(tenantId, async (tx) => {
    const empeno = await bloquearEmpeno(tx, datos.empenoId);
    // Misma validación que un abono: una fecha anterior al último abono haría
    // que el costo de la moto ignorara capital ya devuelto.
    const abonosPrevios = await abonosDe(tx, empeno.id);
    validarFechaOperacion(empeno, abonosPrevios, datos.fecha);
    if (
      !puedeDeclararsePerdido({
        estado: empeno.estado as Empeno["estado"],
        fechaVencimiento: empeno.fechaVencimiento,
        hoy: datos.fecha,
      })
    ) {
      throw new ErrorNegocio(
        ESTADOS_ABIERTOS.includes(empeno.estado)
          ? `El empeño vence el ${formatearFecha(empeno.fechaVencimiento)}: hasta esa fecha el bien sigue siendo del cliente.`
          : `Este empeño ya está ${empeno.estado}.`,
      );
    }

    await tx
      .update(empenos)
      .set({ estado: "perdido", actualizadoEn: new Date() })
      .where(eq(empenos.id, empeno.id));

    if (!datos.pasarAInventario) return { motoId: null };

    if (empeno.tipoBien !== "moto" || !empeno.vehiculoId) {
      throw new ErrorNegocio("Solo las motos pasan al inventario de compra/venta.");
    }

    const [vehiculo] = await tx
      .select()
      .from(vehiculosEmpeno)
      .where(eq(vehiculosEmpeno.id, empeno.vehiculoId))
      .limit(1);
    if (!vehiculo) throw new ErrorNegocio("No se encontró la moto de este empeño.");

    const { capitalVigente } = saldoA(empeno, abonosPrevios, datos.fecha);
    if (capitalVigente <= 0) {
      throw new ErrorNegocio(
        "El capital de este empeño ya está pagado: no hay costo con el que registrar la moto en el inventario.",
      );
    }

    const [moto] = await tx
      .insert(motos)
      .values({
        tenantId,
        placa: vehiculo.placa,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        anio: vehiculo.anio,
        color: vehiculo.color,
        numeroMotor: vehiculo.numeroMotor,
        numeroChasis: vehiculo.numeroChasis,
        precioCompra: capitalVigente,
        fechaCompra: datos.fecha,
        proveedorNombre: empeno.clienteNombre,
        proveedorCedula: empeno.clienteCedula,
        proveedorTelefono: empeno.clienteTelefono,
        descripcion: `Adjudicada por el empeño N.º ${empeno.numero}.`,
      })
      .returning({ id: motos.id });

    return { motoId: moto?.id ?? null };
  });
}

/* ------------------------------------------------------------------ */
/* Apoyos para formularios y panel                                     */
/* ------------------------------------------------------------------ */

/**
 * Avanza el consecutivo del negocio y devuelve el número que le toca al empeño.
 *
 * Corre dentro de la transacción del alta: el `on conflict do update` bloquea la
 * fila del contador hasta el commit, así que dos altas simultáneas esperan en
 * fila en vez de repetir número, y si el alta falla el rollback lo devuelve. Un
 * negocio sin fila (creado después de 0006) arranca en 1.
 */
async function tomarConsecutivo(tx: TransaccionTenant, tenantId: string): Promise<number> {
  const [fila] = await tx
    .insert(consecutivosEmpeno)
    .values({ tenantId, ultimo: 1 })
    .onConflictDoUpdate({
      target: consecutivosEmpeno.tenantId,
      set: { ultimo: sql`${consecutivosEmpeno.ultimo} + 1`, actualizadoEn: new Date() },
    })
    .returning({ ultimo: consecutivosEmpeno.ultimo });
  if (!fila) throw new Error("No se pudo asignar el número del empeño.");
  return fila.ultimo;
}

/**
 * El número que recibirá el próximo empeño, para mostrarlo en el formulario.
 * Solo lee: el número definitivo se toma al guardar (puede cambiar si otro
 * empeño se registra antes).
 */
export async function siguienteNumeroEmpeno(tenantId: string): Promise<string> {
  return conTenant(tenantId, async (tx) => {
    const [fila] = await tx.select({ ultimo: consecutivosEmpeno.ultimo }).from(consecutivosEmpeno).limit(1);
    return formatearNumeroEmpeno(Number(fila?.ultimo ?? 0) + 1);
  });
}

/** Tasa de interés mensual configurada por el negocio, en porcentaje. */
export async function tasaDefecto(tenantId: string): Promise<number> {
  return conTenant(tenantId, async (tx) => {
    const [fila] = await tx
      .select({ tasa: tenants.tasaMensualDefecto })
      .from(tenants)
      .limit(1);
    return Number(fila?.tasa ?? 10);
  });
}

/** Conteos del módulo para el encabezado del listado. */
export async function resumenEmpenos(tenantId: string) {
  return conTenant(tenantId, async (tx) => {
    const hoy = hoyISO();
    const limiteAlerta = sumarDiasISO(hoy, DIAS_ALERTA_VENCIMIENTO);

    const [fila] = await tx
      .select({
        activos: sql<number>`count(*) filter (where ${empenos.estado} = 'activo')::int`,
        porVencer: sql<number>`count(*) filter (where ${empenos.estado} = 'activo' and ${empenos.fechaVencimiento} between ${hoy} and ${limiteAlerta})::int`,
        vencidos: sql<number>`count(*) filter (where ${empenos.estado} in ('activo', 'vencido') and ${empenos.fechaVencimiento} < ${hoy})::int`,
        perdidos: sql<number>`count(*) filter (where ${empenos.estado} = 'perdido')::int`,
        pagados: sql<number>`count(*) filter (where ${empenos.estado} = 'pagado')::int`,
        capitalPrestado: sql<number>`coalesce(sum(${empenos.capital}) filter (where ${empenos.estado} in ('activo', 'vencido')), 0)::bigint`,
      })
      .from(empenos);

    // El capital que sigue en la calle es el prestado menos lo ya devuelto.
    const [devuelto] = await tx
      .select({ total: sql<number>`coalesce(sum(${abonos.aCapital}), 0)::bigint` })
      .from(abonos)
      .innerJoin(empenos, eq(empenos.id, abonos.empenoId))
      .where(inArray(empenos.estado, ["activo", "vencido"]));

    return {
      activos: Number(fila?.activos ?? 0),
      porVencer: Number(fila?.porVencer ?? 0),
      vencidos: Number(fila?.vencidos ?? 0),
      perdidos: Number(fila?.perdidos ?? 0),
      pagados: Number(fila?.pagados ?? 0),
      capitalColocado: Number(fila?.capitalPrestado ?? 0) - Number(devuelto?.total ?? 0),
    };
  });
}

export type { Empeno };
