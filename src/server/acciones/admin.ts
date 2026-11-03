"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  asignarDuenoSchema,
  cambiarAccesoUsuarioSchema,
  crearNegocioSchema,
  editarNegocioSchema,
  eliminarNegocioSchema,
  iniciarSoporteSchema,
  planYEstadoSchema,
} from "@/domain/negocio";
import { LOCALE, ZONA_HORARIA } from "@/lib/constantes";
import { comoRuta } from "@/lib/rutas";
import { crearCuentaAuth } from "@/server/auth/cuentas";
import { ErrorAutorizacion, requerirSuperAdmin } from "@/server/auth/sesion";
import {
  asignarDuenoPorCorreo,
  cambiarAccesoUsuario,
  cambiarPlanYEstado,
  crearNegocio,
  cuentaAuthPorCorreo,
  editarNegocio,
  eliminarNegocioVacio,
  iniciarSoporte,
  terminarSoporte,
  type Actor,
} from "@/server/repositorios/tenants";
import { erroresDeZod, mensajeDeError, type EstadoAccion } from "./comun";

/**
 * Acciones de super administración. Cada una verifica el rol en el servidor
 * (`requerirSuperAdmin`): que la página de /admin no se muestre a un dueño no
 * basta, porque una Server Action se puede llamar directamente.
 */
async function actorDeLaSesion(): Promise<{ actor: Actor; error?: undefined } | { actor?: undefined; error: EstadoAccion }> {
  try {
    const sesion = await requerirSuperAdmin();
    return { actor: { usuarioId: sesion.usuarioId, email: sesion.email } };
  } catch (error) {
    if (error instanceof ErrorAutorizacion) return { error: { mensaje: error.message } };
    throw error;
  }
}

function fallo(causa: unknown, accion: string): EstadoAccion {
  return { mensaje: mensajeDeError(causa, { accion, generico: "No se pudo completar la operación. Intenta de nuevo." }) };
}

function revalidarNegocio(negocioId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/auditoria");
  if (negocioId) revalidatePath(comoRuta(`/admin/negocios/${negocioId}`));
}

export async function accionCrearNegocio(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const { actor, error } = await actorDeLaSesion();
  if (error) return error;
  const resultado = crearNegocioSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { errores: erroresDeZod(resultado.error.issues) };

  let negocioId: string;
  try {
    negocioId = (await crearNegocio(actor, resultado.data)).id;
  } catch (causa) {
    return fallo(causa, "crear-negocio");
  }
  revalidarNegocio();
  redirect(comoRuta(`/admin/negocios/${negocioId}?creado=1`));
}

export async function accionEditarNegocio(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const { actor, error } = await actorDeLaSesion();
  if (error) return error;
  const resultado = editarNegocioSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { errores: erroresDeZod(resultado.error.issues) };
  try {
    await editarNegocio(actor, resultado.data);
  } catch (causa) {
    return fallo(causa, "editar-negocio");
  }
  revalidarNegocio(resultado.data.negocioId);
  return { ok: true, mensaje: "Datos del negocio guardados." };
}

export async function accionPlanYEstado(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const { actor, error } = await actorDeLaSesion();
  if (error) return error;
  const resultado = planYEstadoSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { errores: erroresDeZod(resultado.error.issues) };
  try {
    await cambiarPlanYEstado(actor, resultado.data);
  } catch (causa) {
    return fallo(causa, "plan-estado");
  }
  revalidarNegocio(resultado.data.negocioId);
  return { ok: true, mensaje: "Plan y estado guardados." };
}

export async function accionAsignarDueno(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const { actor, error } = await actorDeLaSesion();
  if (error) return error;
  const resultado = asignarDuenoSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { errores: erroresDeZod(resultado.error.issues) };
  const { negocioId, email, nombre, confirmarCuentaExistente } = resultado.data;

  let password: string | null = null;
  try {
    const existente = await cuentaAuthPorCorreo(email);
    let authUserId: string;
    if (existente) {
      // Una cuenta que no abrió el administrador pudo crearla cualquiera con ese
      // correo: solo se asigna si él confirma que es de esta persona.
      if (!confirmarCuentaExistente) {
        return {
          errores: {
            confirmarCuentaExistente: `Ya existe una cuenta con ese correo, creada el ${existente.creadaEn.toLocaleDateString(LOCALE, { timeZone: ZONA_HORARIA })}. Si estás seguro de que es de esta persona, marca la casilla y vuelve a enviar.`,
          },
        };
      }
      authUserId = existente.id;
    } else {
      const nueva = await crearCuentaAuth({ email, nombre });
      authUserId = nueva.id;
      password = nueva.password;
    }
    await asignarDuenoPorCorreo(actor, { negocioId, email, nombre, authUserId, cuentaNueva: password !== null });
  } catch (causa) {
    return fallo(causa, "asignar-dueno");
  }
  revalidarNegocio(negocioId);
  return {
    ok: true,
    mensaje: password
      ? `Cuenta creada para ${email}. Contraseña temporal: ${password} — cópiala ahora y entrégala por un canal privado; no se vuelve a mostrar. La persona puede cambiarla con «¿Olvidaste tu contraseña?».`
      : `${email} ya puede entrar como dueño.`,
  };
}

export async function accionCambiarAcceso(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const { actor, error } = await actorDeLaSesion();
  if (error) return error;
  const resultado = cambiarAccesoUsuarioSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { mensaje: "Los datos no son válidos." };
  try {
    await cambiarAccesoUsuario(actor, resultado.data);
  } catch (causa) {
    return fallo(causa, "cambiar-acceso");
  }
  revalidarNegocio(resultado.data.negocioId);
  return { ok: true, mensaje: resultado.data.activo ? "Acceso activado." : "Acceso desactivado." };
}

export async function accionEliminarNegocio(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const { actor, error } = await actorDeLaSesion();
  if (error) return error;
  const resultado = eliminarNegocioSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { errores: erroresDeZod(resultado.error.issues) };
  try {
    await eliminarNegocioVacio(actor, resultado.data);
  } catch (causa) {
    return fallo(causa, "eliminar-negocio");
  }
  revalidarNegocio();
  redirect("/admin?eliminado=1");
}

/** Entra al panel del negocio en modo soporte (solo lectura). */
export async function accionIniciarSoporte(_previo: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const { actor, error } = await actorDeLaSesion();
  if (error) return error;
  const resultado = iniciarSoporteSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { errores: erroresDeZod(resultado.error.issues) };
  try {
    await iniciarSoporte(actor, resultado.data);
  } catch (causa) {
    return fallo(causa, "iniciar-soporte");
  }
  revalidarNegocio(resultado.data.negocioId);
  redirect("/app");
}

/** Sale del modo soporte y vuelve a /admin. Sirve como `action` de un `<form>`. */
export async function accionTerminarSoporte(): Promise<void> {
  const { actor } = await actorDeLaSesion();
  if (actor) await terminarSoporte(actor);
  revalidatePath("/app");
  revalidarNegocio();
  redirect("/admin");
}
