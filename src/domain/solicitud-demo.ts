/** Solicitudes de demo que llegan desde la landing pública. */

import { z } from "zod";

import { emailSchema, telefonoSchema, textoOpcional, textoRequerido } from "./comun";

export const solicitudDemoSchema = z.object({
  nombre: textoRequerido({ min: 3, max: 80, campo: "Tu nombre" }),
  negocio: textoRequerido({ min: 2, max: 120, campo: "El nombre del negocio" }),
  telefono: telefonoSchema,
  // Un campo vacío del formulario llega como "", no como `undefined`: sin esto
  // el correo «opcional» era obligatorio y nadie podía pedir demo sin él.
  email: z.preprocess((valor) => (valor === "" ? undefined : valor), emailSchema.optional()),
  ciudad: textoOpcional(80, "La ciudad"),
  mensaje: textoOpcional(1000, "El mensaje"),
  // Casillas HTML: marcadas envían "on"; desmarcadas no se envían. La de datos
  // es obligatoria por la Ley 1581; la comercial, no.
  aceptaTratamientoDatos: z
    .literal("on", { error: "Para enviarla necesitamos tu autorización de tratamiento de datos." })
    .transform(() => true as const),
  aceptaComunicaciones: z
    .union([z.literal("on"), z.literal("")])
    .optional()
    .transform((valor) => valor === "on"),
});

/**
 * Nombre del campo trampa anti-robots del formulario público. Va oculto a las
 * personas; si llega con texto, la solicitud no se guarda.
 */
export const CAMPO_TRAMPA = "sitioWeb";

export type SolicitudDemoInput = z.infer<typeof solicitudDemoSchema>;
