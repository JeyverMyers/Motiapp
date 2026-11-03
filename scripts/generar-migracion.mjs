/**
 * Genera las migraciones SQL a partir de `src/db/schema.ts`.
 *
 * Por qué existe este script y no se usa `drizzle-kit generate` directamente:
 * el proyecto tiene SQL escrito a mano que Drizzle no puede deducir del esquema
 * (roles, políticas RLS, funciones del esquema `app`). Ese SQL tiene que correr
 * siempre DESPUÉS del DDL, y el orden importa: habilitar RLS antes de que exista
 * la tabla falla.
 *
 * El script hace tres cosas:
 *
 *   1. Pide a drizzle-kit el DDL de las tablas.
 *   2. Concatena `rls.sql` al final de la migración generada.
 *   3. Escribe `drizzle/0000_inicial.sql`, un archivo único listo para pegar en
 *      el editor SQL de Neon, y un manifiesto JSON con los archivos que lo
 *      componen.
 *
 * Para migraciones posteriores, `drizzle-kit generate` sigue funcionando: las
 * políticas RLS se reaplican con `rls.sql`, que es idempotente.
 *
 * Se ejecuta con: pnpm db:generar
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..");
const dirSql = join(raiz, "src", "db", "sql");
const dirSalida = join(raiz, "drizzle");
const dirTemporal = join(dirSalida, ".generado");

/**
 * drizzle-kit es CommonJS; se carga con `require` para que el objeto de esquema
 * y el generador compartan la misma instancia del paquete y no se dupliquen las
 * clases internas de drizzle-orm.
 */
const require = createRequire(import.meta.url);

async function cargarGenerador() {
  const api = require("drizzle-kit/api");
  if (typeof api.generateMigration !== "function") {
    throw new Error(
      "drizzle-kit/api no expone generateMigration. Revisa la versión de drizzle-kit.",
    );
  }
  return api;
}

/** El esquema se importa como módulo ESM para reutilizar los tipos reales. */
async function cargarEsquema() {
  const ruta = pathToFileURL(join(raiz, "src", "db", "schema.ts")).href;
  return import(ruta);
}

/**
 * Esquemas que NO son de este proyecto.
 *
 * `src/db/schema.ts` declara un espejo de solo lectura de `neon_auth.user` para
 * poder tipar sus lecturas. Ese esquema lo administra Neon Auth, así que el
 * generador no debe emitir `CREATE SCHEMA "neon_auth"` ni crearse la tabla: si
 * el esquema todavía no existe, el error correcto es que falte habilitar Auth en
 * la consola de Neon, no que un archivo nuestro lo invente a medias.
 */
const ESQUEMAS_EXTERNOS = new Set(["neon_auth"]);

function esquemasExternosPresentes(esquema) {
  const { getTableConfig } = require("drizzle-orm/pg-core");
  const encontrados = new Set();

  for (const valor of Object.values(esquema)) {
    if (!valor || typeof valor !== "object") continue;
    try {
      const { schema } = getTableConfig(valor);
      if (schema && ESQUEMAS_EXTERNOS.has(schema)) encontrados.add(schema);
    } catch {
      // No es una tabla de Drizzle: se ignora.
    }
  }

  return encontrados;
}

/** Quita del DDL las sentencias que tocan esquemas ajenos al proyecto. */
function filtrarSentencias(sentencias, esquemasAjenos) {
  if (esquemasAjenos.size === 0) return sentencias;

  return sentencias.filter((sentencia) => {
    const texto = String(sentencia);
    for (const esquema of esquemasAjenos) {
      // Cubre `CREATE SCHEMA "neon_auth"` y cualquier DDL sobre sus objetos.
      const mencionaEsquema = new RegExp(`"${esquema}"`, "i").test(texto);
      if (mencionaEsquema) return false;
    }
    return true;
  });
}

function encabezado(titulo, origen) {
  return [
    "-- " + "=".repeat(74),
    `-- ${titulo}`,
    `-- Origen: ${origen}`,
    "-- Generado automáticamente. No editar a mano: se sobrescribe.",
    "-- " + "=".repeat(74),
    "",
  ].join("\n");
}

