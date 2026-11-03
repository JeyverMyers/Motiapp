/**
 * Crea una cuenta en Neon Auth para producción (el registro público está
 * cerrado: las cuentas solo las abre el administrador).
 *
 *   node --env-file=.env.produccion scripts/alta-usuario.mjs correo@ejemplo.co "Nombre Apellido"
 *   node --env-file=.env.produccion scripts/alta-usuario.mjs correo@ejemplo.co "Nombre" --super-admin
 *
 * - Sin `--super-admin` solo crea la cuenta. Después, en `/admin`, se le asigna
 *   su negocio con «Asignar dueño» (busca la cuenta por correo).
 * - Con `--super-admin` además crea su perfil de administrador de la plataforma.
 * - La contraseña se genera al azar y se imprime UNA vez en esta terminal, para
 *   entregarla a la persona por un canal privado. No se guarda en ningún lado.
 * - Si la cuenta ya existe no la toca (Neon Auth no deja cambiar la contraseña
 *   sin la actual); el dueño puede usar «¿Olvidaste tu contraseña?».
 *
 * Variables: `DATABASE_URL_MIGRACIONES` (rol dueño) y `NEON_AUTH_BASE_URL`.
 * `NEXT_PUBLIC_URL_SITIO` se manda como origen (Neon Auth valida el dominio).
 */

import { randomBytes } from "node:crypto";
import { Pool } from "pg";

const posicionales = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const SUPER_ADMIN = process.argv.includes("--super-admin");
const [email, nombre] = posicionales;

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !nombre) {
  console.error('Uso: node --env-file=.env.produccion scripts/alta-usuario.mjs correo@ejemplo.co "Nombre" [--super-admin]');
  process.exit(1);
}

const urlDueno = process.env.DATABASE_URL_MIGRACIONES;
const urlAuth = process.env.NEON_AUTH_BASE_URL?.replace(/\/$/, "");
const origen = process.env.NEXT_PUBLIC_URL_SITIO ?? "http://localhost:3000";
if (!urlDueno || !urlAuth) {
  console.error("Faltan DATABASE_URL_MIGRACIONES o NEON_AUTH_BASE_URL en el archivo de variables.");
  process.exit(1);
}

const pool = new Pool({ connectionString: urlDueno, max: 1 });

async function idPorCorreo(cliente) {
  const { rows } = await cliente.query(`select id from neon_auth."user" where lower(email) = lower($1) limit 1`, [email]);
  return rows[0]?.id ?? null;
}

async function main() {
  const cliente = await pool.connect();
  try {
    let id = await idPorCorreo(cliente);
    let password = null;

    if (id) {
      console.log(`La cuenta ${email} ya existía: no se cambió su contraseña.`);
    } else {
      password = randomBytes(12).toString("base64url");
      const respuesta = await fetch(`${urlAuth}/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: origen },
        body: JSON.stringify({ email, password, name: nombre }),
      });
      if (!respuesta.ok) {
        const detalle = await respuesta.text().catch(() => "");
        throw new Error(`Neon Auth rechazó crear la cuenta (HTTP ${respuesta.status}): ${detalle.slice(0, 300)}`);
      }
      id = (await respuesta.json())?.user?.id ?? (await idPorCorreo(cliente));
      if (!id) throw new Error("Neon Auth no devolvió el id de la cuenta.");
      console.log(`Cuenta creada: ${email}`);
    }

    if (SUPER_ADMIN) {
      await cliente.query(
        `insert into usuarios (auth_user_id, tenant_id, email, nombre, rol, activo)
         values ($1, null, $2, $3, 'super_admin', true)
         on conflict (auth_user_id) do update set rol = 'super_admin', tenant_id = null, activo = true`,
        [id, email, nombre],
      );
      console.log("Perfil de super administrador listo.");
    } else {
      console.log("Ahora asígnala a su negocio en /admin → el negocio → «Asignar dueño».");
    }

    if (password) {
      console.log(`\nContraseña inicial (se muestra solo esta vez): ${password}\n`);
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
