/**
 * Esquema de la base de datos.
 *
 * Reglas que se respetan en todo el archivo:
 *
 * 1. Toda tabla de negocio lleva `tenant_id`. Es la columna sobre la que actúa
 *    RLS, así que ninguna tabla de negocio puede quedar sin ella.
 * 2. Los valores cerrados se guardan como `text` con un `CHECK`, no como enum de
 *    Postgres. Agregar un estado es un `ALTER ... CHECK` en vez de una migración
 *    de tipo, que en Postgres es dolorosa.
 * 3. Las columnas de dinero son `bigint` en pesos enteros. El negocio no maneja
 *    centavos y `numeric` abre la puerta a errores de redondeo en JavaScript.
 * 4. Los contactos de proveedor y garante se guardan en línea dentro de la
 *    fila, no como clientes: son datos de una sola transacción y no queremos que
 *    el catálogo de clientes se llene de basura. El comprador de una moto sí es
 *    cliente (`ventas.cliente_id`, migración 0003).
 * 5. No hay llave foránea a `neon_auth."user"`. El id del usuario de auth se
 *    guarda como texto; la integridad la garantiza el webhook de Neon Auth.
 */

import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgSchema,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Esquema de autenticación (propiedad de Neon Auth, solo lectura)     */
/* ------------------------------------------------------------------ */

/**
 * Espejo parcial del esquema que administra Neon Auth. Existe únicamente para
 * poder tipar las lecturas de `neon_auth.user`; las migraciones de este
 * proyecto NO lo crean ni lo modifican.
 */
export const neonAuth = pgSchema("neon_auth");


export const usuarioAuth = neonAuth.table("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Nivel plataforma                                                    */
/* ------------------------------------------------------------------ */

/** Un negocio. Cada dueño ve exactamente un tenant: el suyo. */
export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull(),
    nit: text("nit"),
    telefono: text("telefono"),
    emailContacto: text("email_contacto"),
    ciudad: text("ciudad"),
    direccion: text("direccion"),

    /** `activo` | `suspendido` | `prueba`. */
    estado: text("estado").notNull().default("prueba"),
    /** `basico` | `pro` | `ilimitado`. */
    plan: text("plan").notNull().default("basico"),
    /** Límite de motos en inventario simultáneo. `null` = sin límite. */
    limiteInventario: integer("limite_inventario"),
    /** Tasa de interés mensual por defecto para empeños nuevos, en porcentaje. */
    tasaMensualDefecto: integer("tasa_mensual_defecto").notNull().default(10),

    /** Notas internas del super admin. El dueño no las ve. */
    notasInternas: text("notas_internas"),

    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    check("tenants_estado_check", sql`${tabla.estado} in ('activo', 'suspendido', 'prueba')`),
    check("tenants_plan_check", sql`${tabla.plan} in ('basico', 'pro', 'ilimitado')`),
    check(
      "tenants_tasa_check",
      sql`${tabla.tasaMensualDefecto} >= 0 and ${tabla.tasaMensualDefecto} <= 100`,
    ),
  ],
);

/**
 * Perfil de aplicación de un usuario. Es el puente entre el usuario de Neon Auth
 * y el negocio al que pertenece.
 *
 * `tenant_id` es nulo solo para el super admin, que no pertenece a ningún
 * negocio y opera desde `/admin`.
 */
export const usuarios = pgTable(
  "usuarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Id del usuario en `neon_auth.user`. */
    authUserId: text("auth_user_id").notNull().unique(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),

    email: text("email").notNull(),
    nombre: text("nombre").notNull(),
    telefono: text("telefono"),

    /** `owner` | `super_admin`. */
    rol: text("rol").notNull().default("owner"),
    activo: boolean("activo").notNull().default(true),
    ultimoAcceso: timestamp("ultimo_acceso", { withTimezone: true }),

    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    check("usuarios_rol_check", sql`${tabla.rol} in ('owner', 'super_admin')`),
    // Un dueño sin negocio no tiene sentido; un super admin sin negocio es lo normal.
    check(
      "usuarios_tenant_por_rol_check",
      sql`(${tabla.rol} = 'owner' and ${tabla.tenantId} is not null) or (${tabla.rol} = 'super_admin')`,
    ),
    index("usuarios_tenant_idx").on(tabla.tenantId),
    index("usuarios_email_idx").on(tabla.email),
  ],
);

