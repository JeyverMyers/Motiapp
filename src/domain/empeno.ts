/**
 * Módulo Empeño: bienes entregados en garantía a cambio de un préstamo.
 *
 * Los bienes viven en tablas propias (`vehiculos_empeno`, `telefonos_empeno`)
 * y no en una tabla genérica: un teléfono no tiene placa y un carro no tiene
 * IMEI. El empeño apunta a uno de los dos.
 *
 * El interés es simple y se causa por día sobre la tasa mensual pactada:
 *
 *     interés = capital * (tasaMensual / 100) * (días / 30)
 *
 * No hay capitalización. La tasa se guarda por empeño, no por tenant, para que
 * renegociar un empeño no cambie el histórico de los demás.
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
import { ESTADOS_EMPENO, FRECUENCIAS_PAGO, METODOS_PAGO, TIPOS_BIEN } from "./enums";

export const tipoBienSchema = z.enum(TIPOS_BIEN);
export const estadoEmpenoSchema = z.enum(ESTADOS_EMPENO);
export const frecuenciaPagoSchema = z.enum(FRECUENCIAS_PAGO);

/** Días de gracia después del vencimiento antes de considerar el bien perdido. */
export const DIAS_GRACIA_VENCIMIENTO = 30;

/** Ventana de aviso previo al vencimiento exigida por el negocio. */
export const DIAS_ALERTA_VENCIMIENTO = 7;

/** Días que asumimos tiene un mes para efectos de causar interés. */
export const DIAS_MES_COMERCIAL = 30;

/* ------------------------------------------------------------------ */
/* Bienes empeñados                                                    */
/* ------------------------------------------------------------------ */

/** Moto o carro entregado en garantía. */
export const vehiculoEmpenoSchema = z.object({
  id: idSchema,
  tenantId: idSchema,
  tipo: z.enum(["moto", "carro"]),
  placa: placaSchema,
  marca: textoRequerido({ max: 50, campo: "La marca" }),
  modelo: textoRequerido({ max: 80, campo: "El modelo" }),
  anio: anoSchema,
  color: colorSchema,
  numeroMotor: textoOpcional(40, "El número de motor"),
  numeroChasis: textoOpcional(40, "El número de chasis"),
  creadoEn: timestampSchema,
});

export const crearVehiculoEmpenoSchema = vehiculoEmpenoSchema.omit({
  id: true,
  tenantId: true,
  creadoEn: true,
});

/** Teléfono entregado en garantía. */
export const telefonoEmpenoSchema = z.object({
  id: idSchema,
  tenantId: idSchema,
  marca: textoRequerido({ max: 50, campo: "La marca" }),
  modelo: textoRequerido({ max: 80, campo: "El modelo" }),
  imei: textoOpcional(20, "El IMEI"),
  capacidad: textoOpcional(20, "La capacidad"),
  color: colorSchema,
  creadoEn: timestampSchema,
});

export const crearTelefonoEmpenoSchema = telefonoEmpenoSchema.omit({
  id: true,
  tenantId: true,
  creadoEn: true,
});

/* ------------------------------------------------------------------ */
/* Empeño                                                              */
/* ------------------------------------------------------------------ */

