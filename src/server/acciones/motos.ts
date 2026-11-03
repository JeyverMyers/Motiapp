"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  cambiarEstadoMotoSchema,
  crearMotoSchema,
  editarMotoSchema,
  eliminarMotoSchema,
} from "@/domain/moto";
import { devolverVentaSchema, registrarVentaSchema } from "@/domain/venta";
import { ETIQUETA_ESTADO_MOTO } from "@/domain/enums";
import { comoRuta } from "@/lib/rutas";
import {
  actualizarMoto,
  cambiarEstadoMoto,
  crearMoto,
  eliminarMoto,
} from "@/server/repositorios/motos";
import { devolverVenta, registrarVenta } from "@/server/repositorios/ventas";
import { erroresDeZod, mensajeDeError, tenantDeLaSesion, type EstadoAccion } from "./comun";

export type { EstadoAccion };

/**
 * Traduce los errores conocidos de Postgres a mensajes que el dueño entiende.
 * Un `unique_violation` en `(tenant_id, placa)` significa que esa moto ya está.
 */
function mensajeDeBaseDeDatos(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const { code, constraint = "" } = error as { code?: string; constraint?: string };
  if (code === "23505" && constraint.includes("placa")) {
    return "Ya tienes una moto registrada con esa placa.";
  }
  if (code === "23505" && constraint === "ventas_moto_activa_unique") {
    return "Esta moto ya tiene una venta registrada.";
  }
  if (code === "23514") {
    return "Alguno de los datos no cumple una regla del negocio. Revisa los valores.";
  }
  return null;
}

/** Lo que cambia una moto cambia el listado, su ficha y el panel. */
function revalidarMoto(motoId?: string) {
  revalidatePath("/app/inventario");
  revalidatePath("/app");
  revalidatePath("/app/ventas");
  if (motoId) revalidatePath(comoRuta(`/app/inventario/${motoId}`));
}

export async function accionCrearMoto(
  _estadoPrevio: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { tenantId, error } = await tenantDeLaSesion();
  if (error) return error;

  const resultado = crearMotoSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { errores: erroresDeZod(resultado.error.issues) };

  let motoId: string;
  try {
    const fila = await crearMoto(tenantId, resultado.data);
    if (!fila) return { mensaje: "No se pudo guardar la moto." };
    motoId = fila.id;
  } catch (causa) {
    return {
      mensaje: mensajeDeError(
        causa,
        { accion: "crear-moto", generico: "No pudimos guardar la moto. Intenta de nuevo." },
        mensajeDeBaseDeDatos,
      ),
    };
  }

  revalidarMoto(motoId);
  redirect(comoRuta(`/app/inventario/${motoId}`));
}

export async function accionEditarMoto(
  _estadoPrevio: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { tenantId, error } = await tenantDeLaSesion();
  if (error) return error;

  const resultado = editarMotoSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { errores: erroresDeZod(resultado.error.issues) };

  try {
    const fila = await actualizarMoto(tenantId, resultado.data);
    if (!fila) return { mensaje: "La moto no existe en el inventario." };
  } catch (causa) {
    return {
      mensaje: mensajeDeError(
        causa,
        { accion: "editar-moto", generico: "No pudimos guardar los cambios. Intenta de nuevo." },
        mensajeDeBaseDeDatos,
      ),
    };
  }

  revalidarMoto(resultado.data.motoId);
  redirect(comoRuta(`/app/inventario/${resultado.data.motoId}`));
}

export async function accionCambiarEstadoMoto(
  _estadoPrevio: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { tenantId, error } = await tenantDeLaSesion();
  if (error) return error;

  const resultado = cambiarEstadoMotoSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { mensaje: "Elige un estado válido." };

  try {
    await cambiarEstadoMoto(tenantId, resultado.data.motoId, resultado.data.estado);
  } catch (causa) {
    return {
      mensaje: mensajeDeError(causa, {
        accion: "estado-moto",
        generico: "No pudimos cambiar el estado. Intenta de nuevo.",
      }),
    };
  }

  revalidarMoto(resultado.data.motoId);
  return { ok: true, mensaje: `Estado cambiado a «${ETIQUETA_ESTADO_MOTO[resultado.data.estado]}».` };
}

export async function accionEliminarMoto(
  _estadoPrevio: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { tenantId, error } = await tenantDeLaSesion();
  if (error) return error;

  const resultado = eliminarMotoSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { mensaje: "La moto no es válida." };

  try {
    await eliminarMoto(tenantId, resultado.data.motoId);
  } catch (causa) {
    return {
      mensaje: mensajeDeError(causa, {
        accion: "eliminar-moto",
        generico: "No pudimos borrar la moto. Intenta de nuevo.",
      }),
    };
  }

  revalidarMoto();
  redirect("/app/inventario?eliminada=1");
}

export async function accionRegistrarVenta(
  _estadoPrevio: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { tenantId, error } = await tenantDeLaSesion();
  if (error) return error;

  const resultado = registrarVentaSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { errores: erroresDeZod(resultado.error.issues) };

  try {
    const fila = await registrarVenta(tenantId, resultado.data);
    if (!fila) {
      return { mensaje: "Esta moto no se puede vender: ya está vendida o dada de baja." };
    }
  } catch (causa) {
    return {
      mensaje: mensajeDeError(
        causa,
        { accion: "registrar-venta", generico: "No pudimos registrar la venta. Intenta de nuevo." },
        mensajeDeBaseDeDatos,
      ),
    };
  }

  revalidarMoto(resultado.data.motoId);
  revalidatePath("/app/clientes");
  redirect(comoRuta(`/app/inventario/${resultado.data.motoId}?vendida=1`));
}

export async function accionDevolverVenta(
  _estadoPrevio: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { tenantId, error } = await tenantDeLaSesion();
  if (error) return error;

  const resultado = devolverVentaSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { mensaje: "La venta no es válida." };

  let motoId: string;
  try {
    ({ motoId } = await devolverVenta(tenantId, resultado.data.ventaId));
  } catch (causa) {
    return {
      mensaje: mensajeDeError(causa, {
        accion: "devolver-venta",
        generico: "No pudimos registrar la devolución. Intenta de nuevo.",
      }),
    };
  }

  revalidarMoto(motoId);
  redirect(comoRuta(`/app/inventario/${motoId}?devuelta=1`));
}
