-- ==========================================================================
-- 0007 — Lectura de cuentas de Neon Auth por función, no por permiso de esquema
-- ==========================================================================
--
-- Se aplica DESPUÉS de 0006, con el rol dueño. Es reejecutable.
--
-- ## El problema
--
-- `0000` le daba al rol de la app `select` sobre TODO el esquema `neon_auth`,
-- pero solo si el esquema ya existía al migrar. En la rama de desarrollo Neon
-- Auth se activó después, así que el permiso nunca quedó y «Asignar dueño» en
-- `/admin` fallaba con «permission denied for schema neon_auth».
--
-- Y aunque hubiera quedado, era demasiado: `neon_auth` incluye la tabla de
-- cuentas con los hashes de contraseña y las sesiones.
--
-- ## La solución
--
-- Una función `security definer` (corre con los permisos del dueño) que
-- devuelve solo el id y la fecha de creación de la cuenta con ese correo, y
-- solo dentro de una transacción de super admin (`conAdmin`). El rol de la app
-- pierde cualquier permiso directo sobre `neon_auth`.
-- ==========================================================================

create or replace function app.cuenta_auth_por_correo(p_email text)
returns table (id text, creada_en timestamptz)
language sql
stable
security definer
set search_path = pg_catalog, neon_auth
as $$
  select u.id::text, u."createdAt"::timestamptz
  from neon_auth."user" u
  where lower(u.email) = lower(p_email)
    and coalesce(current_setting('app.es_super_admin', true), '') = 'true'
  limit 1
$$;

revoke all on function app.cuenta_auth_por_correo(text) from public;
grant execute on function app.cuenta_auth_por_correo(text) to motiapp_app;

-- Sin acceso directo de la app a las tablas de Neon Auth.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'neon_auth') then
    execute 'alter default privileges in schema neon_auth revoke select on tables from motiapp_app';
    execute 'revoke select on all tables in schema neon_auth from motiapp_app';
    execute 'revoke usage on schema neon_auth from motiapp_app';
  end if;
end
$$;
