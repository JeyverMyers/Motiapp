"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  crearEmpenoSchema,
  datosClienteEmpenoSchema,
  declararPerdidoSchema,
  liquidarEmpenoSchema,
  registrarAbonoSchema,
  renovarEmpenoSchema,
} from "@/domain/empeno";
import { buscarOCrearCliente } from "@/server/repositorios/clientes";
import {
  crearEmpeno,
  declararPerdido,
  liquidarEmpeno,
  registrarAbono,
  renovarEmpeno,
} from "@/server/repositorios/empenos";
import { comoRuta } from "@/lib/rutas";
import { formatearFecha, formatearMoneda } from "@/lib/formato";
import { erroresDeZod, mensajeDeError, tenantDeLaSesion, type EstadoAccion } from "./comun";

/** Traduce los errores conocidos de Postgres a mensajes entendibles. */
function mensajeDeBaseDeDatos(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const codigo = (error as { code?: string }).code;
  const restriccion = (error as { constraint?: string }).constraint ?? "";

  if (codigo === "23505") {
    if (restriccion.startsWith("motos_")) {
      return "Ya hay una moto con esa placa en el inventario. Revísala antes de adjudicar esta.";
    }
    if (restriccion.includes("imei")) return "Ya hay un teléfono con ese IMEI.";
    if (restriccion.includes("placa")) return "Ya hay un vehículo empeñado con esa placa.";
    if (restriccion.includes("numero")) return "Ese número de empeño ya está en uso.";
    if (restriccion.includes("documento")) return "Ya existe un cliente con esa cédula.";
    return "Ese registro ya existe.";
  }

  if (codigo === "23514") {
    return "Alguno de los datos no cumple una regla del negocio. Revisa las fechas y el capital.";
  }

  return null;
}

/** Todo lo que cambia un empeño cambia también el listado y el panel. */
function revalidarEmpeno(empenoId: string) {
  revalidatePath("/app/empenos");
  revalidatePath(comoRuta(`/app/empenos/${empenoId}`));
  revalidatePath("/app");
}

/**
 * Validación del formulario de empeño: los datos del cliente más los del bien y
 * del préstamo.
 *
 * Se hace aquí, campo por campo, y no con un esquema derivado, porque el
 * formulario entrega los datos del vehículo aplanados (placa, marca, modelo…) y
 * `crearEmpenoSchema` los espera anidados en `vehiculo` o `telefono`. Aplanar es
 * la forma natural de un `<form>` y anidar es la forma natural de la base.
 */
function validarFormularioEmpeno(datos: Record<string, FormDataEntryValue>) {
  const tipoBien = String(datos.tipoBien ?? "moto");

  const cliente = datosClienteEmpenoSchema.safeParse({
    cedula: datos.cedula,
    nombres: datos.nombres,
    apellidos: datos.apellidos,
    telefono: datos.telefono,
    email: datos.email === "" ? undefined : datos.email,
  });

  const comun = {
    capital: datos.capital,
    tasaMensual: datos.tasaMensual,
    frecuenciaPago: datos.frecuenciaPago ?? "mensual",
    fechaInicio: datos.fechaInicio,
    fechaVencimiento: datos.fechaVencimiento === "" ? undefined : datos.fechaVencimiento,
    garanteNombre: datos.garanteNombre,
    garanteCedula: datos.garanteCedula === "" ? undefined : datos.garanteCedula,
    garanteTelefono: datos.garanteTelefono,
    observaciones: datos.observaciones,
  };

  const bien =
    tipoBien === "telefono"
      ? {
          telefono: {
            marca: datos.marca,
            modelo: datos.modelo,
            imei: datos.imei,
            capacidad: datos.capacidad,
            color: datos.color,
          },
        }
      : tipoBien === "otro"
        ? {
            otro: {
              descripcion: datos.descripcion,
              identificador: datos.identificador,
              valorTasacion: datos.valorTasacion,
            },
          }
        : {
          vehiculo: {
            placa: datos.placa,
            marca: datos.marca,
            modelo: datos.modelo,
            anio: datos.anio,
            color: datos.color,
            numeroMotor: datos.numeroMotor,
            numeroChasis: datos.numeroChasis,
          },
        };

  return { tipoBien, cliente, comun, bien };
}