export const empenoSchema = z.object({
  id: idSchema,
  tenantId: idSchema,

  /** Consecutivo legible para el cliente, generado por tenant. */
  numero: textoRequerido({ max: 20, campo: "El número de empeño" }),

  clienteId: idSchema,
  /** Datos congelados al momento del empeño: el cliente puede cambiar de nombre. */
  clienteNombre: textoRequerido({ max: 160, campo: "El nombre del cliente" }),
  clienteCedula: cedulaSchema,
  clienteTelefono: textoOpcional(20, "El teléfono del cliente"),

  tipoBien: tipoBienSchema,
  vehiculoId: idSchema.optional(),
  telefonoId: idSchema.optional(),

  capital: monto({ campo: "El capital", min: 1 }),
  /** Tasa de interés mensual en porcentaje, por ejemplo 10 para 10% mensual. */
  tasaMensual: z.number().min(0).max(100),
  frecuenciaPago: frecuenciaPagoSchema.default("mensual"),
  fechaInicio: fechaSchema,
  fechaVencimiento: fechaSchema,
  fechaLimiteGracia: fechaSchema,

  estado: estadoEmpenoSchema.default("activo"),

  // Garante: opcional, se guarda en línea porque es un contacto único del empeño.
  garanteNombre: textoOpcional(120, "El nombre del garante"),
  garanteCedula: cedulaSchema.optional(),
  garanteTelefono: textoOpcional(20, "El teléfono del garante"),

  observaciones: textoOpcional(1000, "Las observaciones"),
  creadoEn: timestampSchema,
  actualizadoEn: timestampSchema,
});

/** Campos comunes a los tres tipos de bien. */
/**
 * Bien que no es moto, carro ni teléfono (B5.3). Solo se exige qué es y en
 * cuánto se tasó; la serie o referencia es opcional (B5.4).
 */
export const bienOtroSchema = z.object({
  descripcion: textoRequerido({ min: 3, max: 200, campo: "La descripción del bien" }),
  identificador: textoOpcional(60, "La serie o referencia"),
  valorTasacion: montoDesdeTexto({ campo: "El valor de tasación", min: 1 }),
});

/** Prefijo del consecutivo de empeños: EMP-0001, EMP-0002… */
export const PREFIJO_NUMERO_EMPENO = "EMP-";

/** El número que ve el cliente a partir del consecutivo del negocio. */
export function formatearNumeroEmpeno(consecutivo: number): string {
  return `${PREFIJO_NUMERO_EMPENO}${String(consecutivo).padStart(4, "0")}`;
}

/**
 * Datos comunes del alta. El número no viene del formulario: lo asigna el
 * repositorio con el consecutivo del negocio, en la misma transacción (B5.2).
 */
const datosBaseEmpeno = {
  clienteId: idSchema,
  capital: montoDesdeTexto({ campo: "El capital", min: 1 }),
  tasaMensual: z.coerce
    .number({ error: "La tasa mensual es obligatoria" })
    .min(0, "La tasa no puede ser negativa")
    .max(100, "La tasa mensual no puede pasar de 100%"),
  frecuenciaPago: frecuenciaPagoSchema.default("mensual"),
  fechaInicio: fechaSchema,
  /** Si no se envía, se calcula a 30 días de la fecha de inicio. */
  fechaVencimiento: fechaSchema.optional(),
  garanteNombre: textoOpcional(120, "El nombre del garante"),
  garanteCedula: cedulaSchema.optional(),
  garanteTelefono: textoOpcional(20, "El teléfono del garante"),
  observaciones: textoOpcional(1000, "Las observaciones"),
};

/**
 * Unión discriminada por `tipoBien`: el bien viaja anidado y su forma depende
 * del tipo. Un teléfono no puede traer placa ni una moto puede traer IMEI.
 */
export const crearEmpenoSchema = z.discriminatedUnion("tipoBien", [
  z.object({
    ...datosBaseEmpeno,
    tipoBien: z.literal("moto"),
    vehiculo: crearVehiculoEmpenoSchema.omit({ tipo: true }),
  }),
  z.object({
    ...datosBaseEmpeno,
    tipoBien: z.literal("carro"),
    vehiculo: crearVehiculoEmpenoSchema.omit({ tipo: true }),
  }),
  z.object({
    ...datosBaseEmpeno,
    tipoBien: z.literal("telefono"),
    telefono: crearTelefonoEmpenoSchema,
  }),
  z.object({
    ...datosBaseEmpeno,
    tipoBien: z.literal("otro"),
    otro: bienOtroSchema,
  }),
]);

/**
 * Edición de un empeño ya creado.
 *
 * No se deriva de `crearEmpenoSchema` porque es una unión discriminada y Zod no
 * ofrece `.partial()` sobre uniones. Las ediciones reales son pocas y concretas
 * (tasa, fecha de vencimiento, garante, observaciones), así que se enumeran.
 */
