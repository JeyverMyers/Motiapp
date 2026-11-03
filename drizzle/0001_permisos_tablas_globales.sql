-- ==========================================================================
-- 0001 — Permisos de las tablas que no tienen `tenant_id`
-- ==========================================================================
--
-- Se aplica DESPUÉS de 0000_inicial.sql, con el rol dueño. Es idempotente.
--
-- ## Qué arregla
--
-- 0000 otorga los permisos de `motiapp_app` de dos formas: el bucle de `rls.sql`
-- (solo tablas con `tenant_id`) y `alter default privileges` (solo tablas creadas
-- DESPUÉS de esa sentencia). `tenants` y `solicitudes_demo` no caen en ninguna:
-- no tienen `tenant_id` y se crean antes de los privilegios por defecto. Resultado
-- comprobado contra Neon: `motiapp_app` no podía ni leerlas, así que el
-- formulario de demo, la tasa por defecto del negocio y todo `/admin` fallaban
-- con "permission denied".
--
-- ## Por qué `update` completo en `tenants` más un trigger
--
-- 0000 limitaba el `update` del dueño por columnas, para que no pudiera cambiarse
-- el plan ni suspenderse. Pero los permisos por columna son por ROL, no por
-- contexto: el super admin entra con el mismo `motiapp_app`, así que tampoco
-- podía cambiar el plan. La regla correcta depende del contexto de la petición,
-- y eso solo lo sabe `app.es_super_admin()`. Un trigger la aplica en la base,
-- donde no se puede olvidar.
-- ==========================================================================


-- ----------------------------------------------------------------------------
-- tenants
-- ----------------------------------------------------------------------------

grant select, insert, update, delete on public.tenants to motiapp_app;

-- Ya existían `tenants_lectura` (select) y `tenants_escritura` (update).
-- Faltaban alta y baja, que son solo del super admin.
drop policy if exists "tenants_insertar" on public.tenants;
create policy "tenants_insertar" on public.tenants
  for insert to motiapp_app
  with check (app.es_super_admin());

drop policy if exists "tenants_borrar" on public.tenants;
create policy "tenants_borrar" on public.tenants
  for delete to motiapp_app
  using (app.es_super_admin());

create or replace function app.proteger_campos_de_plataforma()
returns trigger
language plpgsql
as $$
begin
  if app.es_super_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.creado_en is distinct from old.creado_en
     or new.estado is distinct from old.estado
     or new.plan is distinct from old.plan
     or new.limite_inventario is distinct from old.limite_inventario
     or new.notas_internas is distinct from old.notas_internas
  then
    raise exception 'Solo el super administrador puede cambiar el estado, el plan, el límite de inventario o las notas internas de un negocio.'
      using errcode = '42501';
  end if;

  return new;
end
$$;

comment on function app.proteger_campos_de_plataforma() is
  'Impide que un dueño cambie los campos de plataforma de su negocio (estado, plan, límite, notas internas).';

drop trigger if exists "tenants_proteger_campos" on public.tenants;
create trigger "tenants_proteger_campos"
  before update on public.tenants
  for each row execute function app.proteger_campos_de_plataforma();


-- ----------------------------------------------------------------------------
-- solicitudes_demo
-- ----------------------------------------------------------------------------
--
-- Insertar: cualquiera (la landing es pública). Leer y cambiar el estado: solo
-- el super admin. Las políticas de insertar y leer ya existían en 0000.

grant select, insert, update on public.solicitudes_demo to motiapp_app;

drop policy if exists "solicitudes_demo_actualizar" on public.solicitudes_demo;
create policy "solicitudes_demo_actualizar" on public.solicitudes_demo
  for update to motiapp_app
  using (app.es_super_admin())
  with check (app.es_super_admin());
