/**
 * Operaciones de plataforma (super administración).
 *
 * Este es el único lugar del código que usa `conAdmin()`, que marca la
 * transacción con `app.es_super_admin = 'true'`. Esa marca es local a la
 * transacción, así que no puede filtrarse a una petición de un dueño.
 *
 * Nada de aquí puede llamarse desde el panel de un negocio: las funciones
 * reciben el rol ya verificado por `requerirSuperAdmin()` en la Server Action.
 */

import { and, asc, count, desc, eq, gt, isNull, sql } from "drizzle-orm";

import { conAdmin } from "@/db";
import { auditoriaAdmin, clientes, empenos, impersonaciones, motos, tenants, usuarios } from "@/db/schema";
import type { Plan, EstadoTenant } from "@/domain/enums";
import { ErrorNegocio } from "@/domain/errores";
import {
  HORAS_SESION_SOPORTE,
  cambiosEntre,
  confirmacionCoincide,
  negocioEstaVacio,
  type ConteoNegocio,
  type CrearNegocioInput,
  type EditarNegocioInput,
  type PlanYEstadoInput,
} from "@/domain/negocio";

export type TenantListado = {
  id: string;
  nombre: string;
  nit: string | null;
  ciudad: string | null;
  telefono: string | null;
  estado: string;
  plan: string;
  creadoEn: Date;
  usuariosActivos: number;
  motosEnInventario: number;
  empenosActivos: number;
};

/** Listado de negocios con sus contadores. Solo super administración. */
export async function listarTenants(): Promise<TenantListado[]> {
  return conAdmin(async (tx) => {
    const filas = await tx
      .select({
        id: tenants.id,
        nombre: tenants.nombre,
        nit: tenants.nit,
        ciudad: tenants.ciudad,
        telefono: tenants.telefono,
        estado: tenants.estado,
        plan: tenants.plan,
        creadoEn: tenants.creadoEn,
        usuariosActivos: sql<number>`(
          select count(*) from ${usuarios} u
          where u.tenant_id = ${tenants.id} and u.activo
        )::int`,
        motosEnInventario: sql<number>`(
          select count(*) from ${motos} m
          where m.tenant_id = ${tenants.id}
            and m.estado in ('disponible', 'reservada', 'en_reparacion')
        )::int`,
        empenosActivos: sql<number>`(
          select count(*) from ${empenos} e
          where e.tenant_id = ${tenants.id} and e.estado = 'activo'
        )::int`,
      })
      .from(tenants)
      .orderBy(asc(tenants.nombre));

    return filas;
  });
}

/** Métricas globales del negocio propio (Motiapp como SaaS). */
export async function metricasGlobales() {
  return conAdmin(async (tx) => {
    const [totales] = await tx
      .select({
        negocios: count(),
        activos: sql<number>`count(*) filter (where ${tenants.estado} = 'activo')::int`,
        enPrueba: sql<number>`count(*) filter (where ${tenants.estado} = 'prueba')::int`,
        suspendidos: sql<number>`count(*) filter (where ${tenants.estado} = 'suspendido')::int`,
      })
      .from(tenants);

    const [operacion] = await tx
      .select({
        motosTotales: sql<number>`(select count(*) from ${motos})::int`,
        empenosTotales: sql<number>`(select count(*) from ${empenos})::int`,
        clientesTotales: sql<number>`(select count(*) from ${clientes})::int`,
        usuariosTotales: sql<number>`(select count(*) from ${usuarios})::int`,
      })
      .from(tenants)
      .limit(1);

    return {
      negocios: Number(totales?.negocios ?? 0),
      activos: Number(totales?.activos ?? 0),
      enPrueba: Number(totales?.enPrueba ?? 0),
      suspendidos: Number(totales?.suspendidos ?? 0),
      motosTotales: Number(operacion?.motosTotales ?? 0),
      empenosTotales: Number(operacion?.empenosTotales ?? 0),
      clientesTotales: Number(operacion?.clientesTotales ?? 0),
      usuariosTotales: Number(operacion?.usuariosTotales ?? 0),
    };
  });
}

