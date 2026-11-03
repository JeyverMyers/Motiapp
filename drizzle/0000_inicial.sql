-- ==========================================================================
-- Motiapp — esquema inicial
-- Origen: src/db/schema.ts
-- Generado automáticamente. No editar a mano: se sobrescribe.
-- ==========================================================================

-- Este archivo se aplica con el rol dueño, no con el rol de la aplicación.

CREATE TABLE "abonos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empeno_id" uuid NOT NULL,
	"monto" bigint NOT NULL,
	"a_interes" bigint DEFAULT 0 NOT NULL,
	"a_capital" bigint DEFAULT 0 NOT NULL,
	"concepto" text DEFAULT 'interes' NOT NULL,
	"metodo_pago" text DEFAULT 'efectivo' NOT NULL,
	"fecha" date NOT NULL,
	"nota" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "abonos_monto_check" CHECK ("abonos"."monto" > 0),
	CONSTRAINT "abonos_reparto_check" CHECK ("abonos"."a_interes" >= 0 and "abonos"."a_capital" >= 0),
	CONSTRAINT "abonos_concepto_check" CHECK ("abonos"."concepto" in ('interes', 'capital', 'ambos')),
	CONSTRAINT "abonos_metodo_pago_check" CHECK ("abonos"."metodo_pago" in ('efectivo', 'transferencia', 'otro'))
);

CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tipo_documento" text DEFAULT 'CC' NOT NULL,
	"numero_documento" text NOT NULL,
	"nombres" text NOT NULL,
	"apellidos" text,
	"telefono" text NOT NULL,
	"telefono_alterno" text,
	"email" text,
	"direccion" text,
	"ciudad" text,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clientes_tenant_documento_unique" UNIQUE("tenant_id","numero_documento"),
	CONSTRAINT "clientes_tipo_documento_check" CHECK ("clientes"."tipo_documento" in ('CC', 'CE', 'NIT', 'PP', 'TI'))
);

CREATE TABLE "empenos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"numero" text NOT NULL,
	"cliente_id" uuid NOT NULL,
	"cliente_nombre" text NOT NULL,
	"cliente_cedula" text NOT NULL,
	"cliente_telefono" text,
	"tipo_bien" text NOT NULL,
	"vehiculo_id" uuid,
	"telefono_id" uuid,
	"capital" bigint NOT NULL,
	"tasa_mensual" bigint NOT NULL,
	"frecuencia_pago" text DEFAULT 'mensual' NOT NULL,
	"fecha_inicio" date NOT NULL,
	"fecha_vencimiento" date NOT NULL,
	"fecha_limite_gracia" date NOT NULL,
	"estado" text DEFAULT 'activo' NOT NULL,
	"garante_nombre" text,
	"garante_cedula" text,
	"garante_telefono" text,
	"observaciones" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "empenos_tenant_numero_unique" UNIQUE("tenant_id","numero"),
	CONSTRAINT "empenos_tipo_bien_check" CHECK ("empenos"."tipo_bien" in ('moto', 'carro', 'telefono')),
	CONSTRAINT "empenos_estado_check" CHECK ("empenos"."estado" in ('activo', 'pagado', 'vencido', 'perdido', 'renovado')),
	CONSTRAINT "empenos_frecuencia_check" CHECK ("empenos"."frecuencia_pago" in ('mensual', 'quincenal', 'semanal', 'diario')),
	CONSTRAINT "empenos_capital_check" CHECK ("empenos"."capital" > 0),
	CONSTRAINT "empenos_tasa_check" CHECK ("empenos"."tasa_mensual" >= 0 and "empenos"."tasa_mensual" <= 100),
	CONSTRAINT "empenos_fechas_check" CHECK ("empenos"."fecha_vencimiento" > "empenos"."fecha_inicio" and "empenos"."fecha_limite_gracia" >= "empenos"."fecha_vencimiento"),
	CONSTRAINT "empenos_bien_coherente_check" CHECK ((
        ("empenos"."tipo_bien" = 'telefono' and "empenos"."telefono_id" is not null and "empenos"."vehiculo_id" is null)
        or ("empenos"."tipo_bien" in ('moto', 'carro') and "empenos"."vehiculo_id" is not null and "empenos"."telefono_id" is null)
      ))
);

