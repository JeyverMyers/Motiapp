-- ==========================================================================
-- 0004 — Super administración: auditoría e impersonación de soporte
-- ==========================================================================
--
-- Se aplica DESPUÉS de 0003, con el rol dueño. Es reejecutable.
--
-- ## Qué cambia
--
-- 1. `auditoria_admin`: una fila por cada acción del super admin (crear o
--    editar un negocio, cambiar plan o estado, asignar dueño, entrar y salir en
--    modo soporte, borrar un negocio vacío). Solo se inserta y se lee: el rol de
--    la aplicación no tiene UPDATE ni DELETE, así que el registro no se puede
--    maquillar desde la app.
-- 2. `impersonaciones`: el modo soporte. Un super admin «entra» a un negocio
--    con un motivo obligatorio y por un tiempo limitado. La sesión NO guarda el
--    negocio en una cookie: lo resuelve `app.contexto_usuario` desde esta tabla,
--    igual que el negocio de un dueño sale de `usuarios`.
-- 3. `app.contexto_usuario` devuelve además el estado y el plan del negocio y si
--    el usuario está en modo soporte. Así la app puede negar la entrada a un
--    negocio suspendido y aplicar el plan sin una consulta extra.
--
-- Las dos tablas nuevas son de plataforma, no de negocio: la columna se llama
-- `negocio_id` (no `tenant_id`) y su política es solo para super admin. Un dueño
-- no ve cuándo ni por qué entró soporte.
-- ==========================================================================

create table if not exists public.auditoria_admin (
  id uuid primary key default gen_random_uuid(),
  -- Quién: el perfil del super admin. `set null` para que borrar un perfil no
  -- borre su historia; el correo queda copiado en la fila.
  usuario_id uuid references public.usuarios (id) on delete set null,
  usuario_email text not null,
  accion text not null,
  -- Sobre qué negocio. Sin llave foránea a propósito: el registro de un negocio
  -- borrado tiene que sobrevivir al negocio.
  negocio_id uuid,
  negocio_nombre text,
  detalle jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  constraint auditoria_admin_accion_check check (accion in (
    'crear_negocio', 'editar_negocio', 'cambiar_plan', 'cambiar_estado',
    'asignar_dueno', 'cambiar_acceso_usuario', 'eliminar_negocio',
    'iniciar_soporte', 'terminar_soporte'
  ))
);

create index if not exists auditoria_admin_creado_idx on public.auditoria_admin (creado_en desc);
create index if not exists auditoria_admin_negocio_idx on public.auditoria_admin (negocio_id, creado_en desc);

create table if not exists public.impersonaciones (
  id uuid primary key default gen_random_uuid(),
  super_admin_id uuid not null references public.usuarios (id) on delete cascade,
  negocio_id uuid not null references public.tenants (id) on delete cascade,
  motivo text not null,
  iniciada_en timestamptz not null default now(),
  expira_en timestamptz not null,
  terminada_en timestamptz,
  constraint impersonaciones_motivo_check check (length(trim(motivo)) >= 10),
  constraint impersonaciones_expira_check check (expira_en > iniciada_en)
);

-- A lo sumo una sesión de soporte abierta por super admin.
create unique index if not exists impersonaciones_abierta_unique
  on public.impersonaciones (super_admin_id) where terminada_en is null;

-- RLS: solo super administración. Sin `aislamiento_por_tenant`: no son tablas
-- de negocio y un dueño no debe verlas.
alter table public.auditoria_admin enable row level security;
drop policy if exists "solo_super_admin" on public.auditoria_admin;
create policy "solo_super_admin" on public.auditoria_admin
  for all to motiapp_app
  using (app.es_super_admin())
  with check (app.es_super_admin());
revoke all on public.auditoria_admin from motiapp_app;
grant select, insert on public.auditoria_admin to motiapp_app;

alter table public.impersonaciones enable row level security;
drop policy if exists "solo_super_admin" on public.impersonaciones;
create policy "solo_super_admin" on public.impersonaciones
  for all to motiapp_app
  using (app.es_super_admin())
  with check (app.es_super_admin());
revoke all on public.impersonaciones from motiapp_app;
grant select, insert, update on public.impersonaciones to motiapp_app;

-- El tipo de retorno cambia: hay que borrar y volver a crear la función.
drop function if exists app.contexto_usuario(text);

-- Mismo contrato de seguridad que en 0000 (ver allí por qué es SECURITY
-- DEFINER): recibe el id de la sesión firmada y devuelve una sola fila.
-- Para un super admin con una sesión de soporte abierta y vigente, `tenant_id`
-- es el negocio que está atendiendo e `impersonando` es verdadero.
create function app.contexto_usuario(p_auth_user_id text)
returns table (
  tenant_id uuid,
  rol text,
  usuario_id uuid,
  activo boolean,
  negocio_estado text,
  negocio_plan text,
  impersonando boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(u.tenant_id, i.negocio_id),
    u.rol,
    u.id,
    u.activo,
    t.estado,
    t.plan,
    i.negocio_id is not null
  from public.usuarios u
  left join lateral (
    select imp.negocio_id
    from public.impersonaciones imp
    where u.rol = 'super_admin'
      and imp.super_admin_id = u.id
      and imp.terminada_en is null
      and imp.expira_en > now()
    order by imp.iniciada_en desc
    limit 1
  ) i on true
  left join public.tenants t on t.id = coalesce(u.tenant_id, i.negocio_id)
  where u.auth_user_id = p_auth_user_id
  limit 1
$$;

comment on function app.contexto_usuario(text) is
  'Negocio, rol, id interno, estado y plan del negocio y modo soporte del usuario autenticado. SECURITY DEFINER para romper la recursión de la política de usuarios.';

revoke all on function app.contexto_usuario(text) from public;
grant execute on function app.contexto_usuario(text) to motiapp_app;
