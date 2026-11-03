/**
 * Carga `.env.local` antes de las pruebas de integración.
 *
 * Se hace a mano y no con `node --env-file` porque vitest no pasa ese flag a sus
 * workers. Lo usa solo `vitest.integracion.config.ts`.
 *
 * Con `MOTIAPP_EXIGIR_BASE=1` (lo fija esa configuración), si falta una variable
 * la corrida se detiene diciendo cuál. Nunca imprime valores: son credenciales.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

const VARIABLES_DE_BASE = ["DATABASE_URL", "DATABASE_URL_MIGRACIONES"] as const;

const archivo = resolve(process.cwd(), ".env.local");

if (existsSync(archivo)) {
  config({ path: archivo, quiet: true });
}

if (process.env.MOTIAPP_EXIGIR_BASE === "1") {
  const faltantes = VARIABLES_DE_BASE.filter((nombre) => !process.env[nombre]?.trim());

  if (faltantes.length > 0) {
    throw new Error(
      `Las pruebas de integración necesitan ${faltantes.join(" y ")} en .env.local` +
        (existsSync(archivo) ? "." : " (el archivo no existe: cópialo de .env.example).") +
        " Ojo: una línea como «DATABASE_URL=# keep Neon credentials secure…» queda VACÍA," +
        " porque lo que empieza con # es comentario, y si una variable se repite gana la" +
        " última. Ver DEUDAS.md, «Cómo correr las pruebas de integración».",
    );
  }
}

// No se fija NODE_ENV: vitest ya lo pone en "test", y `@types/node` lo declara
// como solo lectura.
