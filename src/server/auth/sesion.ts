/**
 * Puente entre la sesión de Neon Auth y el negocio (tenant) al que pertenece el
 * usuario.
 *
 * ## La regla que no se rompe nunca
 *
 * El `tenantId` sale SIEMPRE de la base de datos, a partir del id de usuario que
 * viene en la sesión firmada. Nunca de un parámetro de la URL, de un encabezado,
 * de una cookie de conveniencia ni de un campo oculto de un formulario. Si el
 * cliente pudiera elegir el tenant, todo el aislamiento de RLS daría igual.
 */

import { sql } from "drizzle-orm";

import { db } from "@/db";
import type { Rol } from "@/domain/enums";
import { negocioPuedeEntrar } from "@/domain/negocio";
import { auth } from "./servidor";

export type SesionUsuario = {
  /** Id del usuario en `neon_auth.user`. */
  authUserId: string;
  /** Id interno en `public.usuarios`. */
  usuarioId: string;
  tenantId: string | null;
  rol: Rol;
  activo: boolean;
  /** Estado del negocio (`activo` | `prueba` | `suspendido`); `null` sin negocio. */
  negocioEstado: string | null;
  /** Plan del negocio; decide qué módulos se ven (`domain/negocio.ts`). */
  plan: string | null;
  /** Super admin atendiendo un negocio en modo soporte (solo lectura). */
  impersonando: boolean;
  email: string;
  nombre: string;
};

/**
 * Lee la sesión y le adjunta el contexto de negocio.
 * Devuelve `null` si no hay sesión válida o si el usuario no está registrado en
 * `public.usuarios` (por ejemplo, alguien que se registró por su cuenta sin que
 * un super admin le haya dado acceso).
 */
export async function sesionActual(): Promise<SesionUsuario | null> {
  const { data } = await auth().getSession();
  const usuario = data?.user;

  if (!usuario?.id) return null;

  const contexto = await contextoDeUsuarioAuth(usuario.id);
  if (!contexto) return null;

  return {
    authUserId: usuario.id,
    usuarioId: contexto.usuarioId,
    tenantId: contexto.tenantId,
    rol: contexto.rol,
    activo: contexto.activo,
    negocioEstado: contexto.negocioEstado,
    plan: contexto.plan,
    impersonando: contexto.impersonando,
    email: usuario.email,
    nombre: usuario.name ?? usuario.email,
  };
}

type FilaContexto = {
  tenant_id: string | null;
  rol: string;
  usuario_id: string;
  activo: boolean;
  negocio_estado: string | null;
  negocio_plan: string | null;
  impersonando: boolean | null;
};

/**
 * Consulta `app.contexto_usuario`, una función SECURITY DEFINER.
 *
 * Tiene que ser así: para leer `usuarios` haría falta el contexto de tenant, y
 * el contexto de tenant sale de `usuarios`. La función corre con permisos del
 * dueño, no acepta filtros y devuelve una sola fila (el negocio del usuario
 * autenticado), así que no abre la puerta a enumerar negocios.
 */
export async function contextoDeUsuarioAuth(authUserId: string) {
  const resultado = await db().execute<FilaContexto>(
    sql`select * from app.contexto_usuario(${authUserId})`,
  );

  const fila = resultado.rows[0];
  if (!fila) return null;

  return {
    tenantId: fila.tenant_id,
    rol: fila.rol as Rol,
    usuarioId: fila.usuario_id,
    activo: fila.activo,
    negocioEstado: fila.negocio_estado,
    plan: fila.negocio_plan,
    impersonando: Boolean(fila.impersonando),
  };
}

/** Error de autorización con el código HTTP que le corresponde. */
export class ErrorAutorizacion extends Error {
  constructor(
    message: string,
    readonly estado: 401 | 403,
  ) {
    super(message);
    this.name = "ErrorAutorizacion";
  }
}

/**
 * Exige sesión de un dueño que puede ESCRIBIR en su negocio: cuenta activa y
 * negocio no suspendido. Lo usan las Server Actions.
 *
 * Un super admin en modo soporte NO pasa: el soporte es de solo lectura, así
 * que ninguna acción de negocio se ejecuta a su nombre.
 *
 * Devuelve el `tenantId` ya resuelto, que es lo que necesitan los repositorios
 * para abrir la transacción con contexto.
 */
export async function requerirDueno(): Promise<SesionUsuario & { tenantId: string }> {
  const sesion = await sesionActual();

  if (!sesion) {
    throw new ErrorAutorizacion("Debes iniciar sesión.", 401);
  }
  if (!sesion.activo) {
    throw new ErrorAutorizacion("Tu cuenta está desactivada.", 403);
  }
  if (sesion.impersonando) {
    throw new ErrorAutorizacion("Estás en modo soporte: solo puedes mirar, no registrar ni cambiar nada.", 403);
  }
  if (sesion.rol !== "owner" || !sesion.tenantId) {
    throw new ErrorAutorizacion("Esta sección es para dueños de negocio.", 403);
  }
  if (!negocioPuedeEntrar(sesion.negocioEstado)) {
    throw new ErrorAutorizacion("Tu negocio está suspendido. Habla con el administrador.", 403);
  }

  return { ...sesion, tenantId: sesion.tenantId };
}

/** Exige sesión de super administrador. */
export async function requerirSuperAdmin(): Promise<SesionUsuario> {
  const sesion = await sesionActual();

  if (!sesion) {
    throw new ErrorAutorizacion("Debes iniciar sesión.", 401);
  }
  if (!sesion.activo) {
    throw new ErrorAutorizacion("Tu cuenta está desactivada.", 403);
  }
  if (sesion.rol !== "super_admin") {
    throw new ErrorAutorizacion("Esta sección es de super administración.", 403);
  }

  return sesion;
}

/**
 * Quién puede VER el panel de un negocio: su dueño (si el negocio no está
 * suspendido) o un super admin en modo soporte. Devuelve `null` en vez de
 * lanzar: se usa en layouts y páginas, donde un `redirect` es mejor que una
 * excepción. Escribir exige `requerirDueno`.
 */
export async function sesionDeDueno(): Promise<(SesionUsuario & { tenantId: string }) | null> {
  const sesion = await sesionActual();
  if (!sesion || !sesion.activo || !sesion.tenantId) return null;
  const esDueno = sesion.rol === "owner" && negocioPuedeEntrar(sesion.negocioEstado);
  const esSoporte = sesion.rol === "super_admin" && sesion.impersonando;
  if (!esDueno && !esSoporte) return null;
  return { ...sesion, tenantId: sesion.tenantId };
}
