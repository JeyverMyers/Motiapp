# Estructura de Motiapp

Árbol de carpetas y, más importante, **por qué** cada capa existe. Si algo aquí no
se entiende, el problema es del documento, no tuyo.

---

## 1. Stack real

El stack acordado era Next.js 15. Se cambió a **Next.js 16** por una razón
concreta: `@neondatabase/auth`, el SDK de Neon Auth que elegiste, exige
`next >= 16.0.0` en **todas** sus versiones publicadas. No existe una versión que
funcione con Next 15.

| Pieza | Elegido | Nota |
|---|---|---|
| Framework | Next.js 16.4.2 (App Router) | Turbopack es el motor por defecto en dev y build |
| Lenguaje | TypeScript 5.9 en modo `strict` | Con `noUncheckedIndexedAccess` |
| Estilos | Tailwind CSS 4.1 | Configuración CSS-first, sin `tailwind.config.js` |
| Componentes | shadcn/ui (estilo `new-york`) | Copiados a mano en `src/components/ui`, sin `radix-ui` |
| Base de datos | PostgreSQL en Neon | Con RLS, no con filtros en el código |
| Driver | `pg` (node-postgres) contra el pooler | Ver §4 |
| ORM | Drizzle ORM 0.45 + Drizzle Kit | |
| Auth | Neon Auth (Managed Better Auth) | Los usuarios viven en tu Postgres |
| Archivos | Ninguno | La app no guarda archivos. Contratos y recibos se generan en el navegador con `jspdf` |
| Gráficas | Recharts 3 | |
| Tablas | HTML propio + TanStack Table disponible | Ver §6 |
| Formularios | React Hook Form disponible + Server Actions | Ver §6 |
| Estado de servidor | TanStack Query disponible | Ver §6 |
| Correos | Resend | Pendiente de conectar |
| Deploy | Vercel | |

---

## 2. Árbol de carpetas