/** Ficha de un negocio. */
export async function obtenerTenant(tenantId: string) {
  return conAdmin(async (tx) => {
    const [fila] = await tx
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    return fila ?? null;
  });
}

/** Usuarios de un negocio, para la ficha de super administración. */
export async function listarUsuariosDeTenant(tenantId: string) {
  return conAdmin(async (tx) =>
    tx
      .select({
        id: usuarios.id,
        email: usuarios.email,
        nombre: usuarios.nombre,
        rol: usuarios.rol,
        activo: usuarios.activo,
        ultimoAcceso: usuarios.ultimoAcceso,
      })
      .from(usuarios)
      .where(eq(usuarios.tenantId, tenantId))
      .orderBy(asc(usuarios.nombre)),
  );
}

/* ------------------------------------------------------------------ */
/* Escrituras                                                          */
/* ------------------------------------------------------------------ */

export type CrearTenantInput = {
  nombre: string;
  nit?: string;
  telefono?: string;
  emailContacto?: string;
  ciudad?: string;
  direccion?: string;
  plan?: Plan;
  estado?: EstadoTenant;
  limiteInventario?: number;
  /** Si se indica, se crea el perfil del dueño enlazado a ese usuario de Neon Auth. */
  authUserIdDueno?: string;
  emailDueno?: string;
  nombreDueno?: string;
};

/**
 * Crea el negocio y, si se pasa el id de un usuario de Neon Auth, su perfil de
 * dueño en la misma transacción.
 *
 * El id del usuario de auth tiene que venir de Neon Auth (por ejemplo, de la
 * consola de Neon o del webhook de alta); no se inventa aquí.
 */
export async function crearTenantConDueno(datos: CrearTenantInput) {
  return conAdmin(async (tx) => {
    const [tenant] = await tx
      .insert(tenants)
      .values({
        nombre: datos.nombre,
        nit: datos.nit,
        telefono: datos.telefono,
        emailContacto: datos.emailContacto,
        ciudad: datos.ciudad,
        direccion: datos.direccion,
        plan: datos.plan ?? "basico",
        estado: datos.estado ?? "prueba",
        limiteInventario: datos.limiteInventario,
      })
      .returning();

    if (!tenant) throw new Error("No se pudo crear el negocio.");

    if (datos.authUserIdDueno && datos.emailDueno) {
      await tx.insert(usuarios).values({
        authUserId: datos.authUserIdDueno,
        tenantId: tenant.id,
        email: datos.emailDueno,
        nombre: datos.nombreDueno ?? datos.emailDueno,
        rol: "owner",
        activo: true,
      });
    }

    return tenant;
  });
}

/** Cambia estado, plan o límites de un negocio. Solo super administración. */
export async function actualizarTenant(
  tenantId: string,
  cambios: {
    estado?: EstadoTenant;
    plan?: Plan;
    limiteInventario?: number | null;
    notasInternas?: string;
    tasaMensualDefecto?: number;
  },
) {
  return conAdmin(async (tx) => {
    const [fila] = await tx
      .update(tenants)
      .set({ ...cambios, actualizadoEn: new Date() })
      .where(eq(tenants.id, tenantId))
      .returning();
    return fila ?? null;
  });
}

/** Cuenta los negocios existentes. Se usa para avisar antes de crear el primero. */
export async function contarTenants(): Promise<number> {
  // `conAdmin` y no `sinContexto`: sin contexto la política de `tenants` no
  // deja ver ninguna fila y esto devolvería 0 siempre.
  return conAdmin(async (tx) => {
    const [fila] = await tx.select({ total: count() }).from(tenants);
    return Number(fila?.total ?? 0);
  });
}

/* ------------------------------------------------------------------ */
/* Bloque 6: operaciones auditadas                                     */
/* ------------------------------------------------------------------ */

/** Quién hace la operación: el super admin de la sesión. */
export type Actor = { usuarioId: string; email: string };