CREATE TABLE "gastos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"modulo" text NOT NULL,
	"moto_id" uuid,
	"empeno_id" uuid,
	"monto" bigint NOT NULL,
	"fecha" date NOT NULL,
	"categoria" text NOT NULL,
	"descripcion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gastos_modulo_check" CHECK ("gastos"."modulo" in ('compra_venta', 'empeno')),
	CONSTRAINT "gastos_monto_check" CHECK ("gastos"."monto" > 0),
	CONSTRAINT "gastos_categoria_check" CHECK ("gastos"."categoria" in ('reparacion', 'repuestos', 'tramites', 'transporte', 'publicidad', 'nomina', 'arriendo', 'otro'))
);

CREATE TABLE "motos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"placa" text NOT NULL,
	"marca" text NOT NULL,
	"modelo" text NOT NULL,
	"anio" integer NOT NULL,
	"color" text NOT NULL,
	"cilindraje" integer,
	"numero_motor" text,
	"numero_chasis" text,
	"precio_compra" bigint NOT NULL,
	"fecha_compra" date NOT NULL,
	"proveedor_nombre" text,
	"proveedor_cedula" text,
	"proveedor_telefono" text,
	"precio_venta" bigint,
	"fecha_venta" date,
	"comprador_nombre" text,
	"comprador_cedula" text,
	"comprador_telefono" text,
	"metodo_pago_venta" text,
	"observaciones_venta" text,
	"estado" text DEFAULT 'disponible' NOT NULL,
	"descripcion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "motos_tenant_placa_unique" UNIQUE("tenant_id","placa"),
	CONSTRAINT "motos_estado_check" CHECK ("motos"."estado" in ('disponible', 'reservada', 'en_reparacion', 'vendida', 'devuelta')),
	CONSTRAINT "motos_metodo_pago_check" CHECK ("motos"."metodo_pago_venta" is null or "motos"."metodo_pago_venta" in ('efectivo', 'transferencia', 'otro')),
	CONSTRAINT "motos_precio_compra_check" CHECK ("motos"."precio_compra" > 0),
	CONSTRAINT "motos_precio_venta_check" CHECK ("motos"."precio_venta" is null or "motos"."precio_venta" > 0),
	CONSTRAINT "motos_anio_check" CHECK ("motos"."anio" between 1950 and 2100),
	CONSTRAINT "motos_venta_completa_check" CHECK ("motos"."estado" <> 'vendida' or ("motos"."precio_venta" is not null and "motos"."fecha_venta" is not null))
);

CREATE TABLE "solicitudes_demo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"negocio" text NOT NULL,
	"telefono" text NOT NULL,
	"email" text,
	"ciudad" text,
	"mensaje" text,
	"estado" text DEFAULT 'nueva' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "solicitudes_demo_estado_check" CHECK ("solicitudes_demo"."estado" in ('nueva', 'contactada', 'convertida', 'descartada'))
);

CREATE TABLE "telefonos_empeno" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"marca" text NOT NULL,
	"modelo" text NOT NULL,
	"imei" text,
	"capacidad" text,
	"color" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telefonos_empeno_tenant_imei_unique" UNIQUE("tenant_id","imei")
);

CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"nit" text,
	"telefono" text,
	"email_contacto" text,
	"ciudad" text,
	"direccion" text,
	"estado" text DEFAULT 'prueba' NOT NULL,
	"plan" text DEFAULT 'basico' NOT NULL,
	"limite_inventario" integer,
	"tasa_mensual_defecto" integer DEFAULT 10 NOT NULL,
	"notas_internas" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_estado_check" CHECK ("tenants"."estado" in ('activo', 'suspendido', 'prueba')),
	CONSTRAINT "tenants_plan_check" CHECK ("tenants"."plan" in ('basico', 'pro', 'ilimitado')),
	CONSTRAINT "tenants_tasa_check" CHECK ("tenants"."tasa_mensual_defecto" >= 0 and "tenants"."tasa_mensual_defecto" <= 100)
);

CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"tenant_id" uuid,
	"email" text NOT NULL,
	"nombre" text NOT NULL,
	"telefono" text,
	"rol" text DEFAULT 'owner' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"ultimo_acceso" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "usuarios_rol_check" CHECK ("usuarios"."rol" in ('owner', 'super_admin')),
	CONSTRAINT "usuarios_tenant_por_rol_check" CHECK (("usuarios"."rol" = 'owner' and "usuarios"."tenant_id" is not null) or ("usuarios"."rol" = 'super_admin'))
);

CREATE TABLE "vehiculos_empeno" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"placa" text NOT NULL,
	"marca" text NOT NULL,
	"modelo" text NOT NULL,
	"anio" integer NOT NULL,
	"color" text NOT NULL,
	"numero_motor" text,
	"numero_chasis" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehiculos_empeno_tenant_placa_unique" UNIQUE("tenant_id","placa"),
	CONSTRAINT "vehiculos_empeno_tipo_check" CHECK ("vehiculos_empeno"."tipo" in ('moto', 'carro')),
	CONSTRAINT "vehiculos_empeno_anio_check" CHECK ("vehiculos_empeno"."anio" between 1950 and 2100)
);

