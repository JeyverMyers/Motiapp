-- ==========================================================================
-- 0006 — Empeños: número automático por negocio y bienes de tipo «otro»
-- ==========================================================================
--
-- Se aplica DESPUÉS de 0005, con el rol dueño. Es reejecutable.
--
-- ## B5.2 — Número automático (EMP-0001, EMP-0002…)
--
-- `consecutivos_empeno` guarda el último número usado por cada negocio. El alta
-- lo toma con `insert … on conflict do update … returning` DENTRO de la misma
-- transacción que inserta el empeño: la fila queda bloqueada hasta el commit,
-- así que dos altas simultáneas del mismo negocio nunca reciben el mismo número
-- (el `max() + 1` que se intentó antes sí los repetía). Si el alta falla, el
-- rollback devuelve el número.
--
-- El contador arranca en el mayor número que ya tenga cada negocio, sea cual
-- sea su formato («0005», «E-12», «EMP-0003»), para que el siguiente sea mayor
-- que todos y no choque con el índice único `(tenant_id, numero)`.
--
-- ## B5.3 — Bien de tipo «otro»
--
-- Para lo que no es moto, carro ni teléfono (una herramienta, una joya, un
-- equipo). No tiene tabla propia: lo único obligatorio es qué es y en cuánto se
-- tasó, y el resto es un identificador libre opcional (serie, referencia). Van
-- en columnas de `empenos`, y el CHECK de coherencia exige que un «otro» no
-- apunte a vehículo ni a teléfono y traiga descripción y valor.
-- ==========================================================================

create table if not exists public.consecutivos_empeno (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  ultimo bigint not null default 0,
  actualizado_en timestamptz not null default now(),
  constraint consecutivos_empeno_ultimo_check check (ultimo >= 0)
);

alter table public.consecutivos_empeno enable row level security;
drop policy if exists "aislamiento_por_tenant" on public.consecutivos_empeno;
create policy "aislamiento_por_tenant" on public.consecutivos_empeno
  for all
  to motiapp_app
  using (app.puede_ver_tenant(tenant_id))
  with check (app.puede_ver_tenant(tenant_id));
-- Sin DELETE: el contador solo avanza.
grant select, insert, update on public.consecutivos_empeno to motiapp_app;

insert into public.consecutivos_empeno (tenant_id, ultimo)
select t.id,
       coalesce(max(nullif(regexp_replace(e.numero, '\D', '', 'g'), '')::bigint), 0)
from public.tenants t
left join public.empenos e on e.tenant_id = t.id
group by t.id
on conflict (tenant_id) do update
  set ultimo = greatest(public.consecutivos_empeno.ultimo, excluded.ultimo);

alter table public.empenos
  add column if not exists bien_descripcion text,
  add column if not exists bien_identificador text,
  add column if not exists valor_tasacion bigint;

alter table public.empenos drop constraint if exists empenos_tipo_bien_check;
alter table public.empenos
  add constraint empenos_tipo_bien_check
  check (tipo_bien in ('moto', 'carro', 'telefono', 'otro'));

alter table public.empenos drop constraint if exists empenos_bien_coherente_check;
alter table public.empenos
  add constraint empenos_bien_coherente_check check (
    (tipo_bien = 'telefono' and telefono_id is not null and vehiculo_id is null)
    or (tipo_bien in ('moto', 'carro') and vehiculo_id is not null and telefono_id is null)
    or (
      tipo_bien = 'otro' and vehiculo_id is null and telefono_id is null
      and bien_descripcion is not null and valor_tasacion is not null
    )
  );

alter table public.empenos drop constraint if exists empenos_valor_tasacion_check;
alter table public.empenos
  add constraint empenos_valor_tasacion_check check (valor_tasacion is null or valor_tasacion > 0);