type AccionAuditoria =
  | "crear_negocio"
  | "editar_negocio"
  | "cambiar_plan"
  | "cambiar_estado"
  | "asignar_dueno"
  | "cambiar_acceso_usuario"
  | "eliminar_negocio"
  | "iniciar_soporte"
  | "terminar_soporte";

type TxAdmin = Parameters<Parameters<typeof conAdmin>[0]>[0];

/**
 * Deja la fila de auditoría en la MISMA transacción que la operación: o quedan
 * las dos o ninguna. No hay forma de hacer algo desde /admin sin dejar rastro.
 */
async function auditar(
  tx: TxAdmin,
  actor: Actor,
  accion: AccionAuditoria,
  negocio: { id: string; nombre: string } | null,
  detalle: Record<string, unknown> = {},
) {
  await tx.insert(auditoriaAdmin).values({
    usuarioId: actor.usuarioId,
    usuarioEmail: actor.email,
    accion,
    negocioId: negocio?.id ?? null,
    negocioNombre: negocio?.nombre ?? null,
    detalle,
  });
}

async function negocioOError(tx: TxAdmin, negocioId: string) {
  const [negocio] = await tx.select().from(tenants).where(eq(tenants.id, negocioId)).limit(1).for("update");
  if (!negocio) throw new ErrorNegocio("El negocio no existe.");
  return negocio;
}

export async function crearNegocio(actor: Actor, datos: CrearNegocioInput) {
  return conAdmin(async (tx) => {
    const [negocio] = await tx.insert(tenants).values(datos).returning();
    if (!negocio) throw new Error("No se pudo crear el negocio.");
    await auditar(tx, actor, "crear_negocio", negocio, { plan: negocio.plan, estado: negocio.estado });
    return negocio;
  });
}

/** Datos de contacto del negocio. Un opcional vacío borra el valor anterior. */
export async function editarNegocio(actor: Actor, datos: EditarNegocioInput) {
  const { negocioId, ...cambios } = datos;
  return conAdmin(async (tx) => {
    const antes = await negocioOError(tx, negocioId);
    const nuevos = {
      nombre: cambios.nombre,
      nit: cambios.nit ?? null,
      telefono: cambios.telefono ?? null,
      emailContacto: cambios.emailContacto ?? null,
      ciudad: cambios.ciudad ?? null,
      direccion: cambios.direccion ?? null,
    };
    await tx.update(tenants).set({ ...nuevos, actualizadoEn: new Date() }).where(eq(tenants.id, negocioId));
    const detalle = cambiosEntre(antes, nuevos);
    if (Object.keys(detalle).length) {
      await auditar(tx, actor, "editar_negocio", { id: negocioId, nombre: nuevos.nombre }, detalle);
    }
  });
}

/**
 * Plan, estado y notas internas. Cada cambio queda como su propia acción en la
 * auditoría, para poder buscar «quién suspendió este negocio» sin leer JSON.
 */
export async function cambiarPlanYEstado(actor: Actor, datos: PlanYEstadoInput) {
  return conAdmin(async (tx) => {
    const antes = await negocioOError(tx, datos.negocioId);
    await tx
      .update(tenants)
      .set({
        plan: datos.plan,
        estado: datos.estado,
        notasInternas: datos.notasInternas ?? null,
        actualizadoEn: new Date(),
      })
      .where(eq(tenants.id, datos.negocioId));

    if (antes.plan !== datos.plan) {
      await auditar(tx, actor, "cambiar_plan", antes, { antes: antes.plan, despues: datos.plan });
    }
    if (antes.estado !== datos.estado) {
      await auditar(tx, actor, "cambiar_estado", antes, { antes: antes.estado, despues: datos.estado });
    }
    if ((antes.notasInternas ?? null) !== (datos.notasInternas ?? null)) {
      await auditar(tx, actor, "editar_negocio", antes, { notasInternas: "actualizadas" });
    }
  });
}