export async function accionCrearEmpeno(
  _estadoPrevio: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { tenantId, error } = await tenantDeLaSesion("empenos");
  if (error) return error;

  const { cliente, comun, bien, tipoBien } = validarFormularioEmpeno(Object.fromEntries(formData));

  if (!cliente.success) {
    return { errores: erroresDeZod(cliente.error.issues) };
  }

  // El formulario entrega los datos aplanados; aquí se arman en la forma que
  // espera el esquema, que anida el bien según su tipo.
  const empeno = crearEmpenoSchema.safeParse({ ...comun, tipoBien, ...bien });
  if (!empeno.success) {
    return { errores: erroresDeZod(empeno.error.issues) };
  }

  let empenoId: string;
  try {
    const clienteId = await buscarOCrearCliente(tenantId, cliente.data);
    const fila = await crearEmpeno(tenantId, { ...empeno.data, clienteId });
    if (!fila) return { mensaje: "No se pudo registrar el empeño." };
    empenoId = fila.id;
  } catch (causa) {
    return {
      mensaje: mensajeDeError(
        causa,
        { accion: "crear-empeno", generico: "No pudimos registrar el empeño. Intenta de nuevo." },
        mensajeDeBaseDeDatos,
      ),
    };
  }

  revalidarEmpeno(empenoId);
  revalidatePath("/app/clientes");
  redirect(comoRuta(`/app/empenos/${empenoId}`));
}

export async function accionRegistrarAbono(
  _estadoPrevio: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { tenantId, error } = await tenantDeLaSesion("empenos");
  if (error) return error;

  const resultado = registrarAbonoSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { errores: erroresDeZod(resultado.error.issues) };
  }

  try {
    await registrarAbono(tenantId, resultado.data);
  } catch (causa) {
    return {
      mensaje: mensajeDeError(
        causa,
        { accion: "registrar-abono", generico: "No pudimos registrar el abono. Intenta de nuevo." },
        mensajeDeBaseDeDatos,
      ),
    };
  }

  revalidarEmpeno(resultado.data.empenoId);
  return { ok: true, mensaje: `Abono de ${formatearMoneda(resultado.data.monto)} registrado.` };
}

export async function accionLiquidarEmpeno(
  _estadoPrevio: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { tenantId, error } = await tenantDeLaSesion("empenos");
  if (error) return error;

  const resultado = liquidarEmpenoSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { errores: erroresDeZod(resultado.error.issues) };
  }

  let montoCobrado: number;
  try {
    ({ montoCobrado } = await liquidarEmpeno(tenantId, resultado.data));
  } catch (causa) {
    return {
      mensaje: mensajeDeError(
        causa,
        { accion: "liquidar-empeno", generico: "No pudimos liquidar el empeño. Intenta de nuevo." },
        mensajeDeBaseDeDatos,
      ),
    };
  }

  revalidarEmpeno(resultado.data.empenoId);
  return {
    ok: true,
    mensaje: `Empeño liquidado. Se cobraron ${formatearMoneda(montoCobrado)} y el cliente recupera el bien.`,
  };
}

export async function accionRenovarEmpeno(
  _estadoPrevio: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { tenantId, error } = await tenantDeLaSesion("empenos");
  if (error) return error;

  const resultado = renovarEmpenoSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { errores: erroresDeZod(resultado.error.issues) };
  }

  let renovacion: { interesCobrado: number; fechaVencimiento: string };
  try {
    renovacion = await renovarEmpeno(tenantId, resultado.data);
  } catch (causa) {
    return {
      mensaje: mensajeDeError(
        causa,
        { accion: "renovar-empeno", generico: "No pudimos renovar el empeño. Intenta de nuevo." },
        mensajeDeBaseDeDatos,
      ),
    };
  }

  revalidarEmpeno(resultado.data.empenoId);
  const cobro =
    renovacion.interesCobrado > 0
      ? ` Se cobró el interés pendiente: ${formatearMoneda(renovacion.interesCobrado)}.`
      : "";
  return {
    ok: true,
    mensaje: `Empeño renovado hasta el ${formatearFecha(renovacion.fechaVencimiento)}.${cobro}`,
  };
}

export async function accionDeclararPerdido(
  _estadoPrevio: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { tenantId, error } = await tenantDeLaSesion("empenos");
  if (error) return error;

  const resultado = declararPerdidoSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { errores: erroresDeZod(resultado.error.issues) };
  }

  let motoId: string | null;
  try {
    ({ motoId } = await declararPerdido(tenantId, resultado.data));
  } catch (causa) {
    return {
      mensaje: mensajeDeError(
        causa,
        { accion: "declarar-perdido", generico: "No pudimos cerrar el empeño. Intenta de nuevo." },
        mensajeDeBaseDeDatos,
      ),
    };
  }

  revalidarEmpeno(resultado.data.empenoId);
  if (motoId) {
    revalidatePath("/app/inventario");
    redirect(comoRuta(`/app/inventario/${motoId}`));
  }
  return { ok: true, mensaje: "El empeño quedó como perdido: el bien ahora es del negocio." };
}
