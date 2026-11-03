/**
 * Creación de cuentas de Neon Auth por el administrador.
 *
 * El registro público está cerrado: si cualquiera pudiera crear una cuenta, se
 * podría registrar con el correo de un cliente antes que él y quedarse con su
 * negocio cuando el administrador lo asignara. Por eso las cuentas de los
 * dueños las abre `/admin`, desde el servidor.
 *
 * Se llama a la API de Neon Auth con `fetch` y no con el SDK (`auth().signUp`):
 * el SDK dejaría la sesión de la cuenta nueva en las cookies del administrador.
 */

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";

/** Origen de la petición actual (Neon Auth solo acepta dominios de confianza). */
export async function origenDeLaPeticion(): Promise<string> {
  const cabeceras = await headers();
  const host = cabeceras.get("x-forwarded-host") ?? cabeceras.get("host") ?? "localhost:3000";
  const protocolo = cabeceras.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

/** Crea la cuenta con una contraseña temporal al azar, que se devuelve una sola vez. */
export async function crearCuentaAuth(datos: { email: string; nombre: string }): Promise<{ id: string; password: string }> {
  const base = process.env.NEON_AUTH_BASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("Falta NEON_AUTH_BASE_URL.");

  const password = randomBytes(12).toString("base64url");
  const respuesta = await fetch(`${base}/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: await origenDeLaPeticion() },
    body: JSON.stringify({ email: datos.email, password, name: datos.nombre }),
    cache: "no-store",
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`Neon Auth rechazó crear la cuenta (HTTP ${respuesta.status}): ${detalle.slice(0, 200)}`);
  }

  const cuerpo = (await respuesta.json()) as { user?: { id?: string } };
  const id = cuerpo.user?.id;
  if (!id) throw new Error("Neon Auth no devolvió el id de la cuenta.");
  return { id, password };
}
