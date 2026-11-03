import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Pruebas unitarias (`pnpm test`).
 *
 * El proyecto tiene dos clases de prueba y se distinguen por nombre de archivo:
 *
 *   *.prueba.ts        funciones puras del dominio. Corren siempre, sin base de
 *                      datos y sin variables de entorno. Son las importantes:
 *                      ahí está el cálculo de intereses y de ganancia.
 *
 *   *.integracion.ts   hablan con Postgres de verdad. NO corren aquí: tienen su
 *                      propia configuración (`vitest.integracion.config.ts`) y su
 *                      propio comando, `pnpm test:integracion`.
 *
 * Separarlas evita dos cosas: que `pnpm test` dependa de tener credenciales y
 * red, y que una prueba de integración se salte en silencio y nadie lo note.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.prueba.ts"],
  },
});