/** La cuenta de Neon Auth con ese correo, si existe, y cuándo se creó. */
export async function cuentaAuthPorCorreo(email: string): Promise<{ id: string; creadaEn: Date } | null> {
  return conAdmin(async (tx) => {
    const encontrado = await tx.execute<{ id: string; creada_en: string | Date }>(
      // Función de 0007: la app no tiene permisos sobre `neon_auth` (ahí están
      // los hashes de contraseña); solo puede pedir id y fecha, y como super admin.
      sql`select id, creada_en from app.cuenta_auth_por_correo(${email})`,
    );
    const fila = encontrado.rows[0];
    return fila ? { id: fila.id, creadaEn: new Date(fila.creada_en) } : null;
  });
}

/**
 * Da acceso a un dueño. La cuenta de Neon Auth ya viene resuelta (recién creada
 * por el administrador o una existente que él confirmó); aquí solo se crea o se
 * corrige su perfil en `usuarios`.
 */
export async function asignarDuenoPorCorreo(
  actor: Actor,
  datos: { negocioId: string; email: string; nombre: string; authUserId: string; cuentaNueva: boolean },
) {
  return conAdmin(async (tx) => {
    const negocio = await negocioOError(tx, datos.negocioId);
    const { authUserId } = datos;

    const [perfil] = await tx.select().from(usuarios).where(eq(usuarios.authUserId, authUserId)).limit(1);
    if (perfil?.rol === "super_admin") {
      throw new ErrorNegocio("Ese correo es de un super administrador: no puede ser dueño de un negocio.");
    }
    if (perfil?.tenantId && perfil.tenantId !== negocio.id) {
      throw new ErrorNegocio("Esa persona ya es dueña de otro negocio. Un usuario pertenece a un solo negocio.");
    }

    if (perfil) {
      await tx
        .update(usuarios)
        .set({ tenantId: negocio.id, nombre: datos.nombre, email: datos.email, activo: true, actualizadoEn: new Date() })
        .where(eq(usuarios.id, perfil.id));
    } else {
      await tx.insert(usuarios).values({
        authUserId,
        tenantId: negocio.id,
        email: datos.email,
        nombre: datos.nombre,
        rol: "owner",
        activo: true,
      });
    }
    await auditar(tx, actor, "asignar_dueno", negocio, { email: datos.email, cuentaNueva: datos.cuentaNueva });
  });
}

/** Activa o desactiva el acceso de un usuario del negocio. */
export async function cambiarAccesoUsuario(
  actor: Actor,
  datos: { negocioId: string; usuarioId: string; activo: boolean },
) {
  return conAdmin(async (tx) => {
    const negocio = await negocioOError(tx, datos.negocioId);
    const [usuario] = await tx
      .update(usuarios)
      .set({ activo: datos.activo, actualizadoEn: new Date() })
      .where(and(eq(usuarios.id, datos.usuarioId), eq(usuarios.tenantId, negocio.id)))
      .returning({ email: usuarios.email });
    if (!usuario) throw new ErrorNegocio("Ese usuario no pertenece a este negocio.");
    await auditar(tx, actor, "cambiar_acceso_usuario", negocio, { email: usuario.email, activo: datos.activo });
  });
}

/** Cuánta operación tiene un negocio: decide si se puede borrar. */
export async function conteoDeNegocio(negocioId: string): Promise<ConteoNegocio> {
  return conAdmin(async (tx) => {
    const [fila] = await tx
      .execute<Record<keyof ConteoNegocio, number>>(sql`
        select
          (select count(*) from clientes where tenant_id = ${negocioId})::int as clientes,
          (select count(*) from motos where tenant_id = ${negocioId})::int as motos,
          (select count(*) from ventas where tenant_id = ${negocioId})::int as ventas,
          (select count(*) from empenos where tenant_id = ${negocioId})::int as empenos,
          (select count(*) from gastos where tenant_id = ${negocioId})::int as gastos
      `)
      .then((resultado) => resultado.rows);
    return {
      clientes: Number(fila?.clientes ?? 0),
      motos: Number(fila?.motos ?? 0),
      ventas: Number(fila?.ventas ?? 0),
      empenos: Number(fila?.empenos ?? 0),
      gastos: Number(fila?.gastos ?? 0),
    };
  });
}