```
motiapp/
├── drizzle/
│   ├── 0000_inicial.sql            ← ÚNICO archivo a aplicar en Neon
│   └── .generado/                  ← DDL crudo y snapshot (no se versiona)
│
├── scripts/
│   ├── generar-migracion.mjs       ← pnpm db:generar
│   └── verificar-base.mjs          ← pnpm db:verificar
│
├── src/
│   ├── proxy.ts                    ← interceptor de peticiones (Next 16)
│   │
│   ├── app/                        ← solo rutas, nada de lógica de negocio
│   │   ├── layout.tsx              ← <html>, fuente, tema
│   │   ├── globals.css             ← tokens de Tailwind y del negocio
│   │   ├── page.tsx                ← ① LANDING PÚBLICA
│   │   │
│   │   ├── (auth)/                 ← grupo de rutas: no agrega segmento a la URL
│   │   │   ├── layout.tsx
│   │   │   ├── ingresar/page.tsx
│   │   │   └── registrarse/page.tsx
│   │   │
│   │   ├── app/                    ← ② PANEL DUEÑO (protegido)
│   │   │   ├── layout.tsx          ← guard: exige rol owner + negocio
│   │   │   ├── page.tsx            ← panel con gráficas 7/30/90 días
│   │   │   ├── inventario/
│   │   │   │   ├── page.tsx        ← buscador con filtros
│   │   │   │   ├── nueva/page.tsx  ← registrar compra
│   │   │   │   └── [motoId]/page.tsx ← ficha + registrar venta
│   │   │   ├── empenos/
│   │   │   │   ├── page.tsx        ← listado + alertas de vencimiento
│   │   │   │   └── nuevo/page.tsx  ← registrar empeño
│   │   │   └── clientes/page.tsx   ← pendiente (placeholder honesto)
│   │   │
│   │   ├── admin/                  ← ③ PANEL SUPER ADMIN (protegido)
│   │   │   ├── layout.tsx          ← guard: exige rol super_admin
│   │   │   ├── page.tsx            ← métricas globales + negocios
│   │   │   ├── negocios/[tenantId]/page.tsx
│   │   │   └── solicitudes/page.tsx
│   │   │
│   │   └── api/auth/[...path]/route.ts ← puente hacia Neon Auth
│   │
│   ├── domain/                     ← reglas del negocio, SIN base de datos
│   │   ├── enums.ts                ← estados, planes, categorías
│   │   ├── comun.ts                ← primitivas Zod compartidas
│   │   ├── cliente.ts
│   │   ├── moto.ts                 ← + ganancia, margen, días en inventario
│   │   ├── empeno.ts               ← + interés causado, saldo, reparto de abonos
│   │   ├── solicitud-demo.ts
│   │   └── __pruebas__/            ← 90 pruebas, sin base de datos
│   │       ├── comun.prueba.ts
│   │       ├── moto.prueba.ts
│   │       └── empeno.prueba.ts
│   │
│   ├── pruebas/                    ← utilidades para las pruebas de integración
│   │   ├── cargar-entorno.ts       ← carga .env.local
│   │   └── base.ts                 ← sembrar y limpiar negocios de prueba
│   │
│   ├── db/                         ← cómo se habla con Postgres
│   │   ├── schema.ts               ← tablas y restricciones (fuente de verdad)
│   │   ├── entorno.ts              ← validación de variables de entorno
│   │   ├── index.ts                ← pool, guarda de rol, conTenant/conAdmin
│   │   ├── __pruebas__/
│   │   │   └── aislamiento.integracion.ts ← 21 pruebas de aislamiento RLS
│   │   └── sql/
│   │       ├── aprovisionamiento.sql ← roles y permisos (una sola vez)
│   │       └── rls.sql               ← aislamiento entre negocios
│   │
│   ├── server/                     ← todo lo que solo corre en el servidor
│   │   ├── auth/
│   │   │   ├── servidor.ts         ← instancia de Neon Auth
│   │   │   └── sesion.ts           ← sesión → tenant + rol
│   │   ├── acciones/               ← Server Actions (mutaciones)
│   │   │   ├── auth.ts
│   │   │   ├── motos.ts
│   │   │   ├── empenos.ts
│   │   │   └── solicitud-demo.ts
│   │   └── repositorios/           ← consultas (lecturas y escrituras)
│   │       ├── motos.ts
│   │       ├── empenos.ts
│   │       ├── clientes.ts
│   │       ├── tenants.ts
│   │       ├── panel.ts
│   │       └── solicitudes.ts
│   │
│   ├── components/
│   │   ├── ui/                     ← primitivas sin conocimiento del negocio
│   │   │   ├── boton.tsx  tarjeta.tsx  formulario.tsx
│   │   │   ├── etiqueta-estado.tsx  tabla.tsx
│   │   ├── publico/formulario-demo.tsx
│   │   ├── auth/formulario-ingreso.tsx  formulario-registro.tsx
│   │   └── app/                    ← componentes del panel
│   │       ├── barra-navegacion.tsx  tarjeta-indicador.tsx
│   │       ├── grafica-ventas.tsx      ← Client Component (Recharts)
│   │       ├── formulario-nueva-moto.tsx
│   │       ├── formulario-venta.tsx
│   │       └── formulario-nuevo-empeno.tsx
│   │
│   └── lib/
│       ├── constantes.ts           ← nombre del producto, moneda, zona horaria
│       ├── formato.ts              ← moneda, fechas, placas, teléfonos
│       ├── rutas.ts                ← ayuda para URLs con typedRoutes
│       └── utils.ts                ← cn()
│
├── .env.example
├── components.json                 ← configuración de shadcn/ui
├── next.config.ts
├── pnpm-workspace.yaml
├── tsconfig.json
└── vitest.config.ts
```

---

## 3. La regla de oro: cómo se aísla un negocio

Esta es la decisión más importante del proyecto. Léela completa antes de escribir
una consulta.

### El problema

