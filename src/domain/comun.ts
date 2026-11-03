/** Primitivas compartidas por todo el dominio. */

import { z } from "zod";

/** UUID v4 en minúsculas, tal como los genera `crypto.randomUUID()`. */
export const idSchema = z.string().uuid();

/**
 * Texto obligatorio con longitud acotada.
 *
 * `min` se aplica después de recortar, para que "   " no cuente como valor.
 * `max` tiene un tope por defecto: así, si alguien olvida pasarlo, el texto no
 * entra sin límite en la base.
 */
export function textoRequerido(opciones: {
  min?: number;
  max?: number;
  campo: string;
}) {
  const { min = 1, max = 200, campo } = opciones;
  return z
    .string(falta(campo))
    .trim()
    .min(1, falta(campo))
    .min(min, `${campo} debe tener al menos ${min} caracteres`)
    .max(max, `${campo} no puede pasar de ${max} caracteres`);
}

/**
 * «Falta la marca», «Falta el modelo»: neutro en género, a diferencia de
 * «${campo} es obligatorio», que decía «La marca es obligatorio».
 */
export function falta(campo: string): string {
  return `Falta ${campo.charAt(0).toLocaleLowerCase("es")}${campo.slice(1)}`;
}

/**
 * Texto opcional. La cadena vacía se normaliza a `undefined`, porque los inputs
 * HTML entregan "" y no queremos guardar cadenas vacías en la base.
 */
export function textoOpcional(max: number, campo: string) {
  return z
    .string()
    .trim()
    .max(max, `${campo} no puede pasar de ${max} caracteres`)
    .transform((valor) => (valor === "" ? undefined : valor))
    .optional();
}

/** Monto en pesos. Entero no negativo y con techo para atrapar dedos gordos. */
export function monto(opciones: { campo: string; min?: number; max?: number }) {
  const { campo, min = 0, max = 100_000_000_000 } = opciones;
  return z
    .number({ error: `${campo} debe ser un número` })
    .int(`${campo} debe ser un número entero, sin centavos`)
    .min(min, `${campo} no puede ser menor a ${min}`)
    .max(max, `${campo} parece demasiado alto`);
}

/**
 * Monto que llega desde un input de texto. Acepta "1.500.000", "$ 1500000" y
 * "1500000,50" y lo reduce a un entero.
 */
export function montoDesdeTexto(opciones: { campo: string; min?: number }) {
  const { campo, min = 0 } = opciones;
  return z
    .string()
    .trim()
    .min(1, falta(campo))
    .transform((valor) => valor.replace(/[^\d]/g, ""))
    .refine((valor) => valor !== "", `${campo} debe contener números`)
    .transform((valor) => Number.parseInt(valor, 10))
    .refine(
      (valor) => Number.isSafeInteger(valor) && valor >= min,
      `${campo} no puede ser menor a ${min}`,
    );
}

/**
 * Placa de moto o carro. Se normaliza a mayúsculas sin espacios ni guiones,
 * porque el buscador de inventario compara contra esta forma.
 */
export const placaSchema = z
  .string()
  .trim()
  .transform((valor) => valor.toUpperCase().replace(/[\s-]/g, ""))
  .refine(
    (valor) => /^[A-Z0-9]{5,7}$/.test(valor),
    "La placa debe tener entre 5 y 7 caracteres alfanuméricos",
  );

/** Documento de identidad. Solo dígitos, sin puntos ni espacios. */
export const cedulaSchema = z
  .string()
  .trim()
  .transform((valor) => valor.replace(/[^\d]/g, ""))
  .refine(
    (valor) => /^\d{5,12}$/.test(valor),
    "La cédula debe tener entre 5 y 12 dígitos",
  );

/**
 * Teléfono colombiano. Guardamos 10 dígitos sin indicativo; aceptamos que el
 * usuario escriba +57, espacios o guiones y lo descartamos.
 */
export const telefonoSchema = z
  .string()
  .trim()
  .transform((valor) => valor.replace(/[^\d]/g, "").replace(/^57(?=\d{10}$)/, ""))
  .refine(
    (valor) => /^\d{10}$/.test(valor),
    "El teléfono debe tener 10 dígitos, por ejemplo 3001234567",
  );

/**
 * Año de modelo de un vehículo.
 *
 * Usa `coerce` a propósito: lo que llega de un formulario HTML, de la URL o de
 * una Server Action es siempre texto, y este esquema tiene que servir para los
 * tres. Sin `coerce`, el formulario de compra fallaba con "el año debe ser un
 * número" aunque el usuario escribiera 2021.
 */
export const anoSchema = z.coerce
  .number({ error: "El año debe ser un número" })
  .int("El año debe ser un número entero")
  .min(1950, "El año no puede ser anterior a 1950")
  .max(new Date().getFullYear() + 1, "El año no puede ser futuro");

/** Fecha en formato ISO (AAAA-MM-DD) proveniente de un `<input type="date">`. */
export const fechaSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe venir en formato AAAA-MM-DD")
  .refine((valor) => !Number.isNaN(Date.parse(valor)), "La fecha no es válida");

/** Momento exacto, serializado. Se usa para `created_at` y auditoría. */
export const timestampSchema = z.coerce.date();

/** Color de vehículo, normalizado a mayúsculas iniciales. */
export const colorSchema = z
  .string()
  .trim()
  .min(2, "El color es obligatorio")
  .max(30, "El color no puede pasar de 30 caracteres")
  .transform((valor) => valor.charAt(0).toUpperCase() + valor.slice(1).toLowerCase());

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("El correo no es válido")
  .max(160, "El correo no puede pasar de 160 caracteres");