/** Solicitudes de demo que llegan desde la landing pública. No tiene tenant. */
export const solicitudesDemo = pgTable(
  "solicitudes_demo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull(),
    negocio: text("negocio").notNull(),
    telefono: text("telefono").notNull(),
    email: text("email"),
    ciudad: text("ciudad"),
    /** Qué quiere resolver, en sus palabras. */
    mensaje: text("mensaje"),
    /** `nueva` | `contactada` | `convertida` | `descartada`. */
    estado: text("estado").notNull().default("nueva"),
    /** Autorización de tratamiento de datos (Ley 1581). Obligatoria desde 0005. */
    aceptaTratamientoDatos: boolean("acepta_tratamiento_datos").notNull().default(false),
    /** Autorización opcional para recibir comunicaciones comerciales. */
    aceptaComunicaciones: boolean("acepta_comunicaciones").notNull().default(false),
    /** Cuándo se dieron las autorizaciones: la constancia que pide la ley. */
    consentimientoEn: timestamp("consentimiento_en", { withTimezone: true }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    // `not valid` en la migración: las filas anteriores a 0005 no lo cumplen.
    check(
      "solicitudes_demo_consentimiento_check",
      sql`${tabla.aceptaTratamientoDatos} and ${tabla.consentimientoEn} is not null`,
    ),
    check(
      "solicitudes_demo_estado_check",
      sql`${tabla.estado} in ('nueva', 'contactada', 'convertida', 'descartada')`,
    ),
    index("solicitudes_demo_creado_idx").on(tabla.creadoEn),
  ],
);

/* ------------------------------------------------------------------ */
/* Clientes                                                            */
/* ------------------------------------------------------------------ */

/** Catálogo de clientes del negocio. Compartido por ambos módulos. */
export const clientes = pgTable(
  "clientes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** `CC` | `CE` | `NIT` | `PP` | `TI`. */
    tipoDocumento: text("tipo_documento").notNull().default("CC"),
    numeroDocumento: text("numero_documento").notNull(),
    nombres: text("nombres").notNull(),
    apellidos: text("apellidos"),
    telefono: text("telefono").notNull(),
    telefonoAlterno: text("telefono_alterno"),
    email: text("email"),
    direccion: text("direccion"),
    ciudad: text("ciudad"),
    notas: text("notas"),

    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    unique("clientes_tenant_documento_unique").on(tabla.tenantId, tabla.numeroDocumento),
    // Respaldo de la llave compuesta `ventas (tenant_id, cliente_id)`.
    unique("clientes_tenant_id_unique").on(tabla.tenantId, tabla.id),
    check(
      "clientes_tipo_documento_check",
      sql`${tabla.tipoDocumento} in ('CC', 'CE', 'NIT', 'PP', 'TI')`,
    ),
    index("clientes_tenant_idx").on(tabla.tenantId),
    index("clientes_nombres_idx").on(tabla.tenantId, tabla.nombres),
  ],
);

/* ------------------------------------------------------------------ */
/* Super administración (migración 0004)                               */
/* ------------------------------------------------------------------ */

/**
 * Registro de lo que hace el super admin. Solo se inserta y se lee (el rol de
 * la app no tiene UPDATE ni DELETE). `negocio_id` no es llave foránea: el
 * registro de un negocio borrado sobrevive al negocio.
 */
export const auditoriaAdmin = pgTable(
  "auditoria_admin",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
    usuarioEmail: text("usuario_email").notNull(),
    accion: text("accion").notNull(),
    negocioId: uuid("negocio_id"),
    negocioNombre: text("negocio_nombre"),
    detalle: jsonb("detalle").$type<Record<string, unknown>>().notNull().default({}),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index("auditoria_admin_creado_idx").on(tabla.creadoEn),
    index("auditoria_admin_negocio_idx").on(tabla.negocioId, tabla.creadoEn),
  ],
);

