/**
 * Instancia única del SDK de servidor de Neon Auth.
 *
 * Se guarda en `globalThis` para que el hot reload de desarrollo no cree una
 * instancia nueva en cada recompilación.
 */

import { createNeonAuth } from "@neondatabase/auth/next/server";

const globalParaAuth = globalThis as unknown as {
  __motiappAuth?: ReturnType<typeof createNeonAuth>;
};

function crear() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;

  if (!baseUrl || !secret) {
    throw new Error(
      "Faltan NEON_AUTH_BASE_URL o NEON_AUTH_COOKIE_SECRET. " +
        "Copia .env.example a .env.local y completa los valores.",
    );
  }

  return createNeonAuth({
    baseUrl,
    cookies: { secret },
  });
}

/**
 * Se resuelve de forma perezosa: durante `next build` varias rutas se evalúan
 * sin variables de entorno, y no queremos que el build falle por eso.
 */
export function auth() {
  globalParaAuth.__motiappAuth ??= crear();
  return globalParaAuth.__motiappAuth;
}
