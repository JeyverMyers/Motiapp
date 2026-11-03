-- ==========================================================================
-- 0003 — Tabla `ventas`
-- ==========================================================================
--
-- Se aplica DESPUÉS de 0002, con el rol dueño. Es reejecutable.
--
-- ## Por qué
--
-- Hasta aquí la venta vivía en la fila de la moto. Con una tabla propia:
--   - hay auditoría: cada venta es una fila con su fecha de registro;
--   - una devolución marca la venta como `devuelta` sin borrar su historia, y
--     la moto puede volver a venderse (otra fila);
--   - el reporte financiero lee una sola tabla de hechos.
--
-- ## Qué cambia
--
-- 1. `ventas`: comprador por `cliente_id` (ya no texto suelto en la moto),
--    precio publicado y pactado. `descuento_aplicado` es una columna GENERADA:
--    la base la calcula y no puede quedar desactualizada (regla 2: los números
--    se calculan, no se guardan a mano).
-- 2. Llaves foráneas compuestas `(tenant_id, moto_id)` y `(tenant_id, cliente_id)`:
--    una venta no puede apuntar a la moto ni al cliente de otro negocio, ni
--    siquiera saltándose RLS.
-- 3. Una moto tiene a lo sumo UNA venta `activa` (índice único parcial).
-- 4. Se copian las ventas existentes y el comprador pasa a `clientes`.
-- 5. `motos.precio_venta` pasa a ser `precio_publicado` (el precio al que se
--    ofrece) y salen de `motos` las columnas de la venta.
--
-- RLS: la misma política `aislamiento_por_tenant` que el resto de tablas de
-- negocio (ver 0000).
-- ==========================================================================

-- Las llaves compuestas necesitan una restricción única que las respalde.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'motos_tenant_id_unique') then
    alter table public.motos add constraint motos_tenant_id_unique unique (tenant_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'clientes_tenant_id_unique') then
    alter table public.clientes add constraint clientes_tenant_id_unique unique (tenant_id, id);
  end if;
end
$$;

create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  moto_id uuid not null,
  cliente_id uuid not null,

  precio_publicado bigint,
  precio_pactado bigint not null,
  descuento_aplicado bigint generated always as (
    case when precio_publicado is null then 0 else precio_publicado - precio_pactado end
  ) stored,

  fecha date not null,
  metodo_pago text not null default 'efectivo',
  observaciones text,

  -- `activa` | `devuelta`.
  estado text not null default 'activa',
  devuelta_en timestamptz,

  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  constraint ventas_moto_fk foreign key (tenant_id, moto_id)
    references public.motos (tenant_id, id),
  constraint ventas_cliente_fk foreign key (tenant_id, cliente_id)
    references public.clientes (tenant_id, id),
  constraint ventas_precio_pactado_check check (precio_pactado > 0),
  constraint ventas_precio_publicado_check check (precio_publicado is null or precio_publicado > 0),
  constraint ventas_metodo_pago_check check (metodo_pago in ('efectivo', 'transferencia', 'otro')),
  constraint ventas_estado_check check (estado in ('activa', 'devuelta')),
  constraint ventas_devuelta_check check ((estado = 'devuelta') = (devuelta_en is not null))
);

create unique index if not exists ventas_moto_activa_unique
  on public.ventas (moto_id) where estado = 'activa';
create index if not exists ventas_tenant_fecha_idx on public.ventas (tenant_id, fecha);
create index if not exists ventas_cliente_idx on public.ventas (cliente_id);

alter table public.ventas enable row level security;
drop policy if exists "aislamiento_por_tenant" on public.ventas;
create policy "aislamiento_por_tenant" on public.ventas
  for all
  to motiapp_app
  using (app.puede_ver_tenant(tenant_id))
  with check (app.puede_ver_tenant(tenant_id));
grant select, insert, update, delete on public.ventas to motiapp_app;

-- Copia de las ventas que vivían en `motos`. Solo corre mientras existan las
-- columnas viejas, así que reejecutar el archivo no duplica nada.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'motos' and column_name = 'comprador_cedula'
  ) then
    return;
  end if;

  if exists (
    select 1 from public.motos
    where estado = 'vendida' and (comprador_cedula is null or comprador_nombre is null)
  ) then
    raise exception 'Hay motos vendidas sin cédula o nombre del comprador: corrígelas antes de migrar.';
  end if;

  -- El comprador pasa a ser cliente. Si ya existía, se conserva su ficha.
  insert into public.clientes (tenant_id, numero_documento, nombres, telefono)
  select distinct on (m.tenant_id, m.comprador_cedula)
    m.tenant_id, m.comprador_cedula, m.comprador_nombre, coalesce(m.comprador_telefono, '')
  from public.motos m
  where m.estado = 'vendida'
  order by m.tenant_id, m.comprador_cedula, m.fecha_venta desc
  on conflict (tenant_id, numero_documento) do nothing;

  insert into public.ventas (
    tenant_id, moto_id, cliente_id, precio_publicado, precio_pactado,
    fecha, metodo_pago, observaciones, creado_en
  )
  select
    m.tenant_id, m.id, c.id, m.precio_venta, m.precio_venta,
    m.fecha_venta, coalesce(m.metodo_pago_venta, 'efectivo'), m.observaciones_venta, m.actualizado_en
  from public.motos m
  join public.clientes c
    on c.tenant_id = m.tenant_id and c.numero_documento = m.comprador_cedula
  where m.estado = 'vendida'
    and not exists (select 1 from public.ventas v where v.moto_id = m.id and v.estado = 'activa');
end
$$;

-- La moto conserva solo el precio al que se ofrece.
alter table public.motos drop constraint if exists motos_venta_completa_check;
alter table public.motos drop constraint if exists motos_metodo_pago_check;
alter table public.motos drop constraint if exists motos_precio_venta_check;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'motos' and column_name = 'precio_venta'
  ) then
    alter table public.motos rename column precio_venta to precio_publicado;
  end if;
end
$$;

alter table public.motos drop constraint if exists motos_precio_publicado_check;
alter table public.motos add constraint motos_precio_publicado_check
  check (precio_publicado is null or precio_publicado > 0);

alter table public.motos
  drop column if exists fecha_venta,
  drop column if exists comprador_nombre,
  drop column if exists comprador_cedula,
  drop column if exists comprador_telefono,
  drop column if exists metodo_pago_venta,
  drop column if exists observaciones_venta;
