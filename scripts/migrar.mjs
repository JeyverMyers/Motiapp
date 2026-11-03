/**
 * Aplica las migraciones de `drizzle/*.sql` que falten, en orden.
 *
 *   node --env-file=.env.local scripts/migrar.mjs                 muestra qué falta (no toca nada)
 *   node --env-file=.env.local scripts/migrar.mjs --aplicar       aplica lo que falta
 *   node --env-file=.env.local scripts/migrar.mjs --marcar-aplicadas
 *        registra todas como aplicadas SIN correrlas (para una base que ya las
 *        tenía de antes de existir este script, como la rama de desarrollo)
 *
 * Para producción se usa otro archivo de variables, con las cadenas de la rama
 * `production`: `node --env-file=.env.produccion scripts/migrar.mjs --aplicar`.
 *
 * ## Cómo funciona
 *
 * - Conecta con `DATABASE_URL_MIGRACIONES` (rol dueño, host directo).
 * - Lleva el registro en `public.migraciones_aplicadas`. El rol de la app no
 *   tiene ningún permiso sobre esa tabla.
 * - Cada archivo va en su propia transacción: si uno falla, se deshace entero,
 *   el registro no lo marca y el script se detiene. Los anteriores quedan.
 * - Si existe `MOTIAPP_APP_PASSWORD`, al final fija la contraseña del rol
 *   `motiapp_app` (la que va en `DATABASE_URL`). No se imprime.
 *
 * ## Antes de la primera migración en una rama nueva
 *
 * Neon Auth tiene que estar activado en esa rama: `0000` le da al rol de la app
 * lectura sobre el esquema `neon_auth`, y si el esquema no existe todavía ese
 * permiso no queda puesto.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

const argumentos = new Set(process.argv.slice(2));
const APLICAR = argumentos.has("--aplicar");
const MARCAR = argumentos.has("--marcar-aplicadas");

const url = process.env.DATABASE_URL_MIGRACIONES;
if (!url) {
  console.error("Falta DATABASE_URL_MIGRACIONES (rol dueño). Revisa el archivo de variables que pasaste con --env-file.");
  process.exit(1);
}

const CARPETA = join(process.cwd(), "drizzle");
const archivos = readdirSync(CARPETA)
  .filter((nombre) => /^\d{4}_.+\.sql$/.test(nombre))
  .sort();

const pool = new Pool({ connectionString: url, max: 1 });

async function asegurarRegistro(cliente) {
  await cliente.query(`
    create table if not exists public.migraciones_aplicadas (
      nombre text primary key,
      aplicada_en timestamptz not null default now()
    )`);
  // Los privilegios por defecto de `public` se los darían a la app.
  await cliente.query(`
    do $$ begin
      if exists (select 1 from pg_roles where rolname = 'motiapp_app') then
        revoke all on public.migraciones_aplicadas from motiapp_app;
      end if;
    end $$`);
}

async function main() {
  const host = new URL(url).host.split(".")[0];
  console.log(`\nBase: ${host}`);

  const cliente = await pool.connect();
  try {
    await asegurarRegistro(cliente);
    const { rows } = await cliente.query(`select nombre from public.migraciones_aplicadas`);
    const aplicadas = new Set(rows.map((fila) => fila.nombre));
    const pendientes = archivos.filter((nombre) => !aplicadas.has(nombre));

    if (pendientes.length === 0) {
      console.log("Todo al día: no hay migraciones pendientes.");
    } else if (MARCAR) {
      for (const nombre of pendientes) {
        await cliente.query(`insert into public.migraciones_aplicadas (nombre) values ($1)`, [nombre]);
        console.log(`  marcada (sin correr) ${nombre}`);
      }
    } else if (!APLICAR) {
      console.log("Pendientes (no se aplicó nada; agrega --aplicar):");
      for (const nombre of pendientes) console.log(`  · ${nombre}`);
    } else {
      for (const nombre of pendientes) {
        const sql = readFileSync(join(CARPETA, nombre), "utf8");
        await cliente.query("begin");
        try {
          await cliente.query(sql);
          await cliente.query(`insert into public.migraciones_aplicadas (nombre) values ($1)`, [nombre]);
          await cliente.query("commit");
          console.log(`  ✓ ${nombre}`);
        } catch (error) {
          await cliente.query("rollback");
          console.error(`  ✗ ${nombre}: ${error.message}`);
          console.error("Se deshizo esa migración entera. Las anteriores quedaron aplicadas.");
          process.exitCode = 1;
          return;
        }
      }
    }

    const clave = process.env.MOTIAPP_APP_PASSWORD;
    if (clave && (APLICAR || MARCAR)) {
      if (clave.length < 24) {
        console.error("MOTIAPP_APP_PASSWORD debe tener al menos 24 caracteres.");
        process.exitCode = 1;
        return;
      }
      const { rows: orden } = await cliente.query(`select format('alter role motiapp_app with password %L', $1::text) as sql`, [clave]);
      await cliente.query(orden[0].sql);
      console.log("  ✓ contraseña de motiapp_app fijada (no se muestra)");
    }
  } finally {
    cliente.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
