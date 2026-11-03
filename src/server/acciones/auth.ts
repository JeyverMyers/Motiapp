"use server";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { emailSchema } from "@/domain/comun";
import { auth } from "@/server/auth/servidor";
import { negocioPuedeEntrar } from "@/domain/negocio";
import { contextoDeUsuarioAuth, sesionActual } from "@/server/auth/sesion";

export type EstadoAuth = {
  /** La acción terminó bien (por ejemplo, se pidió el correo de recuperación). */
  ok?: boolean;
  /** Error general del formulario: credenciales, cuenta sin acceso, etc. */
  mensaje?: string;
  /** Errores por campo. */
  errores?: Record<string, string>;
};

/**
 * Esquemas de validación.
 *
 * No se exportan: un archivo con `'use server'` solo puede exportar funciones
 * `async`, y exportar un objeto Zod rompe el build. Los formularios validan con
 * `useActionState`, así que los mensajes llegan igual por campo.
 */
const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128, "La contraseña no puede pasar de 128 caracteres");

const iniciarSesionSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  destino: z.string().optional(),
});

const solicitarRecuperacionSchema = z.object({ email: emailSchema });

const restablecerPasswordSchema = z
  .object({
    token: z.string().min(1, "El enlace no es válido. Pide uno nuevo."),
    password: passwordSchema,
    confirmacion: z.string(),
  })
  .refine((datos) => datos.password === datos.confirmacion, {
    path: ["confirmacion"],
    message: "Las contraseñas no coinciden",
  });

/** Convierte los problemas de Zod en un mapa campo → mensaje. */
function erroresDeZod(problemas: z.core.$ZodIssue[]): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const problema of problemas) {
    const campo = problema.path[0];
    if (typeof campo === "string" && !(campo in errores)) {
      errores[campo] = problema.message;
    }
  }
  return errores;
}

/**
 * A dónde mandar después de entrar.
 *
 * El proxy guarda en `destino` la página que se pidió sin sesión. Solo se honra
 * si es una ruta interna del área del rol: aceptar cualquier URL sería una
 * redirección abierta (un enlace de phishing que, tras el login real, lleva a
 * un sitio falso).
 */
function destinoSeguro(destino: string | undefined, rol: "owner" | "super_admin"): Route {
  const area = rol === "super_admin" ? "/admin" : "/app";
  const esInterno =
    typeof destino === "string" &&
    (destino === area || destino.startsWith(`${area}/`)) &&
    !destino.includes("//") &&
    !destino.includes("\\");
  return (esInterno ? destino : area) as Route;
}

/**
 * Inicia sesión.
 *
 * Después de autenticar se comprueba que el usuario tenga perfil en
 * `public.usuarios`. Sin ese perfil no hay negocio ni rol, así que la sesión no
 * sirve para nada: se cierra y se explica por qué. Esto es lo que impide que
 * alguien que se registre por su cuenta entre al panel de un negocio.
 */
export async function iniciarSesion(
  _estadoPrevio: EstadoAuth,
  formData: FormData,
): Promise<EstadoAuth> {
  const resultado = iniciarSesionSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { errores: erroresDeZod(resultado.error.issues) };
  }

  const { data, error } = await auth().signIn.email({
    email: resultado.data.email,
    password: resultado.data.password,
  });

  if (error) {
    return { mensaje: "Correo o contraseña incorrectos." };
  }

  // El negocio se resuelve con el id que devuelve el propio inicio de sesión.
  // Leer la sesión desde las cookies en esta misma petición depende de que la
  // cookie recién emitida ya esté visible, y si no lo está el dueño recibiría
  // «no tienes acceso» teniéndolo.
  const authUserId = data?.user?.id ?? (await sesionActual())?.authUserId;
  const contexto = authUserId ? await contextoDeUsuarioAuth(authUserId) : null;

  if (!contexto) {
    await auth().signOut();
    return {
      mensaje:
        "Tu cuenta existe pero todavía no tiene acceso a ningún negocio. " +
        "Pídele al administrador que te habilite.",
    };
  }

  if (!contexto.activo) {
    await auth().signOut();
    return { mensaje: "Tu cuenta está desactivada. Habla con el administrador." };
  }

  // Un dueño sin negocio asignado (por ejemplo, si borraron el negocio) no
  // tiene nada que ver en /app: mejor decirlo aquí que rebotarlo en silencio.
  if (contexto.rol === "owner" && !contexto.tenantId) {
    await auth().signOut();
    return {
      mensaje: "Tu usuario no está asignado a ningún negocio. Pídele al administrador que lo asigne.",
    };
  }

  // Negocio suspendido por la super administración: no entra (S1).
  if (contexto.rol === "owner" && !negocioPuedeEntrar(contexto.negocioEstado)) {
    await auth().signOut();
    return { mensaje: "Tu negocio está suspendido. Habla con el administrador para reactivarlo." };
  }

  // `redirect` lanza una excepción de control de flujo: va fuera de try/catch.
  redirect(destinoSeguro(resultado.data.destino, contexto.rol));
}

/** Origen de la petición actual, para armar el enlace del correo. */
async function origenActual(): Promise<string> {
  const cabeceras = await headers();
  const host = cabeceras.get("x-forwarded-host") ?? cabeceras.get("host") ?? "localhost:3000";
  const protocolo =
    cabeceras.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

/**
 * Pide el correo de recuperación.
 *
 * Neon Auth envía el correo (proveedor `shared` de la rama) con un enlace que
 * vuelve a `/restablecer-password?token=…`. Neon valida que ese destino sea un
 * origen de confianza, así que un `Host` falsificado no desvía el enlace.
 *
 * La respuesta es SIEMPRE la misma, exista o no la cuenta: decir «ese correo no
 * está registrado» le enseñaría a cualquiera qué correos tienen cuenta.
 */
export async function solicitarRecuperacion(
  _estadoPrevio: EstadoAuth,
  formData: FormData,
): Promise<EstadoAuth> {
  const resultado = solicitarRecuperacionSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { errores: erroresDeZod(resultado.error.issues) };
  }

  const { error } = await auth().requestPasswordReset({
    email: resultado.data.email,
    redirectTo: `${await origenActual()}/restablecer-password`,
  });

  if (error) {
    // Se registra para soporte, pero al usuario se le responde igual.
    console.error("[recuperar-password] Neon Auth respondió con error", error.message);
  }

  return {
    ok: true,
    mensaje:
      "Si ese correo tiene una cuenta, te llegará un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.",
  };
}

/** Fija la contraseña nueva con el token del enlace del correo. */
export async function restablecerPassword(
  _estadoPrevio: EstadoAuth,
  formData: FormData,
): Promise<EstadoAuth> {
  const resultado = restablecerPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { errores: erroresDeZod(resultado.error.issues) };
  }

  const { error } = await auth().resetPassword({
    newPassword: resultado.data.password,
    token: resultado.data.token,
  });

  if (error) {
    return {
      mensaje: "El enlace venció o ya se usó. Pide uno nuevo desde «¿Olvidaste tu contraseña?».",
    };
  }

  redirect("/login?restablecida=1");
}

export async function cerrarSesion(): Promise<void> {
  await auth().signOut();
  redirect("/login");
}