Cada negocio debe ver **solo** sus datos. La forma ingenua es acordarse de poner
`where tenant_id = ...` en cada consulta. El día que alguien lo olvide —en una
consulta nueva, en un `join`, en un reporte— hay una fuga de datos entre negocios,
y nadie se entera hasta que un dueño ve el inventario de otro.

### La solución: dos capas, no una

**Capa 1 — RLS en la base de datos (la red de seguridad).**

Todas las tablas con `tenant_id` tienen Row Level Security activado, y la política
compara contra una variable de sesión:

```sql
create policy "aislamiento_por_tenant" on public.motos
  for all to motiapp_app
  using (app.puede_ver_tenant(tenant_id))
  with check (app.puede_ver_tenant(tenant_id));
```

`app.puede_ver_tenant()` es la regla, en un solo lugar:

```sql
select app.es_super_admin() or p_tenant_id = app.tenant_actual()
```

Que esté como `using` **y** como `with check` importa: sin el `with check`, un
dueño podría *insertar* filas a nombre de otro negocio aunque no pudiera verlas.

**Capa 2 — el contexto por petición.**

Cada petición abre una transacción y fija el negocio **antes** de consultar:

```ts
export async function conTenant<T>(tenantId, consulta) {
  return db().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
    return consulta(tx);
  });
}
```

El tercer argumento `true` de `set_config` es `is_local`: el valor vive solo
dentro de esa transacción. Al hacer commit o rollback, Postgres lo descarta. Por
eso una conexión reutilizada del pool **nunca** arrastra el negocio de la
petición anterior. Ese es el único motivo por el que el contexto se fija dentro de
una transacción y no con un `SET` suelto.

### Los tres detalles que hacen que esto funcione

**a) La aplicación NO es dueña de las tablas.**

En Postgres, el dueño de una tabla ignora sus propias políticas RLS. Por eso hay
dos roles:

- `motiapp_app` — el rol de la aplicación. No es dueño de nada, así que RLS le
  aplica de verdad.
- `neondb_owner` (o como se llame tu dueño) — solo para migraciones.

Esto se ve en las dos cadenas de conexión de `.env.example`. Si alguien las
intercambia, el aislamiento se vuelve decorativo y **nada falla visiblemente**.
Está anotado como riesgo en `DEUDAS.md`.

**b) `missing_ok = true` convierte un olvido en cero filas, no en una fuga.**

```sql
current_setting('app.tenant_id', true)   -- devuelve NULL en vez de lanzar error
```

Si nadie fijó el contexto, la comparación es `NULL`, la política no deja pasar
ninguna fila y la consulta devuelve cero resultados. Falla cerrado.

**c) El `tenant_id` sale de la sesión, nunca del cliente.**

```ts
const sesion = await requerirDueno();  // lee la sesión firmada de Neon Auth
// sesion.tenantId → viene de public.usuarios, no de la URL ni de un formulario
```

**d) La aplicación se niega a arrancar con el rol equivocado.**

Como el fallo de (a) es silencioso, no basta con documentarlo. Antes de la primera
transacción, `asegurarRolDeAplicacion()` comprueba con `pg_has_role` que la
conexión no sea superusuario, no tenga `BYPASSRLS` y no sea miembro del rol dueño.
Si algo de eso falla, lanza un error explicando qué pasó y cómo arreglarlo.

Se comprueba una sola vez por proceso (el resultado se cachea), así que no cuesta
nada después de la primera petición, y no molesta durante `next build`.

### El problema del huevo y la gallina

Para consultar `usuarios` hace falta el contexto de negocio, pero el contexto de
negocio sale de `usuarios`. Y la política de `usuarios` no puede consultar
`usuarios` (Postgres rechaza la recursión).

