-- ==========================================================================
-- 0002 — Motos: estado «dada de baja» y borrado lógico
-- ==========================================================================
--
-- Se aplica DESPUÉS de 0001, con el rol dueño. Es idempotente.
--
-- ## Qué cambia
--
-- 1. Nuevo estado `dada_de_baja` (chatarrizada, robada, sin papeles). Se puede
--    revertir a `disponible` desde la app.
-- 2. Borrado lógico: `eliminada_en`. La moto sale de listados y reportes pero la
--    fila sigue ahí; sus gastos siguen contando, porque ese dinero sí salió.
-- 3. La placa ya no es única entre TODAS las motos del negocio, sino entre las
--    no eliminadas: un índice único parcial. Así borrar una moto registrada por
--    error no impide volver a registrar esa placa. Se conserva el nombre
--    `motos_tenant_placa_unique` porque la app lo usa para traducir el error.
--
-- RLS no cambia: la política es por fila y una columna nueva hereda los
-- permisos de la tabla.
-- ==========================================================================

alter table public.motos add column if not exists eliminada_en timestamptz;

alter table public.motos drop constraint if exists motos_estado_check;
alter table public.motos add constraint motos_estado_check
  check (estado in ('disponible', 'reservada', 'en_reparacion', 'vendida', 'devuelta', 'dada_de_baja'));

-- La restricción única se reemplaza por un índice único parcial. Primero se
-- quita la restricción (que se lleva su índice) y luego se crea el índice.
alter table public.motos drop constraint if exists motos_tenant_placa_unique;
create unique index if not exists motos_tenant_placa_unique
  on public.motos (tenant_id, placa)
  where eliminada_en is null;
