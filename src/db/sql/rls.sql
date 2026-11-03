-- ============================================================================
-- Aislamiento entre negocios (Row Level Security)
-- ============================================================================
--
-- Este archivo se ejecuta SIEMPRE después del DDL del esquema. Es idempotente:
-- se puede volver a aplicar sin romper nada.
--
-- ## El modelo
--
-- La aplicación se conecta con el rol `motiapp_app`, que NO es dueño de las
-- tablas. Ese detalle es el que hace que RLS sirva: en Postgres, el dueño de una
-- tabla ignora sus propias políticas salvo que se use FORCE ROW LEVEL SECURITY,
-- y aquí evitamos depender de eso separando los roles desde el principio.
--
-- Cada petición abre una transacción y fija:
--
--   set_config('app.tenant_id',     '<uuid del negocio>', true)
--   set_config('app.es_super_admin', 'true',              true)   -- solo en /admin
--
-- El tercer argumento `true` hace el ajuste local a la transacción, así que una
-- conexión reutilizada del pool nunca arrastra el contexto de la petición
-- anterior.
--
-- ## Por qué `missing_ok = true`
--
-- Todas las lecturas usan `current_setting('app.tenant_id', true)`. Si el
-- contexto no está fijado, devuelve NULL en vez de lanzar error, la comparación
-- resulta NULL y la política no deja pasar ninguna fila. Un olvido se convierte
-- en "cero resultados", nunca en una fuga de datos.
--
-- ## Cómo agregar una tabla nueva
--
--   1. Crear la tabla con su columna `tenant_id` (el DDL de Drizzle ya lo hace).
--   2. `alter table <tabla> enable row level security;`
--   3. `create policy ... using (app.puede_ver_tenant(tenant_id)) with check (...);`
--   4. `grant select, insert, update, delete on <tabla> to motiapp_app;`
--
-- Si el paso 4 se olvida, la tabla queda inaccesible y el error es de permisos,
-- no de datos: falla ruidosamente, que es lo que queremos.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Esquema auxiliar: funciones que las políticas necesitan
-- ----------------------------------------------------------------------------

create schema if not exists app;


-- ¿Quién es el negocio de la petición actual?
--
-- Es `stable` y no `volatile` para que Postgres pueda evaluarla una sola vez por
-- consulta en lugar de una vez por fila. Es la diferencia entre un scan y un
-- desastre de rendimiento en tablas grandes.
create or replace function app.tenant_actual()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

comment on function app.tenant_actual() is
  'Negocio de la petición actual, fijado por la aplicación con set_config(..., true). NULL si no hay contexto.';


-- ¿La petición viene del panel de super administración?
create or replace function app.es_super_admin()
returns boolean
language sql
stable
as $$
  select coalesce(nullif(current_setting('app.es_super_admin', true), ''), 'false') = 'true'
$$;

comment on function app.es_super_admin() is
  'Verdadero solo dentro de una transacción abierta por conAdmin(). Habilita ver todos los negocios.';


-- Regla de visibilidad, en un solo lugar.
--
-- Se usa como `using` y como `with check`: así una fila que no se puede ver
-- tampoco se puede insertar ni reescribir apuntando a otro negocio. Sin el
-- `with check`, un dueño podría crear datos a nombre de otro.
create or replace function app.puede_ver_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select app.es_super_admin() or p_tenant_id = app.tenant_actual()
$$;

comment on function app.puede_ver_tenant(uuid) is
  'Regla única de aislamiento: la fila es del negocio de la petición, o la petición es de super administración.';


