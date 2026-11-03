/**
 * Clientes: personas naturales o jurídicas que compran, venden o empeñan.
 *
 * ## Documento
 *
 * La cédula de ciudadanía colombiana NO tiene dígito de verificación: es un
 * consecutivo. Quien sí lo tiene es el NIT (algoritmo módulo 11 de la DIAN). Por
 * eso la validación depende del tipo:
 *
 * - CC, CE, TI: solo dígitos, de 5 a 12.
 * - NIT: dígitos con el de verificación al final (con o sin guion); se rechaza
 *   si no cuadra.
 * - Pasaporte: letras y números, de 5 a 15.
 *
 * Se guarda solo el número normalizado (sin puntos ni guion; el NIT con su
 * dígito al final). Así una venta o un empeño que escriba «1.020.304.050»
 * encuentra al mismo cliente que «1020304050».
 */

import { z } from "zod";

import { emailSchema, idSchema, telefonoSchema, textoOpcional, textoRequerido } from "./comun";
import { TIPOS_DOCUMENTO, type TipoDocumento } from "./enums";

export const tipoDocumentoSchema = z.enum(TIPOS_DOCUMENTO);

const vacioComoIndefinido = (valor: unknown) =>
  typeof valor === "string" && valor.trim() === "" ? undefined : valor;

/* ------------------------------------------------------------------ */
/* NIT                                                                 */
/* ------------------------------------------------------------------ */

/** Pesos de la DIAN, aplicados de derecha a izquierda sobre el NIT sin dígito. */
const PESOS_NIT = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71] as const;

/** Dígito de verificación de un NIT (solo dígitos, sin el de verificación). */
export function digitoVerificacionNit(base: string): number {
  const digitos = [...base].reverse();
  const suma = digitos.reduce((total, digito, indice) => total + Number(digito) * (PESOS_NIT[indice] ?? 0), 0);
  const residuo = suma % 11;
  return residuo > 1 ? 11 - residuo : residuo;
}

/**
 * Normaliza y valida un documento según su tipo. Devuelve el número tal como
 * se guarda, o el mensaje de error.
 */
export function normalizarDocumento(
  tipo: TipoDocumento,
  valor: string,
): { ok: true; numero: string } | { ok: false; error: string } {
  if (tipo === "PP") {
    const numero = valor.replace(/[^\dA-Za-z]/g, "").toUpperCase();
    return /^[\dA-Z]{5,15}$/.test(numero)
      ? { ok: true, numero }
      : { ok: false, error: "El pasaporte debe tener entre 5 y 15 letras o números" };
  }

  const numero = valor.replace(/\D/g, "");
  if (tipo !== "NIT") {
    return /^\d{5,12}$/.test(numero)
      ? { ok: true, numero }
      : { ok: false, error: "El documento debe tener entre 5 y 12 dígitos" };
  }

  if (!/^\d{7,11}$/.test(numero)) {
    return { ok: false, error: "Escribe el NIT con su dígito de verificación, por ejemplo 900123456-8" };
  }
  const base = numero.slice(0, -1);
  const digito = Number(numero.slice(-1));
  return digitoVerificacionNit(base) === digito
    ? { ok: true, numero }
    : { ok: false, error: "El dígito de verificación del NIT no corresponde" };
}

/** «9001234568» (NIT) → «900.123.456-8»; una cédula → «1.020.304.050». */
export function formatearDocumento(tipo: string, numero: string): string {
  if (tipo === "PP") return numero;
  const miles = (texto: string) => texto.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (tipo === "NIT" && numero.length > 1) return `${miles(numero.slice(0, -1))}-${numero.slice(-1)}`;
  return miles(numero);
}

/* ------------------------------------------------------------------ */
/* Formularios                                                         */
/* ------------------------------------------------------------------ */

const camposCliente = {
  tipoDocumento: tipoDocumentoSchema.default("CC"),
  numeroDocumento: z.string({ error: "El documento es obligatorio" }).trim().min(1, "El documento es obligatorio"),
  nombres: textoRequerido({ max: 80, campo: "Los nombres" }),
  apellidos: textoOpcional(80, "Los apellidos"),
  telefono: telefonoSchema,
  telefonoAlterno: z.preprocess(vacioComoIndefinido, telefonoSchema.optional()),
  email: z.preprocess(vacioComoIndefinido, emailSchema.optional()),
  direccion: textoOpcional(200, "La dirección"),
  ciudad: textoOpcional(80, "La ciudad"),
  notas: textoOpcional(500, "Las notas"),
};

/** Valida el documento según su tipo y lo deja normalizado. */
function conDocumentoValido<T extends { tipoDocumento: TipoDocumento; numeroDocumento: string }>(
  datos: T,
  contexto: z.RefinementCtx,
): T {
  const resultado = normalizarDocumento(datos.tipoDocumento, datos.numeroDocumento);
  if (!resultado.ok) {
    contexto.addIssue({ code: "custom", path: ["numeroDocumento"], message: resultado.error });
    return z.NEVER;
  }
  return { ...datos, numeroDocumento: resultado.numero };
}

export const crearClienteSchema = z.object(camposCliente).transform(conDocumentoValido);

export const editarClienteSchema = z
  .object({ clienteId: idSchema, ...camposCliente })
  .transform(conDocumentoValido);

export type CrearClienteInput = z.infer<typeof crearClienteSchema>;
export type EditarClienteInput = z.infer<typeof editarClienteSchema>;

/** Buscador del listado: una sola caja para cédula, nombre o teléfono. */
export const filtrosClientesSchema = z.object({
  texto: textoOpcional(120, "El texto de búsqueda"),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(25),
});

export type FiltrosClientes = z.infer<typeof filtrosClientesSchema>;

/** Nombre para mostrar en listas y comprobantes. */
export function nombreCompletoCliente(cliente: { nombres: string; apellidos: string | null | undefined }): string {
  return [cliente.nombres, cliente.apellidos].filter(Boolean).join(" ");
}
