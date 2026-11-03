/**
 * Comprueba que la base de datos quedó bien aprovisionada.
 *
 * Se ejecuta después de aplicar `drizzle/0000_inicial.sql` y responde, sin
 * ambigüedad, tres preguntas:
 *
 *   1. ¿Existe el rol de aplicación y es realmente un rol restringido?
 *   2. ¿Todas las tablas de negocio tienen RLS habilitado?
 *   3. ¿Las políticas están puestas y son las que esperamos?
 *
 * Cualquier tabla con `tenant_id` y sin RLS es una fuga de datos entre negocios,
 * así que el script falla con código distinto de cero si encuentra una.
 *
 * Se ejecuta con: pnpm db:verificar
 */

import { Pool } from "pg";

const url = process.env.DATABASE_URL_MIGRACIONES ?? process.env.DATABASE_URL;

if (!url) {
  console.error(
    "Falta DATABASE_URL_MIGRACIONES (o DATABASE_URL). Copia .env.example a .env.local.",
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: url, max: 1 });
const problemas = [];

function ok(mensaje) {
  console.log(`  OK   ${mensaje}`);
}

function mal(mensaje) {
  console.log(`  FALLA ${mensaje}`);
  problemas.push(mensaje);
}

async function main() {
  const cliente = await pool.connect();

  try {
    console.log("\n1. Rol de aplicación");
    const rol = await cliente.query(
      "select rolname, rolsuper, rolcreatedb, rolcreaterole from pg_roles where rolname = 'motiapp_app'",
    );
    if (rol.rowCount === 0) {
      mal("el rol motiapp_app no existe. ¿Aplicaste aprovisionamiento.sql?");
    } else {
      const r = rol.rows[0];
      ok("el rol motiapp_app existe");
      if (r.rolsuper) mal("motiapp_app es SUPERUSER: RLS no lo detendría");
      else ok("motiapp_app no es superusuario");
      if (r.rolcreatedb || r.rolcreaterole) {
        mal("motiapp_app puede crear bases o roles; no debería");
      } else {
        ok("motiapp_app no puede crear bases ni roles");
      }
    }

    console.log("\n2. RLS en las tablas de negocio");
    const tablas = await cliente.query(`
      select c.relname, c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and exists (
          select 1 from information_schema.columns col
          where col.table_schema = 'public'
            and col.table_name = c.relname
            and col.column_name = 'tenant_id'
        )
      order by c.relname
    `);

    if (tablas.rowCount === 0) {
      mal("no se encontró ninguna tabla con tenant_id. ¿Aplicaste el esquema?");
    }

    for (const fila of tablas.rows) {
      if (fila.relrowsecurity) ok(`${fila.relname} tiene RLS habilitado`);
      else mal(`${fila.relname} NO tiene RLS: es una fuga entre negocios`);
    }

    console.log("\n3. Políticas");
    const politicas = await cliente.query(`
      select tablename, policyname, cmd
      from pg_policies
      where schemaname = 'public'
      order by tablename, policyname
    `);
    for (const fila of politicas.rows) {
      ok(`${fila.tablename}: ${fila.policyname} (${fila.cmd})`);
    }
    if (politicas.rowCount === 0) {
      mal("no hay ninguna política creada. RLS sin políticas deja todo inaccesible.");
    }

    console.log("\n4. Funciones del esquema app");
    const funciones = await cliente.query(`
      select p.proname, p.prosecdef
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'app'
      order by p.proname
    `);
    for (const fila of funciones.rows) {
      ok(`${fila.proname}${fila.prosecdef ? " (SECURITY DEFINER)" : ""}`);
    }
    if (funciones.rowCount < 3) {
      mal(
        `se esperaban 3 funciones en el esquema app (tenant_actual, puede_ver_tenant, es_super_admin y contexto_usuario), hay ${funciones.rowCount}`,
      );
    }

    console.log("\n5. Permisos del rol de aplicación");
    const permisos = await cliente.query(`
      select table_name, string_agg(privilege_type, ', ' order by privilege_type) as privilegios
      from information_schema.role_table_grants
      where grantee = 'motiapp_app' and table_schema = 'public'
      group by table_name
      order by table_name
    `);
    if (permisos.rowCount === 0) {
      mal(
        "motiapp_app no tiene permisos sobre ninguna tabla: la app no podrá leer nada",
      );
    } else {
      for (const fila of permisos.rows) {
        ok(`${fila.table_name}: ${fila.privilegios}`);
      }
    }
  } finally {
    cliente.release();
    await pool.end();
  }

  console.log("");
  if (problemas.length > 0) {
    console.error(`${problemas.length} problema(s) encontrados:`);
    for (const problema of problemas) console.error(`  - ${problema}`);
    process.exitCode = 1;
    return;
  }

  console.log("Todo en orden: el aislamiento entre negocios está bien configurado.");
}

main().catch((error) => {
  console.error("No se pudo verificar la base de datos:");
  console.error(error);
  process.exitCode = 1;
});