/**
 * Borra un negocio SIN operación (creado por error). Uno con datos no se borra:
 * se suspende. La fila de auditoría sobrevive al negocio.
 */
export async function eliminarNegocioVacio(actor: Actor, datos: { negocioId: string; confirmacion: string }) {
  const conteo = await conteoDeNegocio(datos.negocioId);
  return conAdmin(async (tx) => {
    const negocio = await negocioOError(tx, datos.negocioId);
    if (!confirmacionCoincide(negocio.nombre, datos.confirmacion)) {
      throw new ErrorNegocio("Escribe el nombre exacto del negocio para confirmar.");
    }
    if (!negocioEstaVacio(conteo)) {
      throw new ErrorNegocio("Este negocio tiene operación registrada: no se borra, se suspende.");
    }
    await tx.delete(tenants).where(eq(tenants.id, negocio.id));
    await auditar(tx, actor, "eliminar_negocio", negocio);
  });
}

async function cerrarSoporteAbierto(tx: TxAdmin, actor: Actor) {
  const cerradas = await tx
    .update(impersonaciones)
    .set({ terminadaEn: new Date() })
    .where(and(eq(impersonaciones.superAdminId, actor.usuarioId), isNull(impersonaciones.terminadaEn)))
    .returning({ negocioId: impersonaciones.negocioId });
  for (const cerrada of cerradas) {
    const [negocio] = await tx
      .select({ id: tenants.id, nombre: tenants.nombre })
      .from(tenants)
      .where(eq(tenants.id, cerrada.negocioId));
    await auditar(tx, actor, "terminar_soporte", negocio ?? null);
  }
  return cerradas.length;
}

/**
 * Abre el modo soporte (solo lectura) en un negocio por HORAS_SESION_SOPORTE
 * horas. Si el super admin tenía otra sesión abierta, se cierra primero.
 */
export async function iniciarSoporte(actor: Actor, datos: { negocioId: string; motivo: string }) {
  return conAdmin(async (tx) => {
    const negocio = await negocioOError(tx, datos.negocioId);
    await cerrarSoporteAbierto(tx, actor);
    const ahora = new Date();
    await tx.insert(impersonaciones).values({
      superAdminId: actor.usuarioId,
      negocioId: negocio.id,
      motivo: datos.motivo,
      iniciadaEn: ahora,
      expiraEn: new Date(ahora.getTime() + HORAS_SESION_SOPORTE * 3_600_000),
    });
    await auditar(tx, actor, "iniciar_soporte", negocio, { motivo: datos.motivo, horas: HORAS_SESION_SOPORTE });
  });
}

/** Sale del modo soporte. Devuelve cuántas sesiones cerró (0 si no había). */
export async function terminarSoporte(actor: Actor): Promise<number> {
  return conAdmin((tx) => cerrarSoporteAbierto(tx, actor));
}

/** La sesión de soporte abierta y vigente del super admin, para el aviso. */
export async function soporteAbierto(usuarioId: string) {
  return conAdmin(async (tx) => {
    const [fila] = await tx
      .select({
        negocioId: impersonaciones.negocioId,
        negocioNombre: tenants.nombre,
        motivo: impersonaciones.motivo,
        expiraEn: impersonaciones.expiraEn,
      })
      .from(impersonaciones)
      .innerJoin(tenants, eq(tenants.id, impersonaciones.negocioId))
      .where(
        and(
          eq(impersonaciones.superAdminId, usuarioId),
          isNull(impersonaciones.terminadaEn),
          gt(impersonaciones.expiraEn, new Date()),
        ),
      )
      .limit(1);
    return fila ?? null;
  });
}

/** Registro de auditoría, del más reciente al más viejo. */
export async function listarAuditoria(filtro: { negocioId?: string; limite?: number } = {}) {
  return conAdmin(async (tx) =>
    tx
      .select()
      .from(auditoriaAdmin)
      .where(filtro.negocioId ? eq(auditoriaAdmin.negocioId, filtro.negocioId) : undefined)
      .orderBy(desc(auditoriaAdmin.creadoEn))
      .limit(filtro.limite ?? 100),
  );
}