ALTER TABLE "abonos" ADD CONSTRAINT "abonos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "abonos" ADD CONSTRAINT "abonos_empeno_id_empenos_id_fk" FOREIGN KEY ("empeno_id") REFERENCES "public"."empenos"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "clientes" ADD CONSTRAINT "clientes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "empenos" ADD CONSTRAINT "empenos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "empenos" ADD CONSTRAINT "empenos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "empenos" ADD CONSTRAINT "empenos_vehiculo_id_vehiculos_empeno_id_fk" FOREIGN KEY ("vehiculo_id") REFERENCES "public"."vehiculos_empeno"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "empenos" ADD CONSTRAINT "empenos_telefono_id_telefonos_empeno_id_fk" FOREIGN KEY ("telefono_id") REFERENCES "public"."telefonos_empeno"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "gastos" ADD CONSTRAINT "gastos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "gastos" ADD CONSTRAINT "gastos_moto_id_motos_id_fk" FOREIGN KEY ("moto_id") REFERENCES "public"."motos"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "gastos" ADD CONSTRAINT "gastos_empeno_id_empenos_id_fk" FOREIGN KEY ("empeno_id") REFERENCES "public"."empenos"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "motos" ADD CONSTRAINT "motos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "telefonos_empeno" ADD CONSTRAINT "telefonos_empeno_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "vehiculos_empeno" ADD CONSTRAINT "vehiculos_empeno_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "abonos_empeno_idx" ON "abonos" USING btree ("empeno_id","fecha");

CREATE INDEX "abonos_tenant_idx" ON "abonos" USING btree ("tenant_id");

CREATE INDEX "clientes_tenant_idx" ON "clientes" USING btree ("tenant_id");

CREATE INDEX "clientes_nombres_idx" ON "clientes" USING btree ("tenant_id","nombres");

CREATE INDEX "empenos_tenant_estado_idx" ON "empenos" USING btree ("tenant_id","estado");

CREATE INDEX "empenos_tenant_vencimiento_idx" ON "empenos" USING btree ("tenant_id","fecha_vencimiento");

CREATE INDEX "empenos_cliente_idx" ON "empenos" USING btree ("cliente_id");

CREATE INDEX "gastos_tenant_fecha_idx" ON "gastos" USING btree ("tenant_id","fecha");

CREATE INDEX "gastos_moto_idx" ON "gastos" USING btree ("moto_id");

CREATE INDEX "gastos_empeno_idx" ON "gastos" USING btree ("empeno_id");

CREATE INDEX "motos_tenant_estado_idx" ON "motos" USING btree ("tenant_id","estado");

CREATE INDEX "motos_tenant_creado_idx" ON "motos" USING btree ("tenant_id","creado_en");

CREATE INDEX "motos_tenant_marca_idx" ON "motos" USING btree ("tenant_id","marca");

CREATE INDEX "motos_proveedor_cedula_idx" ON "motos" USING btree ("tenant_id","proveedor_cedula");

CREATE INDEX "motos_comprador_cedula_idx" ON "motos" USING btree ("tenant_id","comprador_cedula");

CREATE INDEX "solicitudes_demo_creado_idx" ON "solicitudes_demo" USING btree ("creado_en");

CREATE INDEX "telefonos_empeno_tenant_idx" ON "telefonos_empeno" USING btree ("tenant_id");

CREATE INDEX "usuarios_tenant_idx" ON "usuarios" USING btree ("tenant_id");

CREATE INDEX "usuarios_email_idx" ON "usuarios" USING btree ("email");

CREATE INDEX "vehiculos_empeno_tenant_idx" ON "vehiculos_empeno" USING btree ("tenant_id");

CREATE INDEX "vehiculos_empeno_placa_idx" ON "vehiculos_empeno" USING btree ("tenant_id","placa");

-- ==========================================================================
-- Aprovisionamiento de roles
-- Origen: src/db/sql/aprovisionamiento.sql
-- Generado automáticamente. No editar a mano: se sobrescribe.
-- ==========================================================================

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


-- ==========================================================================
-- Aislamiento entre negocios (RLS)
-- Origen: src/db/sql/rls.sql
-- Generado automáticamente. No editar a mano: se sobrescribe.
-- ==========================================================================

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

