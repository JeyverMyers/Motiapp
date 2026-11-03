/**
 * Valores cerrados del negocio.
 *
 * Se declaran como tuplas `as const` y no como enums de TypeScript: la tupla
 * sirve a la vez para Zod (`z.enum`), para las columnas de Drizzle y para los
 * `CHECK` de Postgres, así que hay una sola fuente de verdad. Las migraciones
 * SQL se escriben a mano con estos mismos valores; si cambias uno aquí, cambia
 * también `drizzle/0001_esquema_inicial.sql`.
 */

/* ------------------------------------------------------------------ */
/* Multi-tenant                                                        */
/* ------------------------------------------------------------------ */

export const ROLES = ["owner", "super_admin"] as const;
export type Rol = (typeof ROLES)[number];

export const ETIQUETA_ROL: Record<Rol, string> = {
  owner: "Dueño de negocio",
  super_admin: "Super administrador",
};

export const PLANES = ["basico", "pro", "ilimitado"] as const;
export type Plan = (typeof PLANES)[number];

export const ETIQUETA_PLAN: Record<Plan, string> = {
  basico: "Negociante",
  pro: "Empresa",
  ilimitado: "Ilimitado",
};

export const ESTADOS_TENANT = ["activo", "suspendido", "prueba"] as const;
export type EstadoTenant = (typeof ESTADOS_TENANT)[number];

export const ETIQUETA_ESTADO_TENANT: Record<EstadoTenant, string> = {
  activo: "Activo",
  suspendido: "Suspendido",
  prueba: "En prueba",
};

/* ------------------------------------------------------------------ */
/* Módulo Compra/Venta                                                 */
/* ------------------------------------------------------------------ */

export const ESTADOS_MOTO = [
  "disponible",
  "reservada",
  "en_reparacion",
  "vendida",
  "devuelta",
  "dada_de_baja",
] as const;
export type EstadoMoto = (typeof ESTADOS_MOTO)[number];

export const ETIQUETA_ESTADO_MOTO: Record<EstadoMoto, string> = {
  disponible: "Disponible",
  reservada: "Reservada",
  en_reparacion: "En reparación",
  vendida: "Vendida",
  devuelta: "Devuelta",
  dada_de_baja: "Dada de baja",
};

/* ------------------------------------------------------------------ */
/* Módulo Empeño                                                       */
/* ------------------------------------------------------------------ */

/** Tipos de bien que el negocio acepta en empeño. */
export const TIPOS_BIEN = ["moto", "carro", "telefono", "otro"] as const;
export type TipoBien = (typeof TIPOS_BIEN)[number];

export const ETIQUETA_TIPO_BIEN: Record<TipoBien, string> = {
  moto: "Moto",
  carro: "Carro",
  telefono: "Teléfono",
  otro: "Otro bien",
};

export const ESTADOS_EMPENO = [
  "activo",
  "pagado",
  "vencido",
  "perdido",
  "renovado",
] as const;
export type EstadoEmpeno = (typeof ESTADOS_EMPENO)[number];

export const ETIQUETA_ESTADO_EMPENO: Record<EstadoEmpeno, string> = {
  activo: "Activo",
  pagado: "Pagado",
  vencido: "Vencido",
  perdido: "Perdido",
  renovado: "Renovado",
};

/**
 * Frecuencia con que se causa el interés. La tasa se guarda siempre mensual;
 * esta frecuencia solo reparte el cobro dentro del mes.
 */
export const FRECUENCIAS_PAGO = ["mensual", "quincenal", "semanal", "diario"] as const;
export type FrecuenciaPago = (typeof FRECUENCIAS_PAGO)[number];

export const ETIQUETA_FRECUENCIA_PAGO: Record<FrecuenciaPago, string> = {
  mensual: "Mensual",
  quincenal: "Quincenal",
  semanal: "Semanal",
  diario: "Diario",
};

export const METODOS_PAGO = ["efectivo", "transferencia", "otro"] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export const ETIQUETA_METODO_PAGO: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  otro: "Otro",
};

/* ------------------------------------------------------------------ */
/* Clientes, gastos y comercial                        */
/* ------------------------------------------------------------------ */

export const TIPOS_DOCUMENTO = ["CC", "CE", "NIT", "PP", "TI"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const ETIQUETA_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  CC: "Cédula de ciudadanía",
  CE: "Cédula de extranjería",
  NIT: "NIT",
  PP: "Pasaporte",
  TI: "Tarjeta de identidad",
};

export const CATEGORIAS_GASTO = [
  "reparacion",
  "repuestos",
  "tramites",
  "transporte",
  "publicidad",
  "nomina",
  "arriendo",
  "otro",
] as const;
export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number];

export const ETIQUETA_CATEGORIA_GASTO: Record<CategoriaGasto, string> = {
  reparacion: "Reparación",
  repuestos: "Repuestos",
  tramites: "Trámites",
  transporte: "Transporte",
  publicidad: "Publicidad",
  nomina: "Nómina",
  arriendo: "Arriendo",
  otro: "Otro",
};

/** Los gastos se cuelgan de un módulo para que los reportes no se mezclen. */
export const MODULOS = ["compra_venta", "empeno"] as const;
export type Modulo = (typeof MODULOS)[number];

export const ETIQUETA_MODULO: Record<Modulo, string> = {
  compra_venta: "Compra/Venta",
  empeno: "Empeño",
};

export const ESTADOS_SOLICITUD = ["nueva", "contactada", "convertida", "descartada"] as const;
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];