async function leerSql(nombre) {
  return readFile(join(dirSql, nombre), "utf8");
}

async function principal() {
  console.log("Generando migración desde src/db/schema.ts…");

  const { generateDrizzleJson, generateMigration } = await cargarGenerador();
  const esquema = await cargarEsquema();

  await mkdir(dirSalida, { recursive: true });

  // El punto de partida es una base vacía: `generateMigration` compara dos
  // snapshots y devuelve la lista de sentencias que llevan de uno al otro.
  const snapshot = generateDrizzleJson(esquema);
  const vacio = generateDrizzleJson({});
  const sentencias = await generateMigration(vacio, snapshot);

  // El espejo de `neon_auth` no se migra: ese esquema es de Neon Auth.
  const esquemasAjenos = esquemasExternosPresentes(esquema);
  const propias = filtrarSentencias(sentencias, esquemasAjenos);
  if (esquemasAjenos.size > 0) {
    console.log(
      `Se omitieron ${sentencias.length - propias.length} sentencias de esquemas externos (${[...esquemasAjenos].join(", ")}).`,
    );
  }

  // La API devuelve un arreglo de sentencias sueltas, sin `;`. Se normaliza a un
  // solo guion para poder concatenarlo con el SQL escrito a mano.
  const ddl = propias
    .map((sentencia) => String(sentencia).trim().replace(/;+$/, ""))
    .filter((sentencia) => sentencia.length > 0)
    .map((sentencia) => `${sentencia};`)
    .join("\n\n");

  // Se guarda el DDL crudo aparte y el snapshot, que es lo que permite comparar
  // la próxima vez en lugar de regenerar todo desde cero.
  await mkdir(dirTemporal, { recursive: true });
  await writeFile(join(dirTemporal, "ddl-crudo.sql"), `${ddl}\n`, "utf8");
  await writeFile(
    join(dirTemporal, "snapshot.json"),
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8",
  );

  const aprovisionamiento = await leerSql("aprovisionamiento.sql");
  const rls = await leerSql("rls.sql");

  const partes = [
    encabezado("Motiapp — esquema inicial", "src/db/schema.ts"),
    "-- Este archivo se aplica con el rol dueño, no con el rol de la aplicación.",
    "",
    ddl,
    "",
    encabezado("Aprovisionamiento de roles", "src/db/sql/aprovisionamiento.sql"),
    aprovisionamiento,
    "",
    encabezado("Aislamiento entre negocios (RLS)", "src/db/sql/rls.sql"),
    rls,
    "",
  ];

  const destino = join(dirSalida, "0000_inicial.sql");
  await writeFile(destino, partes.join("\n"), "utf8");

  const manifiesto = {
    generadoEn: new Date().toISOString(),
    archivo: "0000_inicial.sql",
    compuesto: [
      "src/db/schema.ts (DDL de tablas, generado por drizzle-kit)",
      "src/db/sql/aprovisionamiento.sql",
      "src/db/sql/rls.sql",
    ],
    ordenImporta: true,
    nota:
      "El aprovisionamiento y el RLS van al final a propósito: las políticas no se pueden crear antes que las tablas.",
  };
  await writeFile(
    join(dirSalida, "0000_inicial.manifiesto.json"),
    `${JSON.stringify(manifiesto, null, 2)}\n`,
    "utf8",
  );

  // El DDL crudo y el snapshot quedan en `drizzle/.generado/` para poder
  // comparar a mano cuando una migración incremental no salga como se espera.
  const contenido = await readFile(destino, "utf8");
  console.log(`Escrito ${relative(raiz, destino)} (${contenido.length} caracteres).`);
  console.log(`DDL crudo y snapshot en ${relative(raiz, dirTemporal)}.`);
}

principal().catch((error) => {
  console.error("Falló la generación de la migración:");
  console.error(error);
  process.exitCode = 1;
});