La salida es `app.contexto_usuario(auth_user_id)`, una función `SECURITY DEFINER`
que corre con permisos del dueño y por lo tanto no está sujeta a RLS. No rompe el
aislamiento porque recibe el id del usuario autenticado —que sale de la sesión
firmada— y devuelve **exactamente una fila**: el negocio de ese usuario. No acepta
filtros, no devuelve datos de negocio y no permite enumerar. Tiene
`search_path` fijo para que nadie secuestre la resolución de nombres.

### Los tres contextos disponibles

| Función | Cuándo usarla |
|---|---|
| `conTenant(tenantId, fn)` | **Todo** el panel del dueño. Es el caso normal. |
| `conAdmin(fn)` | Solo super administración: cruza negocios a propósito. |
| `sinContexto(fn)` | Solo tablas sin `tenant_id`: `tenants` y `solicitudes_demo`. |

Si usas `sinContexto` contra una tabla de negocio, obtendrás cero filas. No es un
bug: es la política haciendo su trabajo.

---

## 4. Por qué `pg` y no el driver HTTP de Neon

`@neondatabase/serverless` ofrece `neon()`, un driver HTTP muy rápido. **No lo
usamos** porque resuelve cada consulta en un request independiente y solo soporta
transacciones no interactivas: no se puede abrir una transacción, hacer
`SET LOCAL` y después consultar desde el código de la aplicación. Y RLS depende de
`SET LOCAL`.

Solución: el pool de `node-postgres` contra el host con `-pooler` de Neon. Sigue
siendo serverless y escala igual, pero permite transacciones interactivas. El
paquete `@neondatabase/serverless` queda instalado para cuando haga falta el
driver HTTP en una función de borde.

---

## 5. Dominio en español, técnica en inglés

Como pediste:

| Español (negocio) | Inglés (técnico) |
|---|---|
| `moto`, `empeno`, `cliente`, `abono`, `gasto` | `src/`, `components/`, `lib/` |
| `placa`, `cedula`, `capital`, `tasaMensual` | `useState`, `redirect`, `revalidatePath` |
| `crearMoto`, `registrarVenta`, `buscarInventario` | `safeParse`, `Promise`, `Response` |
| `EstadoMoto`, `saldoEmpeno`, `interesCausado` | `db`, `pool`, `transaction` |

Los nombres de tabla y columna en la base también van en español, porque el
esquema es parte del lenguaje del negocio y lo va a leer el dueño en un reporte.

---

## 6. Dos módulos, dos mundos

Regla dura: **compra/venta y empeño no se mezclan.**

| | Compra/Venta | Empeño |
|---|---|---|
| Tabla del bien | `motos` | `vehiculos_empeno` + `telefonos_empeno` |
| Por qué | Es del negocio cuando se compra | Es del cliente hasta que se pierde |
| Pantalla | `/app/inventario` | `/app/empenos` |
| Reporte | Ganancia = venta − compra − gastos | Interés causado por día |
| Gastos | `modulo = 'compra_venta'` | `modulo = 'empeno'` |

Un vehículo empeñado **no** entra en `motos`. Si entrara, contaminaría el
inventario y la ganancia: un bien empeñado todavía no es del negocio. Por eso
`vehiculos_empeno` es una tabla aparte aunque comparta casi todos los campos con
`motos`. La duplicación es deliberada y vale la pena.

Los teléfonos van en su propia tabla porque un teléfono no tiene placa, y forzar
ambos en una tabla genérica llenaría la mitad de las columnas de `NULL` y haría
falta un `CHECK` para que no se mezclaran.

---

## 7. Los números no se guardan: se calculan

No hay columnas `ganancia` ni `saldo`. Se derivan:

- **Ganancia de una moto** — `gananciaDeMoto()` en `src/domain/moto.ts`:
  `precioVenta − precioCompra − gastosAsociados`.
- **Interés de un empeño** — `interesCausado()` en `src/domain/empeno.ts`:
  `capital × (tasaMensual / 100) × (días / 30)`. Interés simple, sin
  capitalización, redondeado al peso.
