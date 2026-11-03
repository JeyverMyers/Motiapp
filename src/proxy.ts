/**
 * Interceptor de peticiones.
 *
 * En Next 16 este archivo se llama `proxy.ts` y la función exportada se llama
 * `proxy`; el nombre viejo (`middleware.ts` / `middleware`) está deprecado.
 * Renombrar el archivo sin renombrar la función rompe el build, así que los dos
 * nombres van juntos.
 *
 * ## Qué hace y qué NO hace
 *
 * Hace una sola cosa: si alguien sin sesión pide una ruta de `/app` o `/admin`,
 * lo manda a la pantalla de acceso antes de renderizar nada. Es una comodidad de
 * experiencia, no la seguridad.
 *
 * La autorización de verdad vive en los layouts del servidor
 * (`src/app/app/layout.tsx` y `src/app/admin/layout.tsx`), que resuelven el
 * negocio y el rol contra la base en cada petición. Depender solo del proxy
 * dejaría fuera a las Server Actions, que son peticiones POST a la ruta donde se
 * usan y no pasan por las mismas reglas.
 *
 * ## Runtime
 *
 * El proxy de Next 16 corre siempre en Node.js; declarar `runtime` aquí lanza un
 * error.
 */

import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/server/auth/servidor";

/** Rutas que exigen sesión. */
const RUTAS_PROTEGIDAS = ["/app", "/admin"] as const;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!RUTAS_PROTEGIDAS.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`))) {
    return NextResponse.next();
  }

  const { data } = await auth().getSession();

  if (!data?.user) {
    const destino = new URL("/login", request.url);
    // Guardamos a dónde quería ir para devolverlo ahí después de entrar.
    destino.searchParams.set("destino", pathname);
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

export const config = {
  // Se excluyen los estáticos para no gastar una verificación de sesión en cada
  // imagen o archivo de fuente.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
