-- ==========================================================================
-- 0005 — Consentimiento en las solicitudes de demo (Ley 1581 de 2012)
-- ==========================================================================
--
-- Se aplica DESPUÉS de 0004, con el rol dueño. Es reejecutable.
--
-- La landing pide dos autorizaciones (DEUDAS.md, DN8):
--   - tratamiento de datos personales: obligatoria para enviar la solicitud;
--   - comunicaciones comerciales: opcional.
-- Se guarda cada una y el momento en que se dio, que es la prueba que exige la
-- ley. Las filas anteriores quedan en `false` y sin fecha: no hay constancia de
-- que se hayan autorizado, y no se inventa.
--
-- El CHECK impide guardar una solicitud nueva sin la autorización de datos,
-- aunque alguien salte la validación de la app. `not valid` lo aplica solo a lo
-- que se inserte desde ahora, sin tocar las filas históricas.
--
-- No cambian los permisos: `motiapp_app` ya tiene INSERT sobre la tabla, y el
-- permiso de tabla cubre las columnas nuevas.
-- ==========================================================================

alter table public.solicitudes_demo
  add column if not exists acepta_tratamiento_datos boolean not null default false,
  add column if not exists acepta_comunicaciones boolean not null default false,
  add column if not exists consentimiento_en timestamptz;

alter table public.solicitudes_demo
  drop constraint if exists solicitudes_demo_consentimiento_check;

alter table public.solicitudes_demo
  add constraint solicitudes_demo_consentimiento_check
  check (acepta_tratamiento_datos and consentimiento_en is not null) not valid;