- **Saldo** — `saldoEmpeno()`: capital vigente + interés causado − abonos.
- **Reparto de un abono** — `repartirAbono()`: paga primero el interés y el
  sobrante baja capital, que es el orden que protege al negocio.

**Por qué así:** guardar un total derivado garantiza que algún día no cuadre.
Corregir un precio de compra corrige la ganancia; corregir un abono corrige el
saldo. No hay que "recalcular" nada a mano.

Todo esto son funciones puras en `src/domain/`, sin base de datos, así que se
pueden probar sin levantar nada.

---

## 8. Por qué casi todo es Server Component

Pediste Server Components por defecto. La consecuencia práctica: los filtros del
inventario viven en la **URL**, no en estado de React.

- El buscador es un `<form>` que hace `GET`. Sin JavaScript funciona.
- El dueño puede compartir el enlace o volver atrás sin perder la búsqueda.
- La página consulta una sola vez, en el servidor.

Los únicos Client Components son los que de verdad lo necesitan: los formularios
con `useActionState` (para mostrar errores y estado de envío) y la gráfica de
Recharts (mide su contenedor en el navegador).

### Sobre TanStack Query, TanStack Table y React Hook Form

Están instalados porque los pediste, pero **el scaffold no los usa todavía**, y
eso es deliberado:

- **TanStack Query** resuelve caché de datos en el cliente. Con Server Components
  la caché ya la maneja el servidor. Se usará cuando haya pantallas que refresquen
  datos sin recargar (por ejemplo, un tablero de empeños en vivo).
- **TanStack Table** aporta ordenamiento, paginación y selección de columnas. Las
  tablas actuales son listas simples; meterlo ahora sería sobre-ingeniería.
- **React Hook Form** brilla en formularios con validación en vivo campo por
  campo. Los formularios actuales validan con Zod en el servidor y muestran los
  errores por campo, que es suficiente y más simple. El schema Zod ya está listo
  para cuando se cambie a RHF + `zodResolver`.

Está anotado en `DEUDAS.md` como decisión a revisar, no como olvido.

---

## 9. Notas de Next.js 16 que afectan al código

Next 16 tiene cambios que rompen código de Next 15. Los que importan aquí:

| Tema | Qué hacer |
|---|---|
| `middleware.ts` | Está deprecado. Se usa **`src/proxy.ts`** con la función exportada llamada `proxy`. Renombrar el archivo sin renombrar la función rompe el build. |
| `params` / `searchParams` | Son `Promise` y **hay que esperarlos**. El acceso síncrono de Next 15 se eliminó. |
| `PageProps` / `LayoutProps` | Son tipos globales, pero solo existen **después** de que corra `next dev`, `next build` o `next typegen`. Para no depender de ese orden, las páginas tipan sus props explícitamente. |
| `typedRoutes` | Está activado. Valida los `href` literales contra las rutas reales (ya encontró un enlace roto). Las URLs armadas en tiempo de ejecución pasan por `comoRuta()` en `src/lib/rutas.ts`. |
| `revalidateTag(tag)` | Ahora exige un segundo argumento de perfil: `revalidateTag(tag, "max")`. En este scaffold se usa `revalidatePath`. |
| `next lint` | Se eliminó. El lint se corre con `pnpm lint` (ESLint 9 con configuración plana). |
| `cacheComponents` | **Desactivado a propósito.** Ver DEUDAS.md: activarlo obliga a envolver `cookies()`/`headers()` en `<Suspense>` y convierte en error de build cosas como `new Date()`. No vale la pena en este momento. |
| Turbopack | Es el motor por defecto en `dev` y `build`. No agregar `--turbopack`. |

---

## 10. Cómo arrancar el proyecto

