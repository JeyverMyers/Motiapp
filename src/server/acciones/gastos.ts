"use server";

import { revalidatePath } from "next/cache";

import { crearGastoSchema, eliminarGastoSchema } from "@/domain/gasto";
import { formatearMoneda } from "@/lib/formato";
import { comoRuta } from "@/lib/rutas";
import { crearGasto, eliminarGasto } from "@/server/repositorios/gastos";
import { erroresDeZod, mensajeDeError, tenantDeLaSesion, type EstadoAccion } from "./comun";

/** Un gasto cambia la ganancia de su moto, la ficha de su empeño y el panel. */
function revalidarGasto(referencia: { motoId: string | null; empenoId: string | null }) {
  revalidatePath("/app/gastos");
  revalidatePath("/app");
  if (referencia.motoId) {
    revalidatePath("/app/inventario");
    revalidatePath(comoRuta(`/app/inventario/${referencia.motoId}`));
  }
  if (referencia.empenoId) {
    revalidatePath(comoRuta(`/app/empenos/${referencia.empenoId}`));
  }
}

export async function accionCrearGasto(
  _estadoPrevio: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { tenantId, error } = await tenantDeLaSesion();
  if (error) return error;

  const resultado = crearGastoSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { errores: erroresDeZod(resultado.error.issues) };
  }

  let fila: Awaited<ReturnType<typeof crearGasto>>;
  try {
    fila = await crearGasto(tenantId, resultado.data);
  } catch (causa) {
    return {
      mensaje: mensajeDeError(causa, {
        accion: "crear-gasto",
        generico: "No pudimos registrar el gasto. Intenta de nuevo.",
      }),
    };
  }

  // Fuera del try: si revalidar fallara, el gasto ya quedó guardado y mostrar
  // un error invitaría a registrarlo dos veces.
  if (!fila) return { mensaje: "No se pudo registrar el gasto." };
  revalidarGasto(fila);
  return { ok: true, mensaje: `Gasto de ${formatearMoneda(resultado.data.monto)} registrado.` };
}

export async function accionEliminarGasto(
  _estadoPrevio: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { tenantId, error } = await tenantDeLaSesion();
  if (error) return error;

  const resultado = eliminarGastoSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { mensaje: "El gasto no es válido." };

  let fila: Awaited<ReturnType<typeof eliminarGasto>>;
  try {
    fila = await eliminarGasto(tenantId, resultado.data.gastoId);
  } catch (causa) {
    return {
      mensaje: mensajeDeError(causa, {
        accion: "eliminar-gasto",
        generico: "No pudimos borrar el gasto. Intenta de nuevo.",
      }),
    };
  }

  if (!fila) return { mensaje: "Ese gasto ya no existe." };
  revalidarGasto(fila);
  return { ok: true, mensaje: "Gasto borrado." };
}