export const editarEmpenoSchema = z.object({
  tasaMensual: z.coerce.number().min(0).max(100).optional(),
  frecuenciaPago: frecuenciaPagoSchema.optional(),
  fechaVencimiento: fechaSchema.optional(),
  garanteNombre: textoOpcional(120, "El nombre del garante"),
  garanteCedula: cedulaSchema.optional(),
  garanteTelefono: textoOpcional(20, "El teléfono del garante"),
  observaciones: textoOpcional(1000, "Las observaciones"),
});

/**
 * Datos del cliente tal como los captura el formulario de empeño.
 *
 * Se piden aquí y no se seleccionan de una lista porque en el mostrador el
 * cliente casi siempre es nuevo: se identifica por cédula y si ya existe se
 * reutiliza su ficha, en vez de obligar a crearlo antes en otra pantalla.
 */
export const datosClienteEmpenoSchema = z.object({
  cedula: cedulaSchema,
  nombres: textoRequerido({ min: 3, max: 80, campo: "Los nombres" }),
  apellidos: textoOpcional(80, "Los apellidos"),
  telefono: z
    .string()
    .trim()
    .transform((valor) => valor.replace(/[^\d]/g, "").replace(/^57(?=\d{10}$)/, ""))
    .refine((valor) => /^\d{10}$/.test(valor), "El teléfono debe tener 10 dígitos"),
  email: z.string().trim().toLowerCase().email("El correo no es válido").optional(),
});

export type DatosClienteEmpeno = z.infer<typeof datosClienteEmpenoSchema>;

/** Un `<select>` en «Todos» o una fecha vacía llegan como "": eso es «sin filtro». */
const vacioComoIndefinido = (valor: unknown) => (valor === "" ? undefined : valor);

/**
 * Filtros del listado de empeños, tal como llegan en la URL.
 *
 * `soloPorVencer` no usa `z.coerce.boolean()`: esa coerción convierte la cadena
 * "false" en `true`, porque cualquier texto no vacío es verdadero en JavaScript.
 */