```bash
pnpm install

# 1. Crear el proyecto en Neon y habilitar Auth:
#    consola de Neon → Project → Branch → Auth → Enable Auth
#    y copiar la URL de Settings → Better Auth → Project Info

cp .env.example .env.local
# completar DATABASE_URL, DATABASE_URL_MIGRACIONES,
# NEON_AUTH_BASE_URL y NEON_AUTH_COOKIE_SECRET
# (openssl rand -base64 32)

# 2. Aplicar el esquema, en orden, en el SQL Editor de Neon, como el rol dueño:
#    drizzle/0000_inicial.sql
#    drizzle/0001_permisos_tablas_globales.sql
#    drizzle/0002_motos_baja_y_borrado.sql

# 3. Fijar la contraseña del rol de aplicación:
#    alter role motiapp_app with password '<contraseña>';

# 4. Comprobar que el aislamiento quedó bien:
pnpm db:verificar

pnpm dev
```

### Crear el primer negocio y el primer usuario

Todavía no hay pantalla para esto (ver DEUDAS.md). Mientras tanto:

1. Regístrate en `/registrarse`. Eso crea el usuario en Neon Auth.
2. Copia su `id` desde la tabla `neon_auth."user"`.
3. Inserta el negocio y el perfil en el SQL Editor:

```sql
-- El super admin no pertenece a ningún negocio, por eso tenant_id es null.
insert into usuarios (auth_user_id, tenant_id, email, nombre, rol)
values ('<id de neon_auth.user>', null, 'tu@correo.co', 'Tu Nombre', 'super_admin');
```

Después, desde `/admin`, ya puedes crear negocios con sus dueños.

---

## 11. Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm typecheck` | TypeScript sin emitir |
| `pnpm lint` | ESLint |
| `pnpm test` | Solo pruebas unitarias (`*.prueba.ts`), sin base de datos |
| `pnpm test:integracion` | Pruebas de aislamiento RLS contra Neon; lee `.env.local` sola (`vitest.integracion.config.ts`) |
| `pnpm test:watch` | Pruebas en modo vigilancia |
| `pnpm db:generar` | Regenera `drizzle/0000_inicial.sql` desde `src/db/schema.ts` |
| `pnpm db:verificar` | Comprueba roles, RLS y políticas en la base |
| `pnpm db:studio` | Interfaz de Drizzle para explorar la base |

---

## 12. Pruebas

Dos clases, distinguidas por el nombre del archivo:

| Sufijo | Qué prueba | Necesita base de datos |
|---|---|---|
| `*.prueba.ts` | Funciones puras del dominio y validaciones Zod | No |
| `*.integracion.ts` | Aislamiento entre negocios contra Postgres | Sí |

**Las pruebas del dominio son las importantes.** Ahí está el dinero del negocio:
`interesCausado`, `saldoEmpeno`, `repartirAbono` y `gananciaDeMoto`. Son funciones
puras, así que corren en milisegundos y no necesitan nada levantado.

Ya rindieron: encontraron tres bugs reales que estaban en el código —`textoRequerido`
rechazaba todo si se omitía `max`, `anoSchema` no aceptaba el año como texto (así
que **el formulario de compra fallaba siempre**), y `diasParaVencer` dependía de la
zona horaria del servidor. El detalle está en `DEUDAS.md`, sección C1.

**Las pruebas de integración tienen su propio comando** y su propia
configuración (`vitest.integracion.config.ts`), así que `pnpm test` nunca necesita
credenciales. `pnpm test:integracion` lee `.env.local` sin fijar nada en la
terminal y, si falta `DATABASE_URL` o `DATABASE_URL_MIGRACIONES`, falla diciendo
cuál en vez de saltarse las pruebas:

```bash
pnpm test:integracion
```

El formato exacto de `.env.local` y los errores típicos al pegar desde Neon están
en `DEUDAS.md`, «Cómo correr las pruebas de integración».

**Advertencia:** siembran y borran negocios. Úsalas contra una rama de Neon de
desarrollo, nunca contra producción. Cada negocio sembrado lleva un sufijo
aleatorio y se limpia con `on delete cascade` desde `tenants`.

Qué demuestran exactamente está en `DEUDAS.md`, sección C2.