/**
 * Modo soporte: el super admin atiende un negocio por un tiempo limitado y con
 * motivo. `app.contexto_usuario` lee esta tabla para resolver el negocio.
 */
export const impersonaciones = pgTable(
  "impersonaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    superAdminId: uuid("super_admin_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    negocioId: uuid("negocio_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    motivo: text("motivo").notNull(),
    iniciadaEn: timestamp("iniciada_en", { withTimezone: true }).notNull().defaultNow(),
    expiraEn: timestamp("expira_en", { withTimezone: true }).notNull(),
    terminadaEn: timestamp("terminada_en", { withTimezone: true }),
  },
  (tabla) => [
    uniqueIndex("impersonaciones_abierta_unique").on(tabla.superAdminId).where(sql`${tabla.terminadaEn} is null`),
  ],
);

/* ------------------------------------------------------------------ */
/* Módulo Compra/Venta                                                 */
/* ------------------------------------------------------------------ */

/**
 * Inventario de motos para compra y venta.
 *
 * La venta no vive aquí: al registrarla se crea una fila en `ventas` y `estado`
 * pasa a `vendida`. La moto solo guarda el precio al que se ofrece.
 */
export const motos = pgTable(
  "motos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    placa: text("placa").notNull(),
    marca: text("marca").notNull(),
    modelo: text("modelo").notNull(),
    anio: integer("anio").notNull(),
    color: text("color").notNull(),
    cilindraje: integer("cilindraje"),
    numeroMotor: text("numero_motor"),
    numeroChasis: text("numero_chasis"),

    /* --- Compra --- */
    precioCompra: bigint("precio_compra", { mode: "number" }).notNull(),
    fechaCompra: date("fecha_compra").notNull(),
    proveedorNombre: text("proveedor_nombre"),
    proveedorCedula: text("proveedor_cedula"),
    proveedorTelefono: text("proveedor_telefono"),

    /** Precio al que se ofrece. La venta real (precio pactado, comprador) está en `ventas`. */
    precioPublicado: bigint("precio_publicado", { mode: "number" }),

    /** `disponible` | `reservada` | `en_reparacion` | `vendida` | `devuelta` | `dada_de_baja`. */
    estado: text("estado").notNull().default("disponible"),
    descripcion: text("descripcion"),
    /** Borrado lógico (migración 0002): fuera de listados y reportes. */
    eliminadaEn: timestamp("eliminada_en", { withTimezone: true }),

    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    // Una placa solo puede estar una vez entre las motos NO eliminadas: borrar
    // una moto registrada por error no impide volver a registrarla.
    uniqueIndex("motos_tenant_placa_unique")
      .on(tabla.tenantId, tabla.placa)
      .where(sql`${tabla.eliminadaEn} is null`),
    check(
      "motos_estado_check",
      sql`${tabla.estado} in ('disponible', 'reservada', 'en_reparacion', 'vendida', 'devuelta', 'dada_de_baja')`,
    ),
    check("motos_precio_compra_check", sql`${tabla.precioCompra} > 0`),
    check(
      "motos_precio_publicado_check",
      sql`${tabla.precioPublicado} is null or ${tabla.precioPublicado} > 0`,
    ),
    check("motos_anio_check", sql`${tabla.anio} between 1950 and 2100`),
    // Respaldo de la llave compuesta `ventas (tenant_id, moto_id)`.
    unique("motos_tenant_id_unique").on(tabla.tenantId, tabla.id),
    // Índices para el buscador del inventario.
    index("motos_tenant_estado_idx").on(tabla.tenantId, tabla.estado),
    index("motos_tenant_creado_idx").on(tabla.tenantId, tabla.creadoEn),
    index("motos_tenant_marca_idx").on(tabla.tenantId, tabla.marca),
    index("motos_proveedor_cedula_idx").on(tabla.tenantId, tabla.proveedorCedula),
  ],
);


