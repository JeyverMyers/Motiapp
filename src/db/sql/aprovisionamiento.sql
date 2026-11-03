-- ============================================================================
-- Aprovisionamiento de roles y permisos
-- ============================================================================
--
-- Se ejecuta UNA sola vez por base de datos, conectado como el rol dueño
-- (`neondb_owner` en Neon), ANTES de aplicar las migraciones.
--
-- ## Los dos roles y por qué existen
--
--   motiapp_owner  dueño de todo. Solo lo usan las migraciones.
--   motiapp_app    el rol de la aplicación. NO es dueño de nada, así que las
--                  políticas RLS le aplican de verdad.
--
-- Este es el punto entero del archivo. Si la aplicación se conectara con el rol
-- dueño, Postgres ignoraría las políticas RLS (el dueño de una tabla no está
-- sujeto a ellas salvo FORCE ROW LEVEL SECURITY) y el aislamiento entre negocios
-- sería decorativo.
--
-- ## Las dos cadenas de conexión resultantes
--
--   DATABASE_URL              postgresql://motiapp_app:...@<host>-pooler/neondb?sslmode=require
--   DATABASE_URL_MIGRACIONES  postgresql://neondb_owner:...@<host>/neondb?sslmode=require
--
-- Nótese que la primera apunta al pooler y la segunda al host directo: las
-- sesiones con `set_config` local necesitan transacciones interactivas, y las
-- migraciones necesitan una conexión estable.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Roles
-- ----------------------------------------------------------------------------

-- Las contraseñas NO van aquí. Se fijan aparte, una sola vez, con:
--
--   alter role motiapp_app with password '<contraseña generada>';
--
-- y se guardan en el gestor de secretos de Vercel. Un archivo de migración que
-- contiene contraseñas termina en el repositorio, siempre.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'motiapp_owner') then
    create role motiapp_owner nologin;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'motiapp_app') then
    create role motiapp_app login;
  end if;
end
$$;

-- La aplicación nunca debe poder crear objetos ni saltarse las políticas.
-- Sin `nosuperuser`: en Neon el rol dueño no es superusuario y Postgres le
-- prohíbe tocar ese atributo ("permission denied to alter role"). Un rol creado
-- por él nace sin superusuario de todos modos; la guarda de `src/db/index.ts` lo
-- comprueba al arrancar.
alter role motiapp_app nocreatedb nocreaterole noinherit;
alter role motiapp_app set search_path = public, app;


-- ----------------------------------------------------------------------------
-- 2. El rol de la aplicación debe poder leer el esquema de Neon Auth
-- ----------------------------------------------------------------------------
--
-- `usuarios.auth_user_id` guarda el id de `neon_auth.user`, y para validar que
-- un id existe hace falta poder leer esa tabla. Solo lectura: los usuarios los
-- administra Neon Auth, no nosotros.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'neon_auth') then
    execute 'grant usage on schema neon_auth to motiapp_app';
    execute 'grant select on all tables in schema neon_auth to motiapp_app';
    execute 'alter default privileges in schema neon_auth grant select on tables to motiapp_app';
  end if;
end
$$;


-- ----------------------------------------------------------------------------
-- 3. Permisos por defecto para las tablas que crearán las migraciones
-- ----------------------------------------------------------------------------
--
-- Sin esto habría que otorgar permisos tabla por tabla después de cada
-- migración. `rls.sql` igual los otorga de forma explícita, para que una base
-- restaurada desde cero no dependa solo de los privilegios por defecto.

alter default privileges in schema public
  grant select, insert, update, delete on tables to motiapp_app;

alter default privileges in schema public
  grant usage, select on sequences to motiapp_app;

alter default privileges in schema public
  grant execute on functions to motiapp_app;


-- ----------------------------------------------------------------------------
-- 4. Nada de CREATE sobre `public` para la aplicación
-- ----------------------------------------------------------------------------
--
-- En Postgres 15+ el esquema `public` ya no es escribible por cualquiera, pero
-- lo dejamos explícito: la aplicación no crea objetos, solo consulta.

revoke create on schema public from public;
grant usage on schema public to motiapp_app;
