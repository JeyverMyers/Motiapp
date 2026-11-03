/**
 * Ruta puente de Neon Auth.
 *
 * El SDK del cliente llama a `/api/auth/*` y este handler reenvía la petición al
 * servicio de Neon Auth, gestionando las cookies de sesión. Debe existir
 * exactamente una ruta como esta.
 *
 * Los handlers se exponen como funciones envoltorio en vez de
 * `export const { GET, POST } = auth().handler()`. La razón es que ese
 * destructuring llamaría a `auth()` al cargar el módulo, y durante `next build`
 * las variables de entorno no existen: el build fallaría al recolectar rutas.
 * Envolviéndolos, la instancia se crea en la primera petición real.
 */

import type { NextRequest } from "next/server";

import { auth } from "@/server/auth/servidor";

type ContextoRuta = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, contexto: ContextoRuta) {
  const { GET: handler } = auth().handler();
  return handler(request, contexto);
}

export async function POST(request: NextRequest, contexto: ContextoRuta) {
  // Registro público cerrado: nadie crea cuentas desde el navegador (alguien
  // podría registrarse con el correo de un cliente antes que él). Las cuentas
  // las abre el administrador desde el servidor (`src/server/auth/cuentas.ts`).
  const { path } = await contexto.params;
  if (path[0] === "sign-up") {
    return Response.json({ error: "El registro está cerrado." }, { status: 403 });
  }
  const { POST: handler } = auth().handler();
  return handler(request, contexto);
}