/**
 * Ventas de motos (migración 0003).
 *
 * Una fila por venta. Una devolución la marca `devuelta` sin borrarla, y la moto
 * puede venderse de nuevo: por eso una moto tiene a lo sumo UNA venta `activa`.
 * `descuento_aplicado` es una columna generada por la base.
 */
export const ventas = pgTable(
  "ventas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    motoId: uuid("moto_id").notNull(),
    clienteId: uuid("cliente_id").notNull(),

    precioPublicado: bigint("precio_publicado", { mode: "number" }),
    precioPactado: bigint("precio_pactado", { mode: "number" }).notNull(),
    descuentoAplicado: bigint("descuento_aplicado", { mode: "number" }).generatedAlwaysAs(
      sql`case when precio_publicado is null then 0 else precio_publicado - precio_pactado end`,
    ),

    fecha: date("fecha").notNull(),
    /** `efectivo` | `transferencia` | `otro`. */
    metodoPago: text("metodo_pago").notNull().default("efectivo"),
    observaciones: text("observaciones"),

    /** `activa` | `devuelta`. */
    estado: text("estado").notNull().default("activa"),
    devueltaEn: timestamp("devuelta_en", { withTimezone: true }),

    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    foreignKey({
      name: "ventas_moto_fk",
      columns: [tabla.tenantId, tabla.motoId],
      foreignColumns: [motos.tenantId, motos.id],
    }),
    foreignKey({
      name: "ventas_cliente_fk",
      columns: [tabla.tenantId, tabla.clienteId],
      foreignColumns: [clientes.tenantId, clientes.id],
    }),
    check("ventas_precio_pactado_check", sql`${tabla.precioPactado} > 0`),
    check(
      "ventas_precio_publicado_check",
      sql`${tabla.precioPublicado} is null or ${tabla.precioPublicado} > 0`,
    ),
    check("ventas_metodo_pago_check", sql`${tabla.metodoPago} in ('efectivo', 'transferencia', 'otro')`),
    check("ventas_estado_check", sql`${tabla.estado} in ('activa', 'devuelta')`),
    check("ventas_devuelta_check", sql`(${tabla.estado} = 'devuelta') = (${tabla.devueltaEn} is not null)`),
    uniqueIndex("ventas_moto_activa_unique").on(tabla.motoId).where(sql`${tabla.estado} = 'activa'`),
    index("ventas_tenant_fecha_idx").on(tabla.tenantId, tabla.fecha),
    index("ventas_cliente_idx").on(tabla.clienteId),
  ],
);

/* ------------------------------------------------------------------ */
/* Módulo Empeño                                                       */
/* ------------------------------------------------------------------ */

/**
 * Motos y carros empeñados. Van juntos porque comparten todos los campos de
 * identificación vehicular; `tipo` los distingue.
 *
 * Estos vehículos NO están en la tabla `motos`: un vehículo empeñado todavía no
 * es del negocio, y mezclarlos contaminaría el inventario y la ganancia.
 */
export const vehiculosEmpeno = pgTable(
  "vehiculos_empeno",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** `moto` | `carro`. */
    tipo: text("tipo").notNull(),
    placa: text("placa").notNull(),
    marca: text("marca").notNull(),
    modelo: text("modelo").notNull(),
    anio: integer("anio").notNull(),
    color: text("color").notNull(),
    numeroMotor: text("numero_motor"),
    numeroChasis: text("numero_chasis"),

    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    check("vehiculos_empeno_tipo_check", sql`${tabla.tipo} in ('moto', 'carro')`),
    check("vehiculos_empeno_anio_check", sql`${tabla.anio} between 1950 and 2100`),
    unique("vehiculos_empeno_tenant_placa_unique").on(tabla.tenantId, tabla.placa),
    index("vehiculos_empeno_tenant_idx").on(tabla.tenantId),
    index("vehiculos_empeno_placa_idx").on(tabla.tenantId, tabla.placa),
  ],
);

