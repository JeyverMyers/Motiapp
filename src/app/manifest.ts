import type { MetadataRoute } from "next";

import { APP } from "@/lib/constantes";

/**
 * Manifiesto de la PWA: lo que hace instalable a Motiapp desde la landing
 * («Descargar app»). Abre directo en /app; si no hay sesión, el proxy lleva al
 * login. Los íconos los genera Next desde `icon.tsx` y `apple-icon.tsx`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP.nombre,
    short_name: APP.nombre,
    description: APP.descripcion,
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f1ed",
    theme_color: "#1c1917",
    lang: "es-CO",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