export const filtrosEmpenoSchema = z.object({
  texto: textoOpcional(120, "El texto de búsqueda"),
  estado: z.preprocess(vacioComoIndefinido, estadoEmpenoSchema.optional()),
  tipoBien: z.preprocess(vacioComoIndefinido, tipoBienSchema.optional()),
  soloPorVencer: z.preprocess((valor) => valor === "true" || valor === "on", z.boolean()),
  desde: z.preprocess(vacioComoIndefinido, fechaSchema.optional()),
  hasta: z.preprocess(vacioComoIndefinido, fechaSchema.optional()),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

/* ------------------------------------------------------------------ */
/* Abonos (pagos de interés y de capital)                              */
/* ------------------------------------------------------------------ */

/** `interes` baja la causación, `capital` baja la deuda, `ambos` reparte. */
export const CONCEPTOS_ABONO = ["interes", "capital", "ambos"] as const;
export type ConceptoAbono = (typeof CONCEPTOS_ABONO)[number];

export const ETIQUETA_CONCEPTO_ABONO: Record<ConceptoAbono, string> = {
  interes: "Solo interés",
  capital: "Solo capital",
  ambos: "Interés y capital",
};

export const abonoSchema = z.object({
  id: idSchema,
  tenantId: idSchema,
  empenoId: idSchema,
  monto: monto({ campo: "El monto del abono", min: 1 }),
  concepto: z.enum(CONCEPTOS_ABONO),
  metodoPago: z.enum(METODOS_PAGO),
  fecha: fechaSchema,
  /** Saldo de capital después de aplicar este abono, para auditoría. */
  capitalDespues: monto({ campo: "El capital resultante" }),
  nota: textoOpcional(300, "La nota"),
  creadoEn: timestampSchema,
});

export const registrarAbonoSchema = z.object({
  empenoId: idSchema,
  monto: montoDesdeTexto({ campo: "El monto del abono", min: 1 }),
  concepto: z.enum(CONCEPTOS_ABONO).default("interes"),
  metodoPago: z.enum(METODOS_PAGO).default("efectivo"),
  fecha: fechaSchema,
  nota: textoOpcional(300, "La nota"),
});

/** Plazo máximo de una renovación. Un año cubre cualquier caso real del mostrador. */
export const DIAS_MAXIMOS_RENOVACION = 365;

/** Renovar: extiende el plazo y cobra el interés pendiente en la misma operación. */
export const renovarEmpenoSchema = z.object({
  empenoId: idSchema,
  fecha: fechaSchema,
  dias: z.coerce
    .number({ error: "El plazo es obligatorio" })
    .int("El plazo va en días enteros")
    .min(1, "El plazo debe ser de al menos un día")
    .max(DIAS_MAXIMOS_RENOVACION, `El plazo no puede pasar de ${DIAS_MAXIMOS_RENOVACION} días`),
  metodoPago: z.enum(METODOS_PAGO).default("efectivo"),
});

/**
 * Liquidar: el cliente paga todo y recupera el bien. El monto NO viaja en el
 * formulario: el servidor lo calcula a la fecha, para que nadie cierre un empeño
 * cobrando de menos por un número desactualizado en pantalla.
 */
export const liquidarEmpenoSchema = z.object({
  empenoId: idSchema,
  fecha: fechaSchema,
  metodoPago: z.enum(METODOS_PAGO).default("efectivo"),
  /**
   * El total que el cajero vio y confirmó. No decide cuánto se cobra (eso lo
   * calcula el servidor): solo sirve para rechazar si no coincide.
   */
  totalEsperado: z.preprocess(
    (valor) => (valor === "" || valor === undefined ? undefined : valor),
    z.coerce.number().int().min(0).optional(),
  ),
});

/** Declarar perdido: el negocio se queda con el bien. */
export const declararPerdidoSchema = z.object({
  empenoId: idSchema,
  fecha: fechaSchema,
  // Un checkbox HTML no se envía si está desmarcado, y si está marcado envía "on".
  pasarAInventario: z
    .union([z.literal("on"), z.literal("true"), z.literal("")])
    .optional()
    .transform((valor) => valor === "on" || valor === "true"),
});

export type RenovarEmpenoInput = z.infer<typeof renovarEmpenoSchema>;
export type LiquidarEmpenoInput = z.infer<typeof liquidarEmpenoSchema>;
export type DeclararPerdidoInput = z.infer<typeof declararPerdidoSchema>;

export type VehiculoEmpeno = z.infer<typeof vehiculoEmpenoSchema>;
export type TelefonoEmpeno = z.infer<typeof telefonoEmpenoSchema>;
export type Empeno = z.infer<typeof empenoSchema>;
export type CrearEmpenoInput = z.infer<typeof crearEmpenoSchema>;
export type EditarEmpenoInput = z.infer<typeof editarEmpenoSchema>;
export type FiltrosEmpeno = z.infer<typeof filtrosEmpenoSchema>;
export type Abono = z.infer<typeof abonoSchema>;
export type RegistrarAbonoInput = z.infer<typeof registrarAbonoSchema>;

/* ------------------------------------------------------------------ */
/* Cálculo de intereses                                                */
/* ------------------------------------------------------------------ */

/**
 * Días causados entre dos fechas, sin contar el día inicial. Se usa `ceil`
 * sobre la diferencia en milisegundos porque una fracción de día ya se cobra.
 */
export function diasCausados(desde: Date | string, hasta: Date | string = new Date()): number {
  const inicio = new Date(desde).getTime();
  const fin = new Date(hasta).getTime();
  if (Number.isNaN(inicio) || Number.isNaN(fin) || fin <= inicio) return 0;
  return Math.ceil((fin - inicio) / 86_400_000);
}

/**
 * Interés causado a la fecha. Redondea al peso porque el negocio cobra en
 * efectivo y no maneja centavos.
 */
export function interesCausado(entrada: {
  capital: number;
  tasaMensual: number;
  fechaInicio: Date | string;
  hasta?: Date | string;
}): number {
  const { capital, tasaMensual, fechaInicio, hasta } = entrada;
  const dias = diasCausados(fechaInicio, hasta ?? new Date());
  const interes = capital * (tasaMensual / 100) * (dias / DIAS_MES_COMERCIAL);
  return Math.round(interes);
}

/**
 * Saldo total a pagar hoy: capital vigente más interés causado menos lo ya
 * abonado a intereses. Nunca devuelve negativo.
 */
export function saldoEmpeno(entrada: {
  capital: number;
  capitalAbonado: number;
  interesAbonado: number;
  tasaMensual: number;
  fechaInicio: Date | string;
  hasta?: Date | string;
}): { capitalVigente: number; interesPendiente: number; total: number } {
  const capitalVigente = Math.max(0, entrada.capital - entrada.capitalAbonado);
  const interesDelPeriodo = interesCausado({
    capital: capitalVigente,
    tasaMensual: entrada.tasaMensual,
    fechaInicio: entrada.fechaInicio,
    hasta: entrada.hasta,
  });
  const interesPendiente = Math.max(0, interesDelPeriodo - entrada.interesAbonado);
  return {
    capitalVigente,
    interesPendiente,
    total: capitalVigente + interesPendiente,
  };
}

/**
 * Reparte un abono. Con `ambos` se paga primero el interés y el sobrante baja
 * capital, que es el orden que protege al negocio.
 */
export function repartirAbono(entrada: {
  monto: number;
  interesPendiente: number;
  capitalVigente: number;
  concepto: ConceptoAbono;
}): { aInteres: number; aCapital: number } {
  const { monto, interesPendiente, capitalVigente, concepto } = entrada;

  if (concepto === "interes") {
    return { aInteres: Math.min(monto, interesPendiente), aCapital: 0 };
  }
  if (concepto === "capital") {
    return { aInteres: 0, aCapital: Math.min(monto, capitalVigente) };
  }

  const aInteres = Math.min(monto, interesPendiente);
  const resto = monto - aInteres;
  return { aInteres, aCapital: Math.min(resto, capitalVigente) };
}

/**
 * Dinero de un abono que el reparto no pudo aplicar a nada.
 *
 * `repartirAbono` nunca reparte más de lo que se debe, así que un abono de
 * 100.000 «solo a interés» con 60.000 pendientes reparte 60.000. Si se guardara
 * con `monto = 100.000`, la caja diría que entraron 100.000 y el empeño que se
 * aplicaron 60.000. Quien registra el abono debe rechazarlo si esto no es cero.
 */
export function sobranteDeAbono(
  monto: number,
  reparto: { aInteres: number; aCapital: number },
): number {
  return Math.max(0, monto - reparto.aInteres - reparto.aCapital);
}

/** Un abono ya registrado, con lo que se aplicó a cada concepto. */
export type AbonoAplicado = {
  fecha: Date | string;
  aInteres: number;
  aCapital: number;
};

/**
 * Saldo a una fecha teniendo en cuenta CUÁNDO se abonó cada peso de capital.
 *
 * ## Por qué existe además de `saldoEmpeno`
 *
 * `saldoEmpeno` recibe totales sin fecha y causa todo el interés sobre el capital
 * que queda hoy. Eso borra interés ya ganado: un millón al 10% durante 30 días
 * causa 100.000; si el día 30 el cliente abona 500.000 a capital, `saldoEmpeno`
 * recalcula todo sobre 500.000 y el interés ganado baja a 50.000.
 *
 * Aquí el interés se causa por tramos: cada tramo usa el capital que estaba
 * vigente durante esos días. Se redondea una sola vez, al final, para no
 * acumular errores de redondeo entre tramos.
 */
export function saldoConAbonos(entrada: {
  capital: number;
  tasaMensual: number;
  fechaInicio: Date | string;
  abonos: readonly AbonoAplicado[];
  hasta?: Date | string;
}): { capitalVigente: number; interesPendiente: number; total: number } {
  const hasta = entrada.hasta ?? new Date();
  const finMs = new Date(hasta).getTime();

  const aplicables = entrada.abonos
    .filter((abono) => new Date(abono.fecha).getTime() <= finMs)
    .slice()
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  let capitalVigente = entrada.capital;
  let desde: Date | string = entrada.fechaInicio;
  let interesSinRedondear = 0;
  let interesAbonado = 0;

  for (const abono of aplicables) {
    interesSinRedondear += interesDelTramo(capitalVigente, entrada.tasaMensual, desde, abono.fecha);
    capitalVigente = Math.max(0, capitalVigente - abono.aCapital);
    interesAbonado += abono.aInteres;
    // Un abono anterior al inicio no puede mover el inicio hacia atrás.
    if (new Date(abono.fecha).getTime() > new Date(desde).getTime()) desde = abono.fecha;
  }

  interesSinRedondear += interesDelTramo(capitalVigente, entrada.tasaMensual, desde, hasta);

  const interesPendiente = Math.max(0, Math.round(interesSinRedondear) - interesAbonado);
  return { capitalVigente, interesPendiente, total: capitalVigente + interesPendiente };
}

/**
 * Historial de abonos con el saldo que quedó después de cada uno, del más
 * antiguo al más reciente. Es lo que el dueño le muestra al cliente para
 * explicarle por qué debe lo que debe.
 */
export function historialDeAbonos<T extends AbonoAplicado>(entrada: {
  capital: number;
  tasaMensual: number;
  fechaInicio: Date | string;
  abonos: readonly T[];
}): Array<T & { saldoDespues: number; capitalDespues: number }> {
  const ordenados = entrada.abonos
    .slice()
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  return ordenados.map((abono, indice) => {
    const saldo = saldoConAbonos({
      capital: entrada.capital,
      tasaMensual: entrada.tasaMensual,
      fechaInicio: entrada.fechaInicio,
      abonos: ordenados.slice(0, indice + 1),
      hasta: abono.fecha,
    });
    return { ...abono, saldoDespues: saldo.total, capitalDespues: saldo.capitalVigente };
  });
}

function interesDelTramo(
  capital: number,
  tasaMensual: number,
  desde: Date | string,
  hasta: Date | string,
): number {
  return capital * (tasaMensual / 100) * (diasCausados(desde, hasta) / DIAS_MES_COMERCIAL);
}

/** Fecha simple (AAAA-MM-DD) corrida N días. En UTC, para no correrse por la zona. */
export function sumarDiasISO(fecha: Date | string, dias: number): string {
  const base = new Date(typeof fecha === "string" ? `${fecha.slice(0, 10)}T00:00:00Z` : fecha);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/**
 * Fechas nuevas de un empeño renovado.
 *
 * El plazo nuevo corre desde el vencimiento si se renueva a tiempo —el cliente
 * no pierde los días que le quedaban— y desde el día de la renovación si ya
 * estaba vencido, para no entregarle un plazo que ya pasó.
 *
 * Renovar no cambia el interés: el interés se causa por días desde el inicio,
 * sin importar el vencimiento. Lo que exige el negocio es que el interés quede al
 * día al renovar, y eso lo cobra la acción, no esta función.
 */
export function calcularRenovacion(entrada: {
  fechaVencimiento: Date | string;
  fechaRenovacion: Date | string;
  dias: number;
}): { fechaVencimiento: string; fechaLimiteGracia: string } {
  const { dias } = entrada;
  if (!Number.isInteger(dias) || dias <= 0) {
    throw new Error("El plazo de la renovación debe ser un número de días mayor que cero.");
  }

  const vencimiento = sumarDiasISO(entrada.fechaVencimiento, 0);
  const renovacion = sumarDiasISO(entrada.fechaRenovacion, 0);
  const base = renovacion > vencimiento ? renovacion : vencimiento;

  const fechaVencimiento = sumarDiasISO(base, dias);
  return {
    fechaVencimiento,
    fechaLimiteGracia: sumarDiasISO(fechaVencimiento, DIAS_GRACIA_VENCIMIENTO),
  };
}

/**
 * ¿Puede el negocio quedarse con el bien?
 *
 * Solo un empeño activo y vencido. Antes del vencimiento el cliente está dentro
 * del plazo pactado. No se espera a agotar la gracia: la gracia es un margen que
 * el negocio PUEDE dar, no una obligación, y decidirlo es del dueño.
 */
export function puedeDeclararsePerdido(entrada: {
  estado: Empeno["estado"];
  fechaVencimiento: Date | string;
  hoy?: Date | string;
}): boolean {
  if (entrada.estado !== "activo" && entrada.estado !== "vencido") return false;
  const hoy = entrada.hoy === undefined ? new Date() : new Date(entrada.hoy);
  return diasParaVencer(entrada.fechaVencimiento, hoy) < 0;
}

/**
 * Días que faltan para vencer. Negativo si ya venció.
 *
 * ## Por qué se usan métodos UTC y no locales
 *
 * Esta función tiene que dar el mismo resultado sin importar en qué zona horaria
 * corra el servidor, y eso no es un lujo: un servidor en UTC y un dueño en
 * Colombia (UTC−05:00) no pueden discrepar sobre si un empeño vence hoy.
 *
 * La versión anterior usaba `getFullYear()`/`getMonth()`/`getDate()`, que leen la
 * hora local. Con una fecha como `2026-01-08T23:59:00Z`, en Colombia eso ya es el
 * día 8 a las 18:59, así que coincidía; pero en un servidor en UTC+02:00 sería el
 * día 9, y el empeño aparecería como vencido un día antes. Un bug que solo se
 * manifiesta según dónde esté desplegado el servidor es la peor clase de bug.
 *
 * La comparación se hace por día completo: un empeño que vence hoy da 0, sin
 * importar la hora del día en que se consulte.
 */
export function diasParaVencer(
  fechaVencimiento: Date | string,
  hoy: Date = new Date(),
): number {
  const vencimiento = new Date(fechaVencimiento);

  const diaVencimiento = Date.UTC(
    vencimiento.getUTCFullYear(),
    vencimiento.getUTCMonth(),
    vencimiento.getUTCDate(),
  );
  const diaDeHoy = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());

  return Math.round((diaVencimiento - diaDeHoy) / 86_400_000);
}

/**
 * Estado que corresponde según las fechas. El estado guardado manda cuando el
 * empeño ya se cerró (pagado, perdido, renovado); esta función solo resuelve los
 * que siguen corriendo.
 */
export function estadoSegunFechas(entrada: {
  estado: Empeno["estado"];
  fechaVencimiento: Date | string;
  hoy?: Date;
}): EstadoEmpenoSegunFechas {
  const { estado, fechaVencimiento, hoy } = entrada;
  if (estado !== "activo") return estado;

  const dias = diasParaVencer(fechaVencimiento, hoy ?? new Date());
  if (dias < -DIAS_GRACIA_VENCIMIENTO) return "perdido";
  if (dias < 0) return "vencido";
  if (dias <= DIAS_ALERTA_VENCIMIENTO) return "por_vencer";
  return "activo";
}

/** `por_vencer` es un estado derivado, no se guarda en la base. */
export type EstadoEmpenoSegunFechas = Empeno["estado"] | "por_vencer";

export const ETIQUETA_ESTADO_DERIVADO: Record<EstadoEmpenoSegunFechas, string> = {
  activo: "Activo",
  por_vencer: "Por vencer",
  vencido: "Vencido",
  pagado: "Pagado",
  perdido: "Perdido",
  renovado: "Renovado",
};