/** Teléfonos empeñados. Tabla aparte porque un teléfono no tiene placa. */
export const telefonosEmpeno = pgTable(
  "telefonos_empeno",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    marca: text("marca").notNull(),
    modelo: text("modelo").notNull(),
    imei: text("imei"),
    capacidad: text("capacidad"),
    color: text("color").notNull(),

    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    unique("telefonos_empeno_tenant_imei_unique").on(tabla.tenantId, tabla.imei),
    index("telefonos_empeno_tenant_idx").on(tabla.tenantId),
  ],
);

/**
 * Empeño: un bien entregado en garantía a cambio de un capital.
 *
 * El capital del empeño es el de la fila, no el del bien: el mismo bien puede
 * volver a empeñarse después con otro monto.
 */
export const empenos = pgTable(
  "empenos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** Consecutivo legible que el negocio le entrega al cliente. */
    numero: text("numero").notNull(),

    clienteId: uuid("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "restrict" }),
    // Congelamos los datos del cliente: si cambia de nombre o teléfono, el
    // contrato original sigue mostrando lo que se firmó.
    clienteNombre: text("cliente_nombre").notNull(),
    clienteCedula: text("cliente_cedula").notNull(),
    clienteTelefono: text("cliente_telefono"),

    /**
     * `moto` | `carro` | `telefono` | `otro`. Decide dónde está el bien: en
     * `vehiculos_empeno`, en `telefonos_empeno` o, si es «otro», en las columnas
     * `bien_*` y `valor_tasacion` de esta misma fila (0006).
     */
    tipoBien: text("tipo_bien").notNull(),
    vehiculoId: uuid("vehiculo_id").references(() => vehiculosEmpeno.id, { onDelete: "restrict" }),
    telefonoId: uuid("telefono_id").references(() => telefonosEmpeno.id, { onDelete: "restrict" }),
    /** Solo para `otro`: qué es el bien. */
    bienDescripcion: text("bien_descripcion"),
    /** Solo para `otro`, opcional: serie o referencia. */
    bienIdentificador: text("bien_identificador"),
    /** Solo para `otro`: en cuánto se tasó el bien, en pesos. */
    valorTasacion: bigint("valor_tasacion", { mode: "number" }),

    capital: bigint("capital", { mode: "number" }).notNull(),
    /** Interés mensual en porcentaje, por ejemplo 10 para 10% mensual. */
    tasaMensual: bigint("tasa_mensual", { mode: "number" }).notNull(),
    /** `mensual` | `quincenal` | `semanal` | `diario`. */
    frecuenciaPago: text("frecuencia_pago").notNull().default("mensual"),
    fechaInicio: date("fecha_inicio").notNull(),
    fechaVencimiento: date("fecha_vencimiento").notNull(),
    /** Después de esta fecha el bien se considera perdido. */
    fechaLimiteGracia: date("fecha_limite_gracia").notNull(),

    /** `activo` | `pagado` | `vencido` | `perdido` | `renovado`. */
    estado: text("estado").notNull().default("activo"),

    garanteNombre: text("garante_nombre"),
    garanteCedula: text("garante_cedula"),
    garanteTelefono: text("garante_telefono"),

    observaciones: text("observaciones"),

    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    unique("empenos_tenant_numero_unique").on(tabla.tenantId, tabla.numero),
    check(
      "empenos_tipo_bien_check",
      sql`${tabla.tipoBien} in ('moto', 'carro', 'telefono', 'otro')`,
    ),
    check(
      "empenos_estado_check",
      sql`${tabla.estado} in ('activo', 'pagado', 'vencido', 'perdido', 'renovado')`,
    ),
    check(
      "empenos_frecuencia_check",
      sql`${tabla.frecuenciaPago} in ('mensual', 'quincenal', 'semanal', 'diario')`,
    ),
    check("empenos_capital_check", sql`${tabla.capital} > 0`),
    check("empenos_tasa_check", sql`${tabla.tasaMensual} >= 0 and ${tabla.tasaMensual} <= 100`),
    check(
      "empenos_fechas_check",
      sql`${tabla.fechaVencimiento} > ${tabla.fechaInicio} and ${tabla.fechaLimiteGracia} >= ${tabla.fechaVencimiento}`,
    ),
    // El bien es exactamente uno y coincide con tipo_bien: vehículo, teléfono o,
    // si es «otro», su descripción y su valor de tasación.
    check(
      "empenos_bien_coherente_check",
      sql`(
        (${tabla.tipoBien} = 'telefono' and ${tabla.telefonoId} is not null and ${tabla.vehiculoId} is null)
        or (${tabla.tipoBien} in ('moto', 'carro') and ${tabla.vehiculoId} is not null and ${tabla.telefonoId} is null)
        or (
          ${tabla.tipoBien} = 'otro' and ${tabla.vehiculoId} is null and ${tabla.telefonoId} is null
          and ${tabla.bienDescripcion} is not null and ${tabla.valorTasacion} is not null
        )
      )`,
    ),
    check(
      "empenos_valor_tasacion_check",
      sql`${tabla.valorTasacion} is null or ${tabla.valorTasacion} > 0`,
    ),
    index("empenos_tenant_estado_idx").on(tabla.tenantId, tabla.estado),
    index("empenos_tenant_vencimiento_idx").on(tabla.tenantId, tabla.fechaVencimiento),
    index("empenos_cliente_idx").on(tabla.clienteId),
  ],
);

