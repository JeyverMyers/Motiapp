/**
 * Lectura y validación de variables de entorno.
 *
 * Se valida con Zod al arrancar para que un despliegue mal configurado falle con
 * un mensaje claro en vez de con un `undefined` a mitad de una consulta.
 *
 * Dos cadenas de conexión, a propósito:
 *
 * - `DATABASE_URL` usa el rol restringido `motiapp_app` y el host con `-pooler`.
 *   Es la que usan TODAS las peticiones. Sobre este rol pesan las políticas RLS.
 * - `DATABASE_URL_MIGRACIONES` usa el rol dueño del esquema y el host directo.
 *   Solo la usan las migraciones y el script de aprovisionamiento.
 *
 * Si la app usara la conexión de migraciones, RLS se saltaría en silencio porque
 * el dueño de una tabla no está sujeto a sus propias políticas. Ver DEUDAS.md.
 */

import { z } from "zod";

const esquemaServidor = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (valor) => valor.startsWith("postgres://") || valor.startsWith("postgresql://"),
      "DATABASE_URL debe ser una cadena de conexión de Postgres",
    ),
  // Opcional en ejecución: la app nunca la usa, solo las pruebas y los scripts
  // de migración. En Vercel NO se configura: es el rol dueño, que se salta RLS.
  DATABASE_URL_MIGRACIONES: z
    .string()
    .min(1)
    .refine(
      (valor) => valor.startsWith("postgres://") || valor.startsWith("postgresql://"),
      "DATABASE_URL_MIGRACIONES debe ser una cadena de conexión de Postgres",
    )
    .optional(),

  NEON_AUTH_BASE_URL: z.string().url("NEON_AUTH_BASE_URL debe ser una URL"),
  NEON_AUTH_COOKIE_SECRET: z
    .string()
    .min(32, "NEON_AUTH_COOKIE_SECRET debe tener al menos 32 caracteres"),

  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_SOPORTE: z.string().email().optional(),

  /** Secreto que protege los endpoints de cron de Vercel. */
  CRON_SECRET: z.string().min(16).optional(),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Entorno = z.infer<typeof esquemaServidor>;

function leerEntorno(): Entorno {
  const resultado = esquemaServidor.safeParse(process.env);

  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Variables de entorno inválidas o faltantes:\n${detalle}\n\n` +
        "Copia .env.example a .env.local y completa los valores que faltan.",
    );
  }

  return resultado.data;
}

/**
 * El entorno se resuelve de forma perezosa: durante `next build` varias rutas se
 * evalúan sin que existan las variables, y no queremos que el build explote por
 * eso.
 */
let cache: Entorno | undefined;

export function entorno(): Entorno {
  cache ??= leerEntorno();
  return cache;
}

/** Bandera para saber si una integración opcional está configurada. */
export const integraciones = {
  emails: () => Boolean(process.env.RESEND_API_KEY),
} as const;
