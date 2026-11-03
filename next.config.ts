import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad para todas las respuestas.
 *
 * Sin CSP estricta a propósito: Next inyecta scripts en línea para hidratar y
 * una CSP con nonces exige render dinámico en todas las páginas. Lo que sí va:
 * HTTPS obligatorio, nada de incrustar la app en un iframe ajeno (clickjacking
 * sobre el panel), y el navegador no adivina tipos ni filtra la URL completa.
 */
const CABECERAS_SEGURIDAD = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: CABECERAS_SEGURIDAD }];
  },
  // La pantalla de acceso se llamaba /ingresar. Se redirige para que no se
  // rompan enlaces guardados ni correos viejos.
  async redirects() {
    return [{ source: "/ingresar", destination: "/login", permanent: true }];
  },
};

export default nextConfig;