/**
 * Último número de empeño usado por cada negocio (0006). El alta lo avanza con
 * `on conflict do update … returning` en su misma transacción, así que dos altas
 * simultáneas no reciben el mismo número. Solo avanza: la app no puede borrarlo.
 */
export const consecutivosEmpeno = pgTable(
  "consecutivos_empeno",
  {
    tenantId: uuid("tenant_id")
      .primaryKey()
      .references(() => tenants.id, { onDelete: "cascade" }),
    ultimo: bigint("ultimo", { mode: "number" }).notNull().default(0),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [check("consecutivos_empeno_ultimo_check", sql`${tabla.ultimo} >= 0`)],
);

/**
 * Abonos de un empeño. Cada pago de interés o de capital es una fila; el saldo
 * se calcula sumando, no se guarda, para que corregir un abono corrija el saldo.
 */
export const abonos = pgTable(
  "abonos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    empenoId: uuid("empeno_id")
      .notNull()
      .references(() => empenos.id, { onDelete: "cascade" }),

    monto: bigint("monto", { mode: "number" }).notNull(),
    aInteres: bigint("a_interes", { mode: "number" }).notNull().default(0),
    aCapital: bigint("a_capital", { mode: "number" }).notNull().default(0),
    /** `interes` | `capital` | `ambos`. */
    concepto: text("concepto").notNull().default("interes"),
    /** `efectivo` | `transferencia` | `otro`. */
    metodoPago: text("metodo_pago").notNull().default("efectivo"),
    fecha: date("fecha").notNull(),
    nota: text("nota"),

    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    check("abonos_monto_check", sql`${tabla.monto} > 0`),
    check("abonos_reparto_check", sql`${tabla.aInteres} >= 0 and ${tabla.aCapital} >= 0`),
    check(
      "abonos_concepto_check",
      sql`${tabla.concepto} in ('interes', 'capital', 'ambos')`,
    ),
    check(
      "abonos_metodo_pago_check",
      sql`${tabla.metodoPago} in ('efectivo', 'transferencia', 'otro')`,
    ),
    index("abonos_empeno_idx").on(tabla.empenoId, tabla.fecha),
    index("abonos_tenant_idx").on(tabla.tenantId),
  ],
);

/* ------------------------------------------------------------------ */
/* Gastos                                                              */
/* ------------------------------------------------------------------ */

/**
 * Gastos del negocio. `moto_id` permite calcular la ganancia neta de una venta
 * específica; cuando es nulo, el gasto es general del período.
 *
 * `modulo` evita que un gasto de empeño aparezca en el reporte de compra/venta.
 */
