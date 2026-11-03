"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { crearClienteSchema, editarClienteSchema } from "@/domain/cliente";
import { comoRuta } from "@/lib/rutas";
import { actualizarCliente, crearCliente } from "@/server/repositorios/clientes";
import { erroresDeZod, mensajeDeError, tenantDeLaSesion, type EstadoAccion } from "./comun";

/** Si dos altas del mismo documento llegan a la vez, la que pierde cae aquí. */
function mensajeDeBaseDeDatos(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const { code, constraint = "" } = error as { code?: string; constraint?: string };
  if (code === "23505" && constraint === "clientes_tenant_documento_unique") {
    return "Ya tienes un cliente con ese documento. Búscalo en el listado.";
  }
  return null;
}

export async function accionCrearCliente(
  _estadoPrevio: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { tenantId, error } = await tenantDeLaSesion();
  if (error) return error;

  const resultado = crearClienteSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { errores: erroresDeZod(resultado.error.issues) };

  let clienteId: string;
  try {
    clienteId = await crearCliente(tenantId, resultado.data);
  } catch (causa) {
    return {
      mensaje: mensajeDeError(
        causa,
        { accion: "crear-cliente", generico: "No pudimos registrar el cliente. Intenta de nuevo." },
        mensajeDeBaseDeDatos,
      ),
    };
  }

  revalidatePath("/app/clientes");
  redirect(comoRuta(`/app/clientes/${clienteId}`));
}

export async function accionEditarCliente(
  _estadoPrevio: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { tenantId, error } = await tenantDeLaSesion();
  if (error) return error;

  const resultado = editarClienteSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { errores: erroresDeZod(resultado.error.issues) };

  try {
    const fila = await actualizarCliente(tenantId, resultado.data);
    if (!fila) return { mensaje: "El cliente no existe." };
  } catch (causa) {
    return {
      mensaje: mensajeDeError(
        causa,
        { accion: "editar-cliente", generico: "No pudimos guardar los cambios. Intenta de nuevo." },
        mensajeDeBaseDeDatos,
      ),
    };
  }

  const ruta = comoRuta(`/app/clientes/${resultado.data.clienteId}`);
  revalidatePath("/app/clientes");
  revalidatePath(ruta);
  redirect(comoRuta(`/app/clientes/${resultado.data.clienteId}?actualizado=1`));
}