-- Resuelve negocio y rol a partir del usuario de Neon Auth.
--
-- ## Por qué es SECURITY DEFINER (y por qué es imprescindible)
--
-- Hay un problema de huevo y gallina: para consultar `usuarios` hace falta el
-- contexto de tenant, pero el contexto de tenant sale justamente de `usuarios`.
-- La política de `usuarios` no puede leer `usuarios` (Postgres rechaza la
-- recursión), así que la única salida limpia es una función que corra con los
-- permisos del dueño y por lo tanto no esté sujeta a RLS.
--
-- ## Por qué eso no rompe el aislamiento
--
-- La función recibe el id del usuario autenticado —que la aplicación obtuvo de
-- la sesión firmada, no del cliente— y devuelve EXACTAMENTE una fila: el
-- negocio de ese usuario. No acepta filtros, no devuelve datos de negocio y no
-- permite enumerar. `search_path` queda fijo para que nadie pueda secuestrar la
-- resolución de nombres con un esquema propio.
create or replace function app.contexto_usuario(p_auth_user_id text)
returns table (tenant_id uuid, rol text, usuario_id uuid, activo boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.tenant_id, u.rol, u.id, u.activo
  from public.usuarios u
  where u.auth_user_id = p_auth_user_id
  limit 1
$$;

comment on function app.contexto_usuario(text) is
  'Devuelve el negocio, el rol y el id interno del usuario autenticado. SECURITY DEFINER para romper la recursión de la política de usuarios.';

revoke all on function app.contexto_usuario(text) from public;
grant execute on function app.contexto_usuario(text) to motiapp_app;


-- ----------------------------------------------------------------------------
-- RLS en todas las tablas de negocio
-- ----------------------------------------------------------------------------
--
-- Se recorre el catálogo en vez de escribir cada `alter table` a mano: una tabla
-- nueva con `tenant_id` queda protegida por el solo hecho de existir. Es la
-- diferencia entre una regla que se cumple y una que hay que recordar.
--
-- Excepción deliberada: `neon_auth` es de Neon Auth y no se toca.
do $$
declare
  tabla record;
begin
  for tabla in
    select c.table_schema, c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
    where c.column_name = 'tenant_id'
      and c.table_schema = 'public'
      and t.table_type = 'BASE TABLE'
  loop
    execute format('alter table %I.%I enable row level security', tabla.table_schema, tabla.table_name);

    -- `drop policy if exists` antes de crear: hace el archivo reejecutable.
    execute format(
      'drop policy if exists "aislamiento_por_tenant" on %I.%I',
      tabla.table_schema, tabla.table_name
    );

    execute format(
      'create policy "aislamiento_por_tenant" on %I.%I
         for all
         to motiapp_app
         using (app.puede_ver_tenant(tenant_id))
         with check (app.puede_ver_tenant(tenant_id))',
      tabla.table_schema, tabla.table_name
    );

    execute format(
      'grant select, insert, update, delete on %I.%I to motiapp_app',
      tabla.table_schema, tabla.table_name
    );
  end loop;
end
$$;


-- ----------------------------------------------------------------------------
-- Políticas de las tablas que cruzan negocios
-- ----------------------------------------------------------------------------

-- `tenants`: un dueño ve su propio negocio y nada más. El super admin ve todos.
alter table public.tenants enable row level security;

drop policy if exists "tenants_lectura" on public.tenants;
create policy "tenants_lectura" on public.tenants
  for select to motiapp_app
  using (app.es_super_admin() or id = app.tenant_actual());

drop policy if exists "tenants_escritura" on public.tenants;
create policy "tenants_escritura" on public.tenants
  for update to motiapp_app
  using (app.es_super_admin() or id = app.tenant_actual())
  with check (app.es_super_admin() or id = app.tenant_actual());

-- El dueño no puede suspender su propio negocio ni cambiarse el plan: eso es
-- potestad del super admin. La aplicación además lo valida en la Server Action.
revoke update on public.tenants from motiapp_app;
grant update (nombre, nit, telefono, email_contacto, ciudad, direccion, tasa_mensual_defecto)
  on public.tenants to motiapp_app;


-- `usuarios`: cada quien ve los usuarios de su negocio. El super admin, todos.
--
-- La política no puede consultar `usuarios` dentro de sí misma (Postgres
-- rechaza la recursión), y para eso existe `app.tenant_actual()`: el tenant sale
-- del contexto de la petición, no de una subconsulta a esta tabla.
alter table public.usuarios enable row level security;

drop policy if exists "usuarios_aislamiento" on public.usuarios;
create policy "usuarios_aislamiento" on public.usuarios
  for all to motiapp_app
  using (app.es_super_admin() or tenant_id = app.tenant_actual())
  with check (app.es_super_admin() or tenant_id = app.tenant_actual());


-- `solicitudes_demo`: no tiene tenant. Cualquiera puede dejar una solicitud
-- (viene de la landing pública), pero solo el super admin puede leerlas. Un
-- dueño no tiene por qué ver los prospectos de los demás.
alter table public.solicitudes_demo enable row level security;

drop policy if exists "solicitudes_demo_insertar" on public.solicitudes_demo;
create policy "solicitudes_demo_insertar" on public.solicitudes_demo
  for insert to motiapp_app
  with check (true);

drop policy if exists "solicitudes_demo_admin" on public.solicitudes_demo;
create policy "solicitudes_demo_admin" on public.solicitudes_demo
  for select to motiapp_app
  using (app.es_super_admin());


-- ----------------------------------------------------------------------------
-- Permisos del rol de aplicación
-- ----------------------------------------------------------------------------

-- `app` no debe ser escribible desde la aplicación: son funciones de política.
revoke create on schema public from motiapp_app;
grant usage on schema public, app to motiapp_app;
grant execute on all functions in schema app to motiapp_app;

-- Las secuencias (si algún día se usan) también necesitan permiso.
grant usage, select on all sequences in schema public to motiapp_app;

-- El rol de aplicación no debe poder desactivar RLS ni cambiarse los permisos.
-- (`alter` no es un privilegio de tabla: lo impide no ser dueño, no un revoke.)
revoke truncate, references, trigger on all tables in schema public from motiapp_app;


-- ----------------------------------------------------------------------------
-- Verificación
-- ----------------------------------------------------------------------------
--
-- Después de aplicar esto, comprobar que ninguna tabla de negocio quedó sin RLS:
--
--   select c.relname
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--   join information_schema.columns col
--     on col.table_name = c.relname and col.table_schema = n.nspname
--   where n.nspname = 'public'
--     and c.relkind = 'r'
--     and col.column_name = 'tenant_id'
--     and c.relrowsecurity = false;
--
-- Debe devolver cero filas. Si devuelve alguna, esa tabla es una fuga.