export const gastos = pgTable(
  "gastos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    /** `compra_venta` | `empeno`. */
    modulo: text("modulo").notNull(),
    motoId: uuid("moto_id").references(() => motos.id, { onDelete: "set null" }),
    empenoId: uuid("empeno_id").references(() => empenos.id, { onDelete: "set null" }),

    monto: bigint("monto", { mode: "number" }).notNull(),
    fecha: date("fecha").notNull(),
    /** `reparacion` | `repuestos` | `tramites` | `transporte` | `publicidad` | `nomina` | `arriendo` | `otro`. */
    categoria: text("categoria").notNull(),
    descripcion: text("descripcion"),

    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    check("gastos_modulo_check", sql`${tabla.modulo} in ('compra_venta', 'empeno')`),
    check("gastos_monto_check", sql`${tabla.monto} > 0`),
    check(
      "gastos_categoria_check",
      sql`${tabla.categoria} in ('reparacion', 'repuestos', 'tramites', 'transporte', 'publicidad', 'nomina', 'arriendo', 'otro')`,
    ),
    index("gastos_tenant_fecha_idx").on(tabla.tenantId, tabla.fecha),
    index("gastos_moto_idx").on(tabla.motoId),
    index("gastos_empeno_idx").on(tabla.empenoId),
  ],
);

/* ------------------------------------------------------------------ */
/* Relaciones para las consultas de Drizzle                            */
/* ------------------------------------------------------------------ */

export const tenantsRelations = relations(tenants, ({ many }) => ({
  usuarios: many(usuarios),
  clientes: many(clientes),
  motos: many(motos),
  empenos: many(empenos),
}));

export const usuariosRelations = relations(usuarios, ({ one }) => ({
  tenant: one(tenants, { fields: [usuarios.tenantId], references: [tenants.id] }),
}));

export const clientesRelations = relations(clientes, ({ one, many }) => ({
  tenant: one(tenants, { fields: [clientes.tenantId], references: [tenants.id] }),
  empenos: many(empenos),
}));

export const motosRelations = relations(motos, ({ one, many }) => ({
  tenant: one(tenants, { fields: [motos.tenantId], references: [tenants.id] }),
  gastos: many(gastos),
  ventas: many(ventas),
}));

export const ventasRelations = relations(ventas, ({ one }) => ({
  tenant: one(tenants, { fields: [ventas.tenantId], references: [tenants.id] }),
  moto: one(motos, { fields: [ventas.motoId], references: [motos.id] }),
  cliente: one(clientes, { fields: [ventas.clienteId], references: [clientes.id] }),
}));

export const vehiculosEmpenoRelations = relations(vehiculosEmpeno, ({ one, many }) => ({
  tenant: one(tenants, { fields: [vehiculosEmpeno.tenantId], references: [tenants.id] }),
  empenos: many(empenos),
}));

export const telefonosEmpenoRelations = relations(telefonosEmpeno, ({ one, many }) => ({
  tenant: one(tenants, { fields: [telefonosEmpeno.tenantId], references: [tenants.id] }),
  empenos: many(empenos),
}));

export const empenosRelations = relations(empenos, ({ one, many }) => ({
  tenant: one(tenants, { fields: [empenos.tenantId], references: [tenants.id] }),
  cliente: one(clientes, { fields: [empenos.clienteId], references: [clientes.id] }),
  vehiculo: one(vehiculosEmpeno, {
    fields: [empenos.vehiculoId],
    references: [vehiculosEmpeno.id],
  }),
  telefono: one(telefonosEmpeno, {
    fields: [empenos.telefonoId],
    references: [telefonosEmpeno.id],
  }),
  abonos: many(abonos),
}));

export const abonosRelations = relations(abonos, ({ one }) => ({
  tenant: one(tenants, { fields: [abonos.tenantId], references: [tenants.id] }),
  empeno: one(empenos, { fields: [abonos.empenoId], references: [empenos.id] }),
}));

export const gastosRelations = relations(gastos, ({ one }) => ({
  tenant: one(tenants, { fields: [gastos.tenantId], references: [tenants.id] }),
  moto: one(motos, { fields: [gastos.motoId], references: [motos.id] }),
  empeno: one(empenos, { fields: [gastos.empenoId], references: [empenos.id] }),
}));
