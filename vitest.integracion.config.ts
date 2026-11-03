import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Pruebas de integración (`pnpm test:integracion`): aislamiento RLS contra una
 * base real.
 *
 * - `cargar-entorno.ts` lee `.env.local` antes de importar las pruebas, así que
 *   no hace falta fijar variables en la terminal.
 * - `MOTIAPP_EXIGIR_BASE` le dice a ese archivo que aquí la base es obligatoria:
 *   si falta una variable, la corrida FALLA nombrándola, en vez de saltarse las
 *   21 pruebas en silencio (que es justo lo que hacía perder el tiempo).
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.integracion.ts"],
    setupFiles: ["./src/pruebas/cargar-entorno.ts"],
    env: { MOTIAPP_EXIGIR_BASE: "1" },
    // Comparten una base real: en paralelo se pisarían los datos sembrados.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
