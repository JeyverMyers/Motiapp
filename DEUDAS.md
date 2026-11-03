# Deudas técnicas de Motiapp

Backlog honesto. Cada punto dice **qué falta**, **por qué importa** y **qué pasa
si no se hace**. Lo que ya está hecho no se repite aquí.

**Estado (3 nov 2026):** `pnpm build`, `pnpm typecheck`, `pnpm lint` y
`pnpm test` (200 unitarias) en verde. `pnpm test:integracion`: **60 de 60 en
verde** contra la rama `desarrollo` de Neon. Migraciones 0000–0007 aplicadas
**solo en desarrollo**; `production` sigue **vacía**. Ver B1.

Lo que sigue es lo que falta.

---

## ✅ Cerrado: preparación para producción (3 nov 2026)

Pasos de lanzamiento en **`LANZAMIENTO.md`**. Lo que cambió en el código:

- **Registro público cerrado de verdad.** `/registrarse` seguía abierto: alguien
  podía crear una cuenta con el correo de un cliente antes que él y quedarse con
  su negocio al asignarlo en `/admin`. Ahora `/registrarse` redirige a `/login`,
  `/api/auth/sign-up` responde 403 y la acción `registrarse` se eliminó.
- **«Dar acceso» crea la cuenta** del dueño desde el servidor (contraseña
  temporal que se muestra una vez). Si el correo ya tenía cuenta, solo se asigna
  marcando una casilla de confirmación, que muestra cuándo se creó.
- **Bug: «Asignar dueño» fallaba** con «permission denied for schema
  neon_auth» (el permiso de `0000` no se aplicó porque Neon Auth se activó
  después). Migración **0007**: función `app.cuenta_auth_por_correo` (security
  definer, solo para super admin) y el rol de la app pierde todo acceso directo a
  `neon_auth`, donde están los hashes de contraseña. Con pruebas.
- **`scripts/migrar.mjs`** (`pnpm db:migrar` / `pnpm prod:migrar`): aplica las
  migraciones pendientes, una transacción por archivo, con registro en
  `migraciones_aplicadas`, y fija la contraseña de `motiapp_app`. Desarrollo ya
  quedó registrado hasta 0007.
- **`scripts/alta-usuario.mjs`** (`pnpm prod:alta-usuario`): crea cuentas (y el
  super admin) en producción sin pasar por el SQL Editor.
- **Cabeceras de seguridad** (HSTS, sin iframes, nosniff, referrer, permisos),
  sin `x-powered-by`. **404 y páginas de error** en español. **`robots.txt` y
  `sitemap.xml`** (el panel y el admin no se indexan). **Campo trampa
  anti-robots** en el formulario de solicitud (cubre parte de A5).
- `DATABASE_URL_MIGRACIONES` ya **no es obligatoria en ejecución**: en Vercel no
  se configura (es el rol dueño, que se salta RLS). Cierra parte de H5 y A4.
- `.gitignore` ignora todos los `.env*` salvo la plantilla (antes un
  `.env.produccion` se habría subido) y `_pendiente/`.

**Sin verificar todavía:** el correo de «¿Olvidaste tu contraseña?» en
producción (depende de Neon Auth); límite de intentos por IP en el formulario
público (solo hay campo trampa).

## ✅ Cerrado: ronda final (21 oct 2026) — super admin, Bloque 5.5 y Bloque 9

### Super administración (el «Bloque 6» del brief; Bloque 8 del backlog)

- **Suspender / Reactivar** en `/admin/negocios/[id]`, en el encabezado, con
  confirmación. Solo cambia `tenants.estado` (`activo` ↔ `suspendido`): **no se
  borra nada**. Queda en la auditoría.
- **La suspensión corta la entrada a `/app`:** `app.contexto_usuario` devuelve
  el estado del negocio; el login cierra la sesión con «Tu negocio está
  suspendido…» y `sesionDeDueno` / `requerirDueno` rechazan a un dueño de un
  negocio suspendido aunque ya tuviera sesión. Probado contra la base
  (`admin.integracion.ts`): suspender corta, reactivar devuelve la entrada, los
  datos siguen ahí y el dueño no puede reactivarse ni cambiarse de plan solo.
- También: alta y edición de negocios, plan y estado, asignar dueño por correo,
  activar/desactivar usuarios, borrar un negocio **vacío**, modo soporte de solo
  lectura con motivo y 2 horas de vigencia, y registro de auditoría
  (`/admin/auditoria`). Cierra **M2**, **M3** y **S1**.
- **Planes (DN1):** Negociante (`basico`) sin empeños; Empresa (`pro`) con
  empeños. Se aplica en el servidor (acciones, `/app/empenos/layout.tsx`), en la
  navegación, el panel y la ficha del cliente.

### Nombres de los PDF — listos

- Recibo de venta: `[PLACA]-recibo.pdf` (p. ej. `ABC12D-recibo.pdf`).
- Contrato de empeño: `[NÚMERO]-contrato.pdf` (p. ej. `EMP-0007-contrato.pdf`).
- `nombreArchivoPdf()` en `src/lib/documento-pdf.ts` pasa a mayúsculas y cambia
  los caracteres que no sirven en un nombre de archivo por `-`. Con pruebas.

### Bloque 5.5 — completo (B5.1 a B5.5)

- **B5.1 Buscador de motos** en «Nueva venta» (`buscador-moto.tsx`): busca por
  placa (con o sin espacio), marca, modelo y año; flechas, Enter y Escape.
  **Sin dependencias nuevas**: el `Command`/`Popover` de shadcn pedía
  `@radix-ui/react-combobox`, que no está instalado (fue lo que rompió el build
  el 20 oct). Mismo `name="motoId"`: la acción no cambió.
- **B5.2 Número automático `EMP-0001`** (migración `0006`): tabla
  `consecutivos_empeno` por negocio, con RLS, que el alta avanza con
  `insert … on conflict do update … returning` **dentro de su transacción**. Dos
  altas simultáneas no repiten número (probado); el `max + 1` del brief sí los
  repetía. El contador arranca en el mayor número existente de cada negocio. El
  formulario muestra el próximo número sin campo editable. Cierra **BD3**.
- **B5.3 Tipo de bien «Otro bien»** (migración `0006`): `tipo_bien` admite
  `otro`; descripción, serie/referencia opcional y valor de tasación van en
  columnas de `empenos`. El CHECK de coherencia exige descripción y valor para
  un «otro», aunque se salte la app (probado).
- **B5.4 Campos condicionales:** vehículo (placa, año, motor, chasis), teléfono
  (IMEI, capacidad) u «otro» (solo «¿Qué es?» y valor de tasación obligatorios).
  Al cambiar de tipo, los campos del anterior se vacían. Los errores de campos
  anidados (`vehiculo.placa`, `otro.descripcion`) ahora se pintan junto a su
  campo: `erroresDeZod` tomaba el primer segmento de la ruta y nunca los mostraba.
- **B5.5 Pulido visual** de `/app` (ver abajo). Las secciones de los formularios
  de empeño van cada una en su tarjeta.
- Los mensajes «X es obligatorio» decían «La marca es obligatorio»; ahora son
  neutros: «Falta la marca».

### Rediseño visual de `/app` (sin cambiar estructura ni lógica)

Tokens nuevos en `globals.css` (lienzo, tres sombras, curvas de easing), utilidad
`superficie` para todas las tarjetas, Inter variable, títulos más grandes con
tracking negativo, botones con `active:scale-[0.97]` y transiciones de 150 ms
solo en las propiedades que cambian, foco visible de 3 px, inputs con hover,
tablas con encabezado tintado, navegación con estado activo y entrada de página
de 260 ms (desactivada con `prefers-reduced-motion`). Verificado en el navegador
a 578 px y 768 px.

**Skills usadas:** `impeccable` (contexto, `polish`, `craft-floor` y su detector,
sin hallazgos) y `emil-design-eng` (botones, easing, duraciones). **No se
invocaron** «Taste skill» ni «UI UX Pro Max»: el pedido era pulir sin cambiar
estructura, y esas dos proponen una dirección de arte propia.

### Bloque 9 — Landing final, completo

- Hero con **un solo** botón «Entrar al panel» (`/login`).
- Header: «Descargar app» (PWA: instalador nativo en Android/Chrome, instrucciones
  en iPhone, y en escritorio el enlace con botón «Copiar enlace») y «Solicitar
  acceso» con scroll suave al formulario.
- `manifest.webmanifest`, íconos generados (`/icon`, `/apple-icon`), `start_url`
  en `/app`.
- `/terminos` y `/privacidad` con el **disclaimer exacto** de DN8, enlazadas desde
  el pie y desde el formulario.
- Formulario: casilla de datos personales **obligatoria** (Zod) y comunicaciones
  comerciales opcional, guardadas con su fecha (migración `0005`, Ley 1581). La
  base rechaza una solicitud nueva sin la autorización (`not valid`: las viejas
  no se tocan). El admin ve en `/admin/solicitudes` quién aceptó comunicaciones.
- Planes: **Negociante** y **Empresa** con la matriz de DN1, «a convenir» (D3).
  Cierra **L1**.

### Pendiente de esta ronda

- **QR en escritorio (DN8):** no se hizo. Generar un QR sin librería es escribir
  un codificador entero; con librería es una dependencia nueva. En escritorio se
  muestra el enlace y «Copiar enlace». Falta decidir si se acepta una librería
  pequeña cargada solo al abrir el diálogo.
- **Cambios apartados:** lo que quedó en `_pendiente/` (intento externo del 20
  oct) ya está rehecho bien; la carpeta se puede borrar.
- **B1 sigue:** aplicar 0000–0006 en `production` antes del primer cliente real.

---

## ✅ Cerrado: rediseño de la landing (estilo «Slush»)

- Landing nueva en `src/components/landing/`, con los tokens del DESIGN.md en
  `globals.css` (`@theme`): seis colores de sticker, papel pastel, bordes negros
  de 1px, píldoras y tarjetas de 20–40px. Sin degradados ni sombras.
- **Animación 1 (moto):** CSS puro, solo `transform`. Cero JavaScript: el hero
  sigue siendo Server Component.
- **Animación 2 (gráfica):** Recharts se monta cuando la gráfica entra en
  pantalla (`IntersectionObserver`), y su animación de entrada hace crecer las
  barras. Con datos de ejemplo rotulados como tales.
- Las dos se apagan con `prefers-reduced-motion`.
- El formulario de demo ya no se vacía ante un error (`useFormularioAccion`, que
  ahora es genérico).
- **Bug real del formulario de demo:** el correo «opcional» era obligatorio (un
  campo vacío llega como `""` y no como `undefined`). Nadie podía pedir demo sin
  dejar correo. Arreglado en `solicitudDemoSchema`, con prueba.

### Decisiones y desvíos del DESIGN.md, a propósito

| Pedido | Qué se hizo | Por qué |
|---|---|---|
| Framer Motion | **No se instaló** | El brief decía que ya estaba instalado y no lo estaba. Las dos animaciones se logran igual con CSS y con la animación propia de Recharts, sin ~35 KB más de JS en la landing (regla 7). Si se quiere, se cambia sin tocar el resto |
| Lateral 800 / Aeonik Pro | Bowlby One / Inter | Son fuentes comerciales; son los sustitutos que propone el propio DESIGN.md. Bowlby One tiene un solo peso, el más grueso |
| Cintas 3D renderizadas | Trazo SVG plano en tres capas | Sin render 3D ni degradados: borde negro + cuerpo azul + brillo blanco |
| «Solo la marquesina se mueve» | Moto y gráfica animadas | Pedidas explícitamente en el brief |
| Botones con 10px de relleno | 44–48px de alto | Área táctil mínima para el pulgar (accesibilidad) |
| Texto sobre stickers | Negro, salvo violeta (blanco) | Negro sobre violeta da 3,5:1 y no pasa AA; blanco da 6,0:1. Amarillo nunca de fondo de texto |
| Formulario sobre lila | Formulario sobre blanco | El rojo de los errores no da contraste suficiente sobre lila ni violeta |
| Stickers sobre el titular | Superpuestos solo en el hero; en las demás secciones van en línea dentro del titular, medidos en `em` | Superpuestos tapaban letras y párrafos según el ancho de pantalla |

Skills: no se usaron skills de diseño (taste, impeccable…). Imponen su propia
dirección de arte y el brief pedía el DESIGN.md como única fuente de verdad.

### ~~L1. Landing: tabla de planes y features por plan pendiente de actualizar~~ → cerrado (ronda final, Bloque 9)

Los planes quedaron formalmente definidos y renombrados (ver DN1 en Decisiones de Negocio):
- **Negociante** (antes Básico): 100% enfocado en compra/venta sin restricciones artificiales.
- **Empresa** (antes Pro): todo lo de Negociante + empeños y alertas avanzadas.

Pendiente: actualizar `src/components/landing/planes.tsx` con los nuevos nombres,
precios y la tabla comparativa real de características (Bloque 9 del backlog).


### L2. Pendientes menores de la landing

- La landing hereda `robots: index` del layout, pero no tiene `sitemap.xml`,
  `robots.txt` ni imagen de Open Graph (bloque 3.2).
- Recharts pesa ~100 KB en la landing solo por una gráfica de ejemplo. Si el
  presupuesto de JS aprieta, la gráfica se puede dibujar como SVG estático con
  la misma animación en CSS.
---

## ✅ Cerrado: el dueño del demo no podía entrar después de resembrar

**Síntoma.** `dueno@motoselrapido.test` autenticaba en Neon Auth pero la app
respondía «Tu cuenta existe pero todavía no tiene acceso a ningún negocio».

**Causa.** El perfil en `usuarios` faltaba. `--reiniciar` borra el negocio demo
y, en cascada, el perfil del dueño (`usuarios.tenant_id` es `on delete
cascade`); el usuario de Neon Auth sigue existiendo. El seed volvía a crear el
perfil solo sin `--solo-datos` y con `on conflict do nothing`, así que con
`--solo-datos` (o con un perfil viejo) el dueño quedaba sin negocio.

**Arreglo.**
- `scripts/seed.mjs`: los perfiles se escriben con `on conflict (auth_user_id) do
  update` (negocio, rol, correo, nombre, activo). Con `--solo-datos` busca a los
  usuarios existentes en `neon_auth.user` por correo y los vuelve a vincular sin
  llamar a la API. Imprime si quedaron vinculados. Reproducido en desarrollo:
  se borró el perfil del dueño y `pnpm db:seed --solo-datos` lo restituyó;
  `app.contexto_usuario` devuelve el negocio demo.
- **Login** (`acciones/auth.ts`): el negocio se resuelve con el id que devuelve
  `signIn`, no leyendo de nuevo la cookie en la misma petición (si la cookie
  recién emitida no estaba visible, el dueño veía «sin acceso» teniéndolo).
  Mensaje propio para un dueño sin negocio.
- **`/app` sin acceso**: quien tiene sesión pero no negocio (o está desactivado)
  va a `/login?sin_acceso=1` con la explicación, en vez de rebotar en silencio.
  No hay bucle: `/login` no redirige a quien ya tiene sesión.
- La base ya impedía un `owner` sin negocio (`usuarios_tenant_por_rol_check`):
  el único estado roto posible era el perfil ausente.

### Segunda parte: «Correo o contraseña incorrectos»

**Causa.** `.env.local` nunca tuvo `SEED_*_PASSWORD`: en la primera corrida el
seed creó los dos usuarios con contraseñas al azar (impresas una sola vez) y en
las siguientes decía «ya existía» sin comprobar nada.

**Arreglo.**
- `.env.local` tiene ahora `SEED_SUPERADMIN_EMAIL/PASSWORD` y
  `SEED_DUENO_EMAIL/PASSWORD` (cuentas solo de prueba; el archivo está en
  `.gitignore`).
- El seed **comprueba** con un inicio de sesión real que la contraseña configurada
  funcione para un usuario existente, y avisa si no. Better Auth no permite
  cambiarla sin la actual, un token de correo o una sesión de admin, así que
  el seed no la cambia: la salida es recrear el usuario.
- Los dos usuarios se recrearon en Neon Auth (rama desarrollo) con la API oficial
  (`delete_auth_user` y alta por `sign-up` desde el seed), no borrando filas de
  `neon_auth` a mano. El seed **reapunta el perfil existente** por correo al nuevo
  id, así que no quedan perfiles huérfanos.
- Verificado: inicio de sesión OK para ambos contra Neon Auth;
  `app.contexto_usuario` devuelve `super_admin` y `owner` (negocio demo).

**Si vuelve a pasar:** borrar el usuario con el MCP de Neon
(`delete_auth_user`) o desde la consola de Neon Auth y correr `pnpm db:seed`.

### Pendiente

- ~~**S1. El negocio suspendido no se revisa al entrar**~~ → cerrado: el login
  y `sesionDeDueno` miran el estado del negocio (ver «ronda final»).

---

## ✅ Cerrado: Bloque 5 — Panel (dashboard)

- **Alertas primero**, en tres tarjetas con lo más urgente arriba (máx. 20 c/u):
  - **Empeños vencidos** con días de atraso y si siguen en gracia o ya pueden
    declararse perdidos (manda `fecha_limite_gracia` del empeño; sin ella, 30
    días). Antes el panel solo mostraba el número.
  - **Por vencer** en los próximos 7 días (ya existía), con «Llamar».
  - **Stock estancado**: motos en inventario con más de 60 días desde la compra
    (`DIAS_STOCK_ESTANCADO`), con el capital quieto.
- **KPIs por período (7/30/90 días, en la URL)**: vendido, ganancia de ventas
  con margen, resultado del período, inventario; empeños activos con capital en
  la calle, prestado en el período, intereses cobrados, vencidos.
- **Dos gráficas Recharts**: ventas y ganancia bruta por día (área) y préstamos
  (barras) con intereses (línea, eje propio) por día. Serie con
  `generate_series`: los días sin movimiento son cero.
- **Detalle del período**: vendido − costo − gastos de las motos = ganancia de
  ventas; − gastos operativos = resultado; intereses − gastos de empeño.
- **Accesos rápidos** a un toque (DN7): vender, registrar compra, nuevo empeño,
  registrar gasto.
- **Arreglados:** (1) las tarjetas usaban una ventana de N+1 días y la gráfica de
  N; ahora ambas van de `inicioDeVentana` a hoy. (2) **V2**: la ganancia de
  ventas del panel descontaba los gastos *del período* (incluidos los generales);
  ahora descuenta los de cada moto vendida, igual que `/app/ventas`, y los
  generales van aparte como «gastos operativos». (3) Los gastos de empeño ya
  restan en el panel (P6).
- Reglas puras en `domain/panel.ts` (ventana, corte de 60 días, atraso, resultado)
  con 9 pruebas → **174 unitarias**. **Integración 42/42** (+2 del panel:
  alertas de estancado y vencido con aislamiento; números de compra/venta,
  serie de 7 puntos y aislamiento). Consultas verificadas en Neon con el
  negocio demo: 14 motos estancadas ($84.250.000), 3 empeños vencidos, 2 por
  vencer.

### Pendientes

- **D5-1. La gráfica de 90 días es diaria** (90 barras): legible, pero agrupar por
  semana se vería mejor.
- **D5-2. No hay «ver todos» en las alertas** cuando pasan de 20: el listado de
  empeños no filtra por «vencido según fecha» (el estado `vencido` casi no se
  guarda). Agregar ese filtro al listado.
- **D5-3. Saludo con KPIs del día** (DN7) no se hizo: el panel ya abre con lo
  urgente y el período por defecto es 30 días.

---

## ✅ Cerrado: Bloque 4 — Clientes

- **Listado `/app/clientes`** paginado (25 por página) con una sola caja de
  búsqueda: nombre completo, documento (también escrito con puntos) o teléfono.
  Columnas **Total comprado** (ventas activas) y **Total empeñado** (capital de
  todos sus empeños), calculadas con dos subconsultas agrupadas unidas una vez:
  sin consulta por fila.
- **Alta `/app/clientes/nuevo` y edición `/[clienteId]/editar`** con el mismo
  formulario (`useFormularioAccion`: un error no borra lo escrito). Un opcional
  vacío borra el valor anterior al editar.
- **Validación del documento según su tipo** (`domain/cliente.ts`):
  - **La cédula de ciudadanía colombiana no tiene dígito de verificación** (es
    un consecutivo): se valida como 5 a 12 dígitos. Lo mismo CE y TI.
  - **El NIT sí**: se valida con el algoritmo módulo 11 de la DIAN (probado con
    NIT públicos: DIAN 800197268-4, Bancolombia 890903938-8).
  - Pasaporte: 5 a 15 letras o números.
  - Se guarda normalizado (sin puntos ni guion; el NIT con su dígito al final),
    para que ventas y empeños encuentren al mismo cliente.
- **Sin duplicados por documento en el mismo negocio**: consulta previa para un
  mensaje claro + el índice único `(tenant_id, numero_documento)` como garantía
  (el 23505 también se traduce). El mismo documento sí puede existir en otro
  negocio.
- **Ficha `/app/clientes/[clienteId]`**: contacto con «Editar datos», y el
  historial unificado en tres secciones: motos que compró (`ventas`, con las
  devueltas marcadas), motos que le compramos (motos cuyo `proveedor_cedula` es
  su documento) y empeños con su estado según fechas. Botones **«Venderle una
  moto»** y **«Registrar empeño»**, que abren los formularios con el cliente
  precargado (`?clienteId=`).
- Pruebas: 12 unitarias nuevas (dígito NIT, normalización, formato, esquemas) →
  **166**. **Integración 40/40** (+6: duplicado en el negocio, mismo documento en
  otro negocio y aislamiento, cambio de documento a uno ocupado, búsqueda por
  nombre/documento con puntos/teléfono, totales, historial y su aislamiento).
- Consultas verificadas en Neon (desarrollo) como `motiapp_app` con el negocio
  demo: 20 clientes, totales coherentes, 0 documentos repetidos. No hubo cambios
  de RLS ni de tablas.

### Pendientes

- **K1. «Motos que le compramos» se relaciona por documento**, no por llave:
  `motos` guarda al proveedor en línea. Si se corrige la cédula del cliente, sus
  motos vendidas al negocio dejan de aparecer hasta corregir también la moto.
  Solución de fondo: `motos.proveedor_cliente_id` (migración nueva).
- **K2. Un cliente con pasaporte no puede comprar por el formulario de venta**:
  la venta pide cédula numérica (`cedulaSchema`). Se resuelve con un selector de
  cliente en la venta en vez de escribir la cédula.
- **K3. Los clientes no se borran.** A propósito: tienen ventas y empeños
  asociados (llaves foráneas). Si hace falta, «archivar».
- **K4. Búsqueda con `ilike %texto%`** sin índice trigram: suficiente para
  cientos o pocos miles de clientes por negocio (BD5).

---

## ✅ Cerrado: Bloque 3 — Ventas (con tabla `ventas`) — completado

- **Migración `0003_crear_ventas.sql`** (aplicada en desarrollo; falta
  `production`, ver B1/I3). Tabla `ventas`: `tenant_id`, `moto_id`,
  `cliente_id`, `precio_publicado`, `precio_pactado`, `descuento_aplicado`,
  `fecha`, `metodo_pago`, `observaciones`, `estado` (`activa` | `devuelta`),
  `devuelta_en`. Con RLS (`aislamiento_por_tenant`) y permisos para
  `motiapp_app`.
  - `descuento_aplicado` es una **columna generada** (`precio_publicado −
    precio_pactado`): existe como pidió el negocio y no puede desactualizarse
    (regla 2).
  - **Llaves compuestas** `(tenant_id, moto_id)` y `(tenant_id, cliente_id)`:
    una venta no puede apuntar a la moto o al cliente de otro negocio, ni
    saltándose RLS (respaldadas por `motos_tenant_id_unique` y
    `clientes_tenant_id_unique`).
  - Índice único parcial `ventas_moto_activa_unique`: a lo sumo una venta
    `activa` por moto. Una devolución deja la fila como historia y permite
    vender la moto otra vez.
  - Copió las 10 ventas que vivían en `motos` (total verificado: $79.080.000
    antes y después) y registró a sus compradores en `clientes`.
  - `motos.precio_venta` pasó a ser **`precio_publicado`** (DN6) y se quitaron
    de `motos` las columnas de venta y comprador.
- **Registrar venta** (`/app/ventas/nueva` o la ficha), en una transacción:
  bloquea la moto, valida estado y fecha, encuentra o crea al comprador en
  `clientes` (si existe solo actualiza el teléfono), inserta en `ventas` con el
  precio publicado que tenía la moto y pasa la moto a `vendida`. El formulario
  precarga el precio publicado y muestra el descuento y la ganancia estimada.
- El formulario de moto tiene **«Precio publicado»** (opcional).
- **Recibo PDF** en el navegador (jspdf, carga diferida); no muestra costo ni
  ganancia. `BotonPdf` es genérico y lo usa también el contrato de empeño.
- **Historial `/app/ventas`** con atajos de período (mes por defecto), búsqueda,
  forma de pago, fechas, paginación, descuento por venta, y **reporte de
  ganancia por período** (tarjetas + tabla por mes, sobre el filtro completo).
- Panel, inventario y ficha leen la venta de `ventas`.
- **Arreglado de paso:** `mensajeDeError` no traducía ningún error de Postgres
  porque Drizzle lo envuelve en `cause`; la «placa repetida» nunca se mostraba.
  Ahora recorre la cadena.

### Pruebas

- Unitarias: 154 (período, fecha de venta, resumen, descuento, esquema de
  venta, recibo).
- **Integración: 34/34** (incluye 2 de devoluciones). Aislamiento 25 (21 + 4 de `ventas`: no ve las ventas
  ajenas ni por id; no registra a nombre de otro negocio; la llave compuesta
  impide apuntar a la moto de otro negocio; no modifica ni borra ventas ajenas)
  y 7 del flujo de venta (fecha inválida sin efectos, moto ajena, cliente
  existente, doble venta, índice de venta activa, cliente nuevo aislado,
  historial y totales con descuento).
- `db:verificar` OK con `ventas`. SQL del panel probado en Neon como
  `motiapp_app`. `next build` pasa con Turbopack y con `--webpack`.

### Decisiones

- El teléfono del comprador es obligatorio (`clientes.telefono` es `not null`).
- El precio publicado de la venta lo toma el servidor de la moto, no el
  formulario: el descuento registrado es contra lo que de verdad se anunció.
- **Gastos en el reporte de ventas = los de cada moto vendida**; el panel usa
  los del período (incluye generales). Ver V2.

### Pendientes

- ~~**V1. Registrar devoluciones.**~~ → hecho: botón «Registrar devolución» en
  la ficha (con confirmación). En una transacción la venta queda `devuelta` con
  `devuelta_en` y la moto pasa a `devuelta`; deja de contar en reportes y la
  moto se puede vender otra vez (nueva fila). La ficha muestra el historial de
  ventas cuando hay devoluciones. 2 pruebas de integración nuevas (34/34).
  Falta: motivo de la devolución y reembolso parcial (hoy es total).
- ~~**V2. Unificar el criterio de gastos** entre panel y reporte~~ → cerrado en el Bloque 5.
- **V3. Exportar el historial a CSV** (parte de M9).
- **V4. El selector de «Nueva venta» trae hasta 500 motos.** Con más, buscador.
- **V5. `pnpm db:seed --reiniciar` no se corrió** tras el cambio (borra el
  negocio demo y su vínculo con el usuario dueño). El script ya siembra en
  `ventas`; pasa `node --check`.
- **V6. Alta rápida con badge «Información incompleta»** (DN6) sigue pendiente.
- **V7. Aplicar `0003` en `production`** junto con 0000–0002 (ver B1).

---

## ✅ Cerrado: Bloque 2 — Inventario de motos

- **Listado `/app/inventario` con TanStack Table**: orden por placa, moto, año,
  precio y fecha de compra (clic en el encabezado), paginación y filtros. Todo
  vive en la URL y se consulta en el servidor (`manualSorting`,
  `manualPagination`); el orden pasa por una lista blanca de columnas.
- **Buscador** en una sola caja: placa, marca, modelo, nombre y **cédula** del
  dueño anterior o del comprador. Más filtro por estado y fechas de compra.
- **Alta** (`/nueva`) y **edición** (`/[motoId]/editar`) con el mismo
  formulario. Editar no cambia el estado; corregir el precio corrige la ganancia
  en todas partes (regla 2).
- **Cambio de estado** desde la ficha, solo a los estados permitidos
  (`TRANSICIONES_MOTO`, con pruebas). A `vendida` solo se llega registrando la
  venta; una moto vendida no se mueve desde aquí.
- **Migración 0002**: estado `dada_de_baja` y **borrado lógico**
  (`eliminada_en`). La moto sale de listados, ficha y panel; sus gastos siguen
  contando porque ese dinero sí salió. La placa es única solo entre motos no
  eliminadas (índice parcial). Una moto vendida no se puede borrar.

### Bugs encontrados y arreglados

- El listado de inventario reventaba al elegir «Todos» en el estado (mismo
  error que tenía el de empeños).
- **Registrar una moto sin cilindraje o sin cédula del proveedor fallaba
  siempre**: el cilindraje vacío se volvía 0 y la cédula vacía no pasaba la
  validación de 5 a 12 dígitos.
- Se podía crear una moto como «vendida» sin precio (lo rechazaba la base con un
  error sin traducir) y la edición permitía cambiar el estado a «vendida».
- El panel y los listados no conocían el borrado lógico: ahora todas las
  consultas de motos excluyen las eliminadas.

### Decisiones

- **No hay estado «empeñada».** La moto del negocio no se empeña, y los bienes
  empeñados viven en `vehiculos_empeno` (regla 3). Si el negocio quiere usar una
  moto suya como garantía de algo, es otro caso de uso y hay que hablarlo.
- `devuelta` (el comprador la regresó) puede volver a `disponible`; `dada_de_baja`
  también, por si fue un error.

### Pendientes

- **I1. No hay forma de recuperar una moto borrada desde la app** (solo por SQL:
  `update motos set eliminada_en = null where id = …`). Si hace falta, una vista
  «Papelera» en el inventario.
- **I2. Los días en inventario de la tabla usan el reloj del navegador.** La
  diferencia con el de Colombia es de horas; solo podría mover el número en un
  día cerca de la medianoche.
- **I3. Aplicar `0002` y `0003` en `production`** junto con `0000` y `0001` (ver B1).

---

## ✅ Cerrado: Bloque 1 — Login y datos de demostración

- **`/login`** (antes `/ingresar`; la ruta vieja redirige con 308). Errores por
  campo con Zod, mensaje claro si las credenciales fallan, botón con estado de
  carga, y el formulario ya no se vacía ante un error. Tras entrar: `owner` →
  `/app`, `super_admin` → `/admin`. Si el proxy guardó un `destino`, se respeta
  solo si es una ruta interna del área del rol (evita redirección abierta).
- **`/recuperar-password`** y **`/restablecer-password`**. El correo lo envía
  Neon Auth (proveedor `shared` de la rama), así que no depende de Resend. La
  respuesta es siempre la misma exista o no la cuenta, para no revelar qué
  correos están registrados. Un enlace vencido muestra cómo pedir otro.
- **Guardas:** el proxy manda a `/login?destino=…` sin sesión en `/app` y
  `/admin`. El rol se decide en los layouts (consulta la base en cada petición):
  `owner` en `/admin` → `/app`; `super_admin` en `/app` → `/admin`. **Decisión:**
  el super admin no navega `/app` (no tiene negocio); entrará a un negocio con la
  impersonación del bloque 6, que deja rastro de auditoría.
- **`pnpm db:seed`** (`scripts/seed.mjs`): super admin, dueño y el negocio
  «Motos El Rápido» con 20 clientes, 30 motos, 15 gastos y 10 empeños con
  abonos. Idempotente (id fijo del negocio; usuarios buscados por correo),
  `--reiniciar` para recrearlo y `--solo-datos` para sembrar sin Neon Auth. Se
  niega a correr si hay otros negocios activos. Los saldos de los empeños cuadran
  al peso con los de la app.

### Cómo entrar por primera vez

```bash
pnpm db:seed
```

Crea los dos usuarios en Neon Auth e imprime las credenciales al final. Las
contraseñas salen de `SEED_SUPERADMIN_PASSWORD` y `SEED_DUENO_PASSWORD` en
`.env.local`; si están vacías se generan y se imprimen **una sola vez**.

Estado al 16 oct 2026: el negocio demo ya está sembrado en `desarrollo`
(`--solo-datos`); **faltan los dos usuarios**, porque crear cuentas en Neon Auth
lo hace quien corre el seed, no el asistente. Al correrlo, el negocio no se
duplica y solo se agregan los usuarios.

### Pendientes del bloque

- **L3. El registro público se cerrará en Bloque 1.5** (ver DN5). Se eliminará la
  pantalla `/registrarse`, el enlace en `/login` y se bloqueará el registro público
  en Neon Auth (`disableSignUp: true`), pasando a un modelo 100% por invitación.
- **L4. Un usuario con sesión que abre `/login` ve el formulario** en vez de ir a
  su panel. Es cosmético.
- **L5. El seed no actualiza la contraseña de un usuario que ya existe.** Si se
  pierde, se recupera con `/recuperar-password` (los correos `.test` no reciben
  nada: usa correos reales en `SEED_*_EMAIL` si quieres probar la recuperación).

---

## ✅ Cerrado: las 21 pruebas de aislamiento corren y pasan

**16 oct 2026, rama `desarrollo`:** `pnpm test:integracion` → **21 de 21 en verde**,
ninguna saltada. `pnpm db:verificar` → «Todo en orden». Los datos sembrados se
borran al final (la rama queda con 0 filas).

### Por qué se saltaban

`hayBaseDeDatos()` (`src/pruebas/base.ts`) exige **las dos** variables,
`DATABASE_URL` y `DATABASE_URL_MIGRACIONES`, y `.env.local` tenía:

```
DATABASE_URL=# keep Neon credentials secure: ...     ← vacía (empieza con #)
DATABASE_URL='postgresql://motiapp_app:…-pooler…'
DATABASE_URL_MIGRACIONES=# keep Neon credentials…    ← vacía: por esto se saltaban
DATABASE_URL='postgresql://neondb_owner:…'           ← la última gana: la app usaría el DUEÑO
```

`dotenv` trata lo que empieza con `#` como comentario (la variable queda vacía) y,
si una variable se repite, se queda con la última. La última línea debía llamarse
`DATABASE_URL_MIGRACIONES`; con ese nombre, la app habría arrancado como el dueño
de las tablas (la guarda de rol lo habría bloqueado). Se corrigió el archivo.

Vitest sí leía `.env.local` (`cargar-entorno.ts` con `dotenv`): fijar
`$env:DATABASE_URL` en PowerShell no cambiaba nada porque la otra variable
seguía vacía.

### Qué cambió para que no vuelva a pasar

- `pnpm test` corre **solo** las unitarias (`*.prueba.ts`): no necesita base,
  red ni `.env.local`.
- `pnpm test:integracion` usa `vitest.integracion.config.ts`: carga `.env.local`
  solo y, si falta una variable, **falla diciendo cuál** en vez de saltarse las
  21 en silencio.
- Tres pruebas buscaban «row-level security» en el mensaje, pero Drizzle 0.45
  envuelve el error (`Failed query: …`) y deja el de Postgres en `cause`. Ahora
  `esperarRechazoRls()` recorre la cadena y exige el código `42501` o ese
  mensaje: si la escritura falla por otra razón (llave foránea, CHECK), la
  prueba falla.
- Una prueba esperaba `prueba-alfa` en el correo, pero el sembrado usa un sufijo
  aleatorio; ahora compara el usuario sembrado.

### Cómo correr las pruebas de integración

1. `.env.local` con la rama **`desarrollo`** (siembran y borran datos: nunca
   `production`). Una sola línea por variable:

   ```
   DATABASE_URL='postgresql://motiapp_app:<clave>@<endpoint>-pooler.<región>.aws.neon.tech/neondb?sslmode=require'
   DATABASE_URL_MIGRACIONES='postgresql://neondb_owner:<clave>@<endpoint>.<región>.aws.neon.tech/neondb?sslmode=require'
   ```

   - `motiapp_app` va **con** `-pooler`; `neondb_owner` va **sin** él.
   - Al pegar desde la consola de Neon, borra la línea de comentario
     `# keep Neon credentials secure…`: si queda pegada después del `=`, la
     variable queda vacía.

2. Correr, sin fijar nada en la terminal:

   ```bash
   pnpm db:verificar
   pnpm test:integracion
   ```

3. Si falla con «Las pruebas de integración necesitan …», el mensaje dice qué
   variable falta. Si falla con «ALTO: la conexión de la aplicación no respeta el
   aislamiento», `DATABASE_URL` está usando el rol dueño.

---

## ✅ Cerrado en el bloque Empeños + Gastos

### C4. La base de datos real tenía cinco fallos que impedían arrancar

Aplicar el esquema en Neon (rama `desarrollo`) y consultar como `motiapp_app`
destapó problemas que ninguna prueba sin base podía ver:

| # | Fallo | Efecto | Arreglo |
|---|---|---|---|
| 1 | `alter role motiapp_app nosuperuser` | En Neon el dueño no es superusuario: la migración abortaba ahí y **nunca se creaban RLS, políticas ni permisos** | Quitado `nosuperuser` (el rol nace sin él; la guarda lo verifica) |
| 2 | `revoke alter, …` | `alter` no es un privilegio: error de sintaxis | Quitado `alter` |
| 3 | Sin `select`/`insert` en `tenants` y `solicitudes_demo` | Formulario de demo, tasa por defecto y todo `/admin` fallaban con "permission denied" | Migración **0001**: permisos + políticas de alta/baja solo para super admin + trigger que impide al dueño cambiar plan, estado, límite o notas |
| 4 | La guarda preguntaba `pg_has_role(current_user, 'motiapp_app')` | Siempre verdadero con el rol correcto: **la app se negaba a arrancar justo cuando estaba bien configurada** | Ahora pregunta si la conexión puede actuar como el **dueño real** de `public.tenants` |
| 5 | `insert … returning` en `solicitudes_demo` | `RETURNING` exige pasar la política de lectura (solo super admin): **el formulario público fallaba siempre** | Insert sin `returning`, id generado en el servidor |

Además `listarSolicitudes` y `contarTenants` usaban `sinContexto` y siempre
habrían devuelto cero filas; ahora usan `conAdmin`.

Sobre editar `0000`: la regla es no tocar una migración ya aplicada. Esta no se
había aplicado nunca en ninguna base (`production` está vacía y el archivo no
podía terminar de correr), así que se corrigieron **solo** las dos líneas que
lo hacían inaplicable, en el archivo y en su fuente (`aprovisionamiento.sql`,
`rls.sql`). Todo lo nuevo va en `0001`.

### C5. El dinero de los empeños se calculaba mal

- **El abono a capital borraba interés ya ganado.** `saldoEmpeno` recalculaba
  todo el interés sobre el capital de hoy: un millón al 10% durante 30 días
  causa 100.000; si el día 30 el cliente abonaba 500.000 a capital, el interés
  ganado bajaba a 50.000. Nueva `saldoConAbonos()`: causa por tramos, cada uno
  sobre el capital vigente en esos días. Con prueba de ese caso exacto.
- **Un abono mayor de lo debido perdía la diferencia.** Se guardaba
  `monto = 100.000` con 60.000 aplicados. Ahora `sobranteDeAbono()` lo detecta
  y el abono se rechaza diciendo el máximo.
- **"Hoy" se calculaba en UTC.** Desde las 7 p. m. en Colombia ya era mañana, y
  el interés contaba la fracción del día de hoy como un día entero. Nueva
  `hoyISO()` en `src/lib/fechas.ts` con la zona del negocio.
- **Dos abonos simultáneos podían calcular sobre el mismo saldo.** El
  comentario decía que había bloqueo y no lo había. Ahora `select … for update`.
- **El listado reventaba con un 500** al elegir «Todos» en el filtro de estado
  (`""` no es un estado válido) y `soloPorVencer=false` activaba el filtro
  (`z.coerce.boolean("false")` es `true`). Arreglado en `filtrosEmpenoSchema`.
- **"Vencidos" contaba un estado que nunca se escribe** y el capital colocado
  no restaba lo ya devuelto. Arreglado en `resumenEmpenos` y en el panel.
- **Hallazgos de la revisión de código, ya arreglados:** declarar perdido con
  una fecha anterior al último abono registraba la moto con un costo inflado;
  renovar un empeño sin capital pendiente lo reabría con saldo cero; liquidar
  podía cobrar un monto distinto al que el cajero confirmó (ahora se envía
  `totalEsperado` y se rechaza si no coincide); la guarda de rol cacheaba un
  fallo pasajero hasta reiniciar el proceso, y usaba `usage` en vez de `member`.

### C6. Módulo Empeños completo (antes M4, M5, A2, A3)

- Ficha `/app/empenos/[empenoId]`: saldo de hoy, contrato, bien, cliente,
  historial de abonos con lo que quedó debiendo después de cada uno.
- Registrar abono (atajos «solo el interés» y «todo lo que debe»).
- **Liquidar**: el servidor calcula el total a la fecha; el formulario no envía
  monto. El empeño queda `pagado`.
- **Renovar**: cobra el interés pendiente como abono en la misma transacción y
  extiende el plazo desde el vencimiento (o desde hoy si ya venció).
- **Declarar perdido**: solo después del vencimiento. Si es una moto y el dueño
  lo pide, **pasa al inventario** con precio de compra = capital no recuperado
  (el interés no cobrado no se suma: nunca fue ingreso), proveedor = cliente y
  el número de empeño en la descripción. Carros y teléfonos quedan como empeño
  perdido: el sistema solo lleva inventario de motos.
- Contrato en PDF generado en el navegador con `jspdf` (cargado al hacer clic).
- Listado con filtros por estado real (incluido «vencido»), tipo de bien, fechas
  y texto; paginación; enlaces a la ficha. Las alertas del panel enlazan a la
  ficha.

### C7. Módulo Gastos (antes M8)

- `/app/gastos`: gastos generales, listado con filtros por módulo, categoría y
  fechas, total del filtro y borrado con confirmación.
- Gastos desde la ficha de cada moto y de cada empeño.
- **La ficha de la moto pasaba `0` como gastos**: la ganancia siempre salía
  mejor que la real. Ahora suma sus gastos.
- `resultadoDelPeriodo()` en `src/domain/gasto.ts` es la única fórmula de
  ganancia del período; el panel la usa en vez de restar por su cuenta.

### C8. Formularios que borraban lo escrito

En React 19 un `<form action={…}>` se vacía al terminar la acción **aunque
devuelva errores de validación**: una cédula mal puesta borraba los 20 campos
del empeño. Nuevo `useFormularioAccion()` que envía por transición y solo limpia
el formulario si la acción responde `ok` (lo que además evita registrar dos
veces el mismo abono). Aplicado a todos los formularios nuevos y al de nuevo
empeño. **Falta** aplicarlo a los de moto y venta: ver P5.

### C9. Otros

- `@vercel/blob` desinstalado y `BLOB_READ_WRITE_TOKEN` quitado: la regla 4
  prohíbe almacenar archivos. **M7 queda descartado.**
- `.env.example` no documentaba `DATABASE_URL`, `DATABASE_URL_MIGRACIONES` ni
  las de Neon Auth; ahora sí (solo marcadores).
- `erroresDeZod` estaba copiado en tres acciones: ahora en
  `src/server/acciones/comun.ts`, con `ErrorNegocio` para separar mensajes del
  negocio de errores internos.
- `Paginacion` compartida: la del inventario dejaba hacer clic en «Anterior»
  estando en la página 1.

### Skills y agentes usados

- Agente `ecc:code-reviewer` para revisar el bloque (lógica de dinero, RLS,
  formularios).
- No se usaron skills de scaffolding: el proyecto ya tiene sus convenciones y
  generar código genérico encima habría chocado con ellas.

---

## ✅ Cerrado en la ronda de pruebas

### C1. Tres bugs reales del dominio, encontrados por las pruebas

Las pruebas del dominio no fueron un trámite: encontraron tres errores que ya
estaban en el código y que habrían llegado a producción.

**a) `textoRequerido` rechazaba cualquier texto si se omitía `max`.**

`const { min = 1, max, campo }` dejaba `max` en `undefined`, así que Zod aplicaba
`.max(undefined)` y el mensaje salía como *"El nombre no puede pasar de undefined
caracteres"*. Ahora `max` tiene tope por defecto (200) y hay prueba de regresión.

**b) `anoSchema` no aceptaba el año como texto.**

Los formularios HTML, la URL y las Server Actions entregan todo como texto. El
esquema exigía `number`, así que **el formulario de registrar compra fallaba
siempre** con "El año debe ser un número" aunque el usuario escribiera 2021. Ahora
usa `z.coerce.number()`, que era lo que ya hacían `cilindraje` y `tasaMensual`.

**c) `diasParaVencer` dependía de la zona horaria del servidor.**

Usaba `getFullYear()`/`getMonth()`/`getDate()`, que leen hora local. Con un
vencimiento `2026-01-08T23:59:00Z`, un servidor en UTC+02:00 lo habría tratado como
el día 9 y el empeño habría aparecido **vencido un día antes**. Un bug que solo se
manifiesta según dónde esté desplegado el servidor. Ahora usa métodos UTC y la
comparación es por día completo, con prueba de determinismo.

### C2. Las políticas RLS ya tienen pruebas de aislamiento escritas

`src/db/__pruebas__/aislamiento.integracion.ts` contiene 21 pruebas que siembran
**dos negocios** y intentan la fuga por las cuatro vías posibles:

| Vía de fuga | Prueba |
|---|---|
| Leer de más | cada negocio ve solo sus motos, clientes, empeños y usuarios |
| Adivinar un id ajeno | pedir por id la moto del otro negocio devuelve 0 filas |
| `join` entre negocios | el join a `clientes` no arrastra filas ajenas |
| Escribir a nombre de otro | `insert` con `tenant_id` ajeno es rechazado por el `with check` |
| Mover una fila propia al otro negocio | el `update` de `tenant_id` es rechazado |
| Borrar lo ajeno | el `delete` afecta 0 filas |
| Olvidar el contexto | sin contexto, 0 filas y tampoco se puede escribir |
| El rol de la app | no es superusuario ni tiene `BYPASSRLS` |
| Tablas sin RLS | ninguna tabla con `tenant_id` quedó sin `rowsecurity` |
| Romper el huevo y gallina | `app.contexto_usuario()` resuelve el negocio correcto y devuelve 0 filas para un usuario desconocido |

**Falta ejecutarlas contra Neon** — ver B1. Se saltan solas si no hay credenciales,
así que `pnpm test` nunca falla por eso.

### C3. La guarda de rol existe y se ejecuta sola

`asegurarRolDeAplicacion()` en `src/db/index.ts` corre **antes de la primera
transacción** de `conTenant`, `conAdmin` y `sinContexto`, y se niega a continuar si
la conexión es superusuario, tiene `BYPASSRLS` o es miembro del rol dueño.

Cierra el riesgo descrito en B3 de la ronda anterior. Se apoya en `pg_has_role` y
no en comparar nombres, porque lo que importa no es cómo se llame el rol sino si
es dueño. El resultado se cachea por proceso, así que no cuesta nada después de la
primera vez, y no molesta durante `next build`.

---

## 🔴 Bloqueante — hay que hacerlo antes de usar esto con un negocio real

### B1. `production` sigue vacía

**Situación (16 oct 2026).** El proyecto de Neon `MotiApp` tiene dos ramas:

| Rama | Estado |
|---|---|
| `production` | **Vacía**: ni tablas, ni roles, ni esquema `app`. |
| `desarrollo` | `0000` + `0001` aplicados. `pnpm db:verificar` en orden y las 21 pruebas de aislamiento en verde (ver arriba). Sin datos. |

En `desarrollo` el aislamiento ya está **demostrado**, no solo escrito. Lo que
falta es repetir lo mismo en `production` antes de cargar un negocio real.

Nota: en `desarrollo` se ejecutó `grant motiapp_app to neondb_owner with inherit
false, set true`, para poder hacer `set role motiapp_app` y probar como la app.
Va en la dirección segura (el dueño puede actuar como la app, no al revés) y no
hace falta en `production`.

**Cómo cerrarla (toca producción: lo haces tú):** pegar
`drizzle/0000_inicial.sql` y después `drizzle/0001_permisos_tablas_globales.sql`
en el SQL Editor de la rama `production`, como el dueño; fijar la contraseña de
`motiapp_app` y correr `pnpm db:verificar` apuntando a esa rama. Las pruebas de
integración **no** se corren contra `production`: siembran y borran datos.

### B2. Cualquiera puede registrarse en `/registrarse` → Resuelto: Login cerrado (Bloque 1.5)

**Decisión cerrada (ver DN5):** No habrá registro público. Se eliminará la ruta `/registrarse`
y el link "Crear una" del `/login`. Solo el `super_admin` creará cuentas desde `/admin`,
enviando credenciales iniciales por correo con enlace para cambiar contraseña. La landing
solo invitará a "Solicitar acceso". Se ejecuta en el nuevo **Bloque 1.5 — Auth cerrado**.


---

## 🟡 Encontrado en el bloque Empeños + Gastos

### ~~P1. El panel usaba la fecha UTC y contaba mal los vencidos~~ → cerrado

Lo señaló la revisión de código y se arregló en este mismo bloque: `panel.ts`
usaba `current_date` de Postgres (UTC en Neon), así que desde las 7 p. m. las
alertas y las ventanas de 7/30/90 días se corrían un día. Ahora recibe
`hoyISO()` como parámetro. `vencidos` cuenta empeños abiertos con la fecha
pasada (antes contaba `vencido`, que nunca se escribe, y `perdido`), y el capital
colocado resta lo ya devuelto.

### P8. Un empeño a más de 30 días del vencimiento se muestra «Perdido» sin estarlo

`estadoSegunFechas` deriva `perdido` pasada la gracia, pero en la base el empeño
sigue `activo`: la ficha muestra la etiqueta «Perdido» junto a los formularios de
abono, y el filtro «Perdido» no lo encuentra (filtra por lo guardado). Propuesta:
mostrar «Vencido · gracia agotada» y dejar «Perdido» solo para lo que el dueño
cerró con «Quedarse con el bien». Cambia una prueba existente, por eso no se
tocó sin acordarlo.

### P9. Dos clics seguidos pueden registrar el mismo abono dos veces

El bloqueo `for update` evita que se pisen los saldos, pero no detecta un
duplicado: el segundo abono simplemente se aplica después del primero. El
formulario se deshabilita mientras envía y se limpia al terminar, así que la
ventana es pequeña. Solución si molesta: un token de idempotencia por envío.

### P2. Un abono no se puede corregir ni anular

Si el dueño registra mal un abono, hoy no hay forma de deshacerlo desde la app.
Anularlo no es trivial: si el abono cerró el empeño, hay que reabrirlo, y si
hay abonos posteriores su reparto se calculó con este. Propuesta: solo permitir
anular el **último** abono, en una transacción que recalcule el estado.

### P3. `renovado` y `vencido` existen en el esquema y no se usan

Renovar extiende el mismo empeño (el cliente conserva su número), así que
`renovado` nunca se escribe; `vencido` se deriva de la fecha. Se dejan en el
`CHECK` para no hacer una migración solo por eso, y se ocultan del filtro.

### P4. El dueño podría leer `notas_internas` de su negocio

`0001` otorga `select` sobre todas las columnas de `tenants`. Ninguna pantalla
del dueño pide esa columna, pero los permisos por columna no distinguen dueño de
super admin (los dos son `motiapp_app`). Si las notas llegan a ser sensibles,
moverlas a una tabla aparte sin política para dueños.

### P5. Formularios de moto todavía se vacían ante un error

El de venta ya usa `useFormularioAccion()` (Bloque 3). El de moto sigue con `<form action>` (ver C8). Pasarlos a `useFormularioAccion()` al construir el
bloque 2.1/2.2. Los de auth y demo, igual.

### P6. Los gastos de empeño no restan de ningún reporte todavía

Se registran y se ven en la ficha y en `/app/gastos`, pero el panel no tiene aún
una «ganancia del módulo de empeño» (intereses cobrados − gastos de empeño).
Va con el bloque 2.4.

### P7. Carros y teléfonos perdidos no tienen destino en el sistema

Quedan como empeño `perdido`. Si el negocio los revende, esa venta no queda
registrada en ninguna parte. Decisión de producto: ¿hace falta un inventario
general, o basta con anotarlo?

---

## 🟠 Módulos incompletos

> M4, M5 y M8 quedaron cerrados (C6 y C7). M7 se descarta por la regla 4: la
> app no guarda archivos.

### ~~M1. Clientes: falta el listado y el alta~~ → cerrado en el Bloque 4

**Qué falta.** `src/app/app/clientes/page.tsx` es un placeholder. El repositorio
tiene `buscarClientes()` y `buscarOCrearCliente()`, pero no hay listado con
búsqueda ni formulario de edición.

**Por qué importa.** Hoy un cliente solo se crea como efecto secundario de
registrar un empeño. El dueño no puede consultar el historial de un cliente ni
corregir un teléfono mal escrito.

### ~~M2. Alta y edición de negocios desde `/admin`~~ → cerrado en la ronda final

**Qué falta.** `crearTenantConDueno()` y `actualizarTenant()` existen en
`src/server/repositorios/tenants.ts`, pero **no hay pantalla que las use**.

**Por qué importa.** Hoy para crear un negocio hay que entrar al SQL Editor de
Neon. Para un producto que se vende a 3-4 negocios es tolerable unas semanas,
pero no es sostenible: cada alta es un error de tipeo esperando a pasar.

**Falta además:** suspender un negocio, cambiar el plan, editar el límite de
inventario y las notas internas.

### ~~M3. Impersonar un negocio para soporte~~ → cerrado: modo soporte con motivo, vigencia y auditoría (tabla `impersonaciones`, 0004)

**Qué falta.** No está implementado.

**Cómo hacerlo bien (importante).** No basta con cambiar el `tenant_id` de la
transacción: hay que dejar **rastro de auditoría**. Propuesta: una tabla
`accesos_soporte` que registre quién impersonó qué negocio, cuándo y por qué
motivo; y un aviso visible en la interfaz mientras dure la suplantación, para que
nadie confunda datos de soporte con datos propios.

### ~~M4. Ficha de un empeño y registro de abonos~~ → cerrado en C6

**Qué falta.** El repositorio tiene `obtenerEmpeno()`, `registrarAbono()` y
`accionRegistrarAbono`, pero **no existe la ruta `/app/empenos/[empenoId]`**. El
listado ya enlaza a `/app/empenos/${empenoId}` desde `accionRegistrarAbono`
después de un abono.

**Por qué importa.** Sin esa pantalla no se puede cobrar un interés ni abonar a
capital. Es la operación diaria del módulo de empeño.

### ~~M5. Renovación y pérdida de empeños~~ → cerrado en C6

**Qué falta.** Los estados `renovado` y `perdido` existen en el esquema, y
`estadoSegunFechas()` los calcula, pero **nadie los escribe en la base**.

**Por qué importa.** Un empeño que pasó la fecha límite de gracia aparece como
"perdido" en pantalla, pero sigue siendo `activo` en la base. El día que el
negocio quiera disponer del bien, el dato no lo respalda.

**Falta:** una acción que pase a `perdido` los empeños vencidos más allá de la
gracia, y una acción de renovación que extienda el vencimiento cobrando el
interés causado.

### M6. Alertas de vencimiento por correo o WhatsApp

**Qué falta.** La alerta de 7 días existe, pero **solo se ve al abrir el panel**.
Resend está instalado y `RESEND_API_KEY` está en `.env.example`, pero no hay
ningún envío.

**Por qué importa.** El negocio pidió explícitamente la alerta. Una alerta que
hay que ir a buscar no evita que se venza un empeño.

**Falta:** un endpoint protegido con `CRON_SECRET` y un `vercel.json` con el
cron diario, más la plantilla de correo. Ver D6.

### ~~M7. Fotos: cédulas, motos y contratos~~ → descartado (regla 4: sin archivos)

**Qué falta.** `@vercel/blob` está instalado y `BLOB_READ_WRITE_TOKEN` está en
`.env.example`, pero no hay ninguna subida ni ninguna columna que guarde la ruta
del archivo.

**Por qué importa.** Para un empeño, la foto de la cédula y del bien es la prueba
del negocio. También es lo que hace útil el almacenamiento que elegiste.

**Falta:** columnas de fotos (o una tabla `archivos` con `tenant_id`), subida
desde el formulario, y una política de acceso: **las fotos de un negocio no
pueden quedar en una URL pública adivinable**. Vercel Blob permite URLs firmadas;
hay que usarlas.

### ~~M8. Gastos: no hay pantalla~~ → cerrado en C7

**Qué falta.** La tabla `gastos` existe, el panel ya suma los gastos por módulo, y
`motos.gastosAsociados` ya se calcula. Pero **no hay ninguna forma de registrar un
gasto en la interfaz**.

**Por qué importa.** La ganancia del panel (`venta − compra − gastos`) siempre da
un número mejor que el real mientras no se puedan cargar los gastos. Un reporte
que miente es peor que no tener reporte.

**Falta:** formulario de gasto desde la ficha de una moto y desde la ficha de un
empeño, más un listado por período.

### M9. Reportes: no hay pantalla dedicada

**Qué falta.** El panel muestra los últimos 7/30/90 días, pero no hay reportes
exportables ni comparación entre períodos.

**Por qué importa.** El prompt pide "reportes" como sección propia.

**Hecho en el Bloque 3:** ganancia de ventas por período con desglose mensual
(`/app/ventas`).

**Falta:** reporte de intereses cobrados y exportación (CSV es suficiente; no
hace falta Excel).

### M10. Editar y borrar registros

**Qué falta.** `actualizarMoto()` y `eliminarMoto()` existen en el repositorio,
pero no hay interfaz. No hay edición de clientes ni de empeños.

**Por qué importa.** Hoy un error de tipeo en el precio de compra es permanente.

### M11. Notas del cliente

**Qué falta.** `clientes.notas` existe en el esquema y no se captura en ninguna
parte.

---

## 🟡 Decisiones de producto pendientes

### D1. ¿Cómo se elige el negocio en la URL?

**Situación.** Hoy es `/app` y el negocio sale de la sesión: un usuario pertenece
a **un** negocio. Es lo más simple y coincide con "cada negocio opera de forma
independiente".

**Si algún día un dueño tiene dos negocios,** esto se rompe. Las opciones son
`/app/[negocio]/...` (más simple, el negocio en la URL) o subdominios
`negocio.motiapp.co` (más lindo, más trabajo: DNS comodín, cookies por dominio,
certificados).

**Recomendación:** no hacerlo hasta que haga falta. La ruta `/app` no cambia si se
migra después, porque el `tenant_id` siempre sale de la sesión y nunca de la URL.

### D2. ¿Se mantiene el registro público? → Resuelto: NO (solo invitación)

**Decisión de producto cerrada (ver DN5 y Bloque 1.5):** No hay registro abierto.
El acceso es exclusivamente por invitación gestionada por el super administrador.


### D3. Límite de inventario: resuelto por regla de balance

**Decisión de negocio (cerrada):** NO habrá restricciones artificiales (como limitar
la cantidad de motos o clientes en el plan Negociante). El plan Negociante resuelve
el 80% del día a día del comerciante sin sentirse castrado.

La diferenciación con el plan Empresa es funcional (módulo de empeños y alertas
avanzadas de vencimiento/SOAT/tecnomecánica), no por volumen de inventario. La columna
`tenants.limite_inventario` queda obsoleta y no se aplicará bloqueo alguno.

---

## 📌 Decisiones de negocio y arquitectura consolidadas

### DN1. Renombrar planes y diferenciación de features

Los planes se renombran para alinearse con la identidad real del cliente:
- **Básico → Negociante**
- **Pro → Empresa**

Documentado aquí; pendiente actualizar la landing (`src/components/landing/planes.tsx`) en el Bloque 9.

#### Regla de balance
El **Plan Negociante** debe resolver el **80% del día a día** de una compraventa de motos sin sentirse castrado. Las features exclusivas de **Empresa** son estrictamente sobre el negocio de empeños y notificaciones/alertas avanzadas. **Queda terminantemente prohibido agregar restricciones artificiales** (como limitar la cantidad de motos en inventario o el número de clientes) en el plan Negociante.

#### Matriz detallada de features por plan

**Plan Negociante** (solo compra/venta):
- Inventario de motos completo (CRUD, estados `en_preparacion`/`disponible`/`reservada`/`en_reparacion`/`vendida`/`devuelta`/`dada_de_baja`, borrado lógico `eliminada_en`). Regla de ingreso: moto recién comprada entra como `en_preparacion` y solo desde allí pasa a `disponible`.
- Gastos por moto (`repuestos`, `otros`).
- Gastos operativos (`arriendo`, `servicios`, `otros`).
- Ventas con recibo PDF descargable.
- Devoluciones de motos vendidas con reversión de estado y ganancia.
- Clientes con historial de compras y ventas.
- Dashboard compra/venta: stock actual, ventas del período, ganancia bruta, capital inmovilizado, ranking de rentabilidad de motos, gráfica ventas vs. compras.
- Reporte mensual (ingresos, egresos operativos y de compras, utilidad neta).

**Plan Empresa** (todo lo de Negociante + módulo empeños y alertas):
- Módulo de empeños completo (garantías en motos, carros y teléfonos).
- Abonos (interés, capital, ambos), liquidación, renovación y declaración de pérdida con paso a inventario.
- Contratos PDF de empeño generados en el navegador.
- **Alertas de vencimiento de empeños** (en panel y notificaciones).
- **Notificaciones 5 días antes de cumplirse el mes** (recordatorio preventivo tanto al dueño como al cliente).
- **Alertas de SOAT y Tecnomecánica próximos a vencer** (para inventario propio y garantías prendarias).
- Reportes especializados de empeño: intereses ganados, capital prestado y cartera en riesgo.

---

### DN2. Tasa de interés — decisión de negocio y estado en base de datos

#### Política de negocio innegociable
1. **La tasa de interés NO es fija por política del negocio.** El dueño de la compraventa negocia la tasa caso por caso con cada cliente según el bien entregado en garantía, el monto solicitado y el perfil de riesgo.
2. **El campo `tasa_interes` vive en el contrato (`empenos.tasa_mensual`), NO en la configuración del tenant.**
3. **Se congela al momento de crear el contrato.** Cualquier cambio posterior en tasas de referencia o acuerdos con otros clientes no afecta los contratos ya pactados.
4. **Ingreso manual obligatorio:** El dueño ingresa la tasa manualmente al crear cada empeño. La aplicación no debe sugerir ni imponer valores por defecto.
5. **NUNCA introducir una tasa "global" o "por defecto" en `tenants` que se herede a nuevos contratos.** Si en el futuro se llega a habilitar algún valor de sugerencia, debe ser únicamente un valor orientativo opcional en el formulario web, 100% editable siempre.

#### Verificación en base de datos Neon (MCP / SQL) y deuda técnica detectada
Se verificó la estructura real en Neon Postgres:
- **En la tabla de contratos (`empenos`):** ✅ Existe `tasa_mensual` (`bigint NOT NULL`), almacenada independientemente en cada contrato individual.
- **En la tabla `tenants`:** ⚠️ Existe actualmente `tasa_mensual_defecto` (`integer DEFAULT 10 NOT NULL`) junto con el check `tenants_tasa_check`. En el código actual, `tasaDefecto()` consulta este campo y `FormularioNuevoEmpeno` lo precarga como `defaultValue={tasaDefecto}`.
- **Deuda / Migración requerida (a ejecutar en Bloque 2.5):**
  - Nueva migración SQL para eliminar la columna `tasa_mensual_defecto` y la restricción `tenants_tasa_check` de la tabla `tenants`.
  - Quitar la función `tasaDefecto()`.
  - Dejar el campo de tasa del formulario de nuevo empeño completamente VACÍO (sin `defaultValue`), requiriendo que el dueño digite explícitamente el porcentaje negociado para cada contrato.


---

### DN3. Categorización de gastos simplificada + operativos

La categorización actual de la tabla `gastos` tiene un constraint genérico con 8 categorías fijas (`reparacion`, `repuestos`, `tramites`, `transporte`, `publicidad`, `nomina`, `arriendo`, `otro`) sin discriminar si el gasto está imputado a una moto vendible o a la operación general del local.

Se simplifica la categorización según si `moto_id` es nulo o no:

1. **Gastos por moto (`moto_id` NO nulo):**
   - `repuestos`
   - `otros`
2. **Gastos operativos (`moto_id` NULO):**
   - `arriendo`
   - `servicios` (luz, agua, internet, teléfono, etc.)
   - `otros`

#### Acción requerida (migración):
Nueva migración SQL que reemplace `gastos_categoria_check` por un constraint condicional y adapte los tipos en Drizzle/Zod:
```sql
ALTER TABLE "gastos" DROP CONSTRAINT "gastos_categoria_check";
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_categoria_check" CHECK (
  ("moto_id" IS NOT NULL AND "categoria" IN ('repuestos', 'otros'))
  OR
  ("moto_id" IS NULL AND "categoria" IN ('arriendo', 'servicios', 'otros'))
);
```

---

### DN4. Persistencia y costos — política estricta de no purga

#### Política del proyecto
- **Todos los datos se guardan indefinidamente.** Nunca se borran ventas antiguas, clientes históricos ni motos vendidas.
- **Cero riesgo de sobrecosto por almacenamiento:** El negocio puede guardar **20+ años de operación** sin problema de costo en Postgres, dado que **no se almacenan fotos, imágenes ni archivos binarios** (regla 4 del proyecto: solo texto y números estructurados).
- **Trazabilidad histórica completa:** La ficha de una moto vendida hace 2 años debe seguir siendo consultable íntegramente (SOAT, tecnomecánica, historial de reparaciones/gastos, dueño anterior y comprador).
- **Propósito exclusivo de los borrados lógicos (`eliminada_en`):** Los soft deletes existen únicamente para corregir **errores humanos de registro**, jamás para "limpiar" o vaciar la base de datos de operaciones reales.
- **Prohibición absoluta:** **NUNCA** agregar tareas programadas (cron jobs) de purga automática de datos históricos sin aprobación explícita y documentada de la dirección del negocio.

---

### DN5. Login cerrado — solo por invitación

- **No hay registro público:** Eliminar la ruta `/registro` (o `/registrarse`) y el enlace "Crear una" del `/login`.
- **Cuentas creadas exclusivamente por el super admin:** Solo el `super_admin` crea cuentas desde `/admin`. Al crear un usuario, el sistema envía un email con credenciales iniciales y un enlace seguro para establecer contraseña.
- **Copy del login:** Se preserva el copy actual: *"Entra con el correo con el que te habilitó el administrador"*.
- **La landing NO invita a "crear cuenta":** Solo invita a *"Solicitar acceso"*.

---

### DN6. Alta rápida de moto + precio de venta final editable (flujo de venta)

#### Alta rápida de moto (PANEL)
- **Campos mínimos para registrar:** `placa`, `marca`, `modelo`, `anio`, `precio_compra`, `precio_venta`.
- **Campos opcionales editables después:** `color`, `numero_motor`, `numero_chasis`, `cilindraje`, fechas de SOAT y tecnomecánica, datos del proveedor y observaciones.
- **Indicador de ficha incompleta:** La ficha de moto debe indicar visualmente qué campos faltan mediante un badge *"Información incompleta"* con el listado de campos pendientes por diligenciar.

#### Precio de venta final editable en el flujo de venta

> **Estado (Bloque 3):** implementado con la tabla `ventas` (migración 0003):
> `motos.precio_publicado`, `ventas.precio_publicado` / `precio_pactado` y
> `descuento_aplicado` como columna generada. Falta el alta rápida con badge (V6).

---

### DN7. UX del panel `/app` — inicio y accesos rápidos a un toque

- **Auto-redirección / estado inicial:** Si ya hay sesión activa, el primer elemento visible debe llevar directamente al panel (auto-redirect), o mostrar el saludo al dueño con los KPIs del día.
- **Accesos rápidos a un toque:** Las acciones más usadas deben estar a un solo toque desde la pantalla inicial:
  1. *Registrar moto*
  2. *Registrar venta*
  3. *Registrar empeño* (plan Empresa)
  4. *Registrar gasto*
- Cero pasos innecesarios para la operativa habitual del mostrador.

---

### DN8. Landing final — cambios de CTA, instalación PWA y legal minimalista

#### 1. Hero
- Eliminar los dos botones actuales (*"Solicitar una demo"* y *"Ya tengo cuenta"*).
- Agregar **UN solo botón primario grande**: **"Entrar al panel"** que apunte a `/login`.
- Este botón debe ser lo primero que ve el visitante al llegar (protagonismo visual claro).

#### 2. Header
- Reemplazar botón **"INGRESAR"** por un botón **"Descargar app"** que activa la instalación de la PWA:
  - **Android / Chrome:** Disparar evento nativo `beforeinstallprompt`.
  - **iOS / Safari:** Mostrar modal con instrucciones paso a paso (*Compartir → Añadir a pantalla de inicio*).
  - **Desktop / Otros:** Mostrar código QR dinámico con la URL para abrir en celular.
- Renombrar **"PEDIR DEMO"** por **"Solicitar acceso"** y que haga scroll suave al formulario del final de la landing.

#### 3. Formulario de solicitud al final de la landing
- Dos casillas de verificación (checkboxes):
  - ☑ **Acepto la política de tratamiento de datos personales** (obligatorio, validado con Zod).
  - ☐ **Acepto recibir comunicaciones comerciales** (opcional).
- Texto de política minimalista: 1 párrafo conciso, sin letra menuda excesiva.

#### 4. Legal minimalista
- Rutas públicas simples: `/terminos` y `/privacidad`.
- Redacción de 1 página simple para cada una.
- **Disclaimer obligatorio en ambos (texto exacto):**
  > *"Motiapp es una herramienta de gestión. No sustituye la facturación electrónica, la contabilidad oficial ni las obligaciones tributarias del negocio. Cada usuario es responsable del cumplimiento de sus obligaciones legales."*
- Enlaces accesibles desde el footer de la landing y desde el formulario de solicitud.

---

## 🟡 Base de datos

### BD1. Sin `FORCE ROW LEVEL SECURITY`

**Situación.** Las tablas tienen `enable row level security`, no
`force row level security`. Es correcto: el aislamiento se logra separando los
roles (la app usa un rol no dueño), que es el patrón recomendado.

**Riesgo.** Si alguien ejecuta consultas puntuales como dueño —para depurar, por
ejemplo— **verá todos los negocios**. Eso es intencional, pero conviene saberlo.
`conConexionDirecta()` en `src/db/index.ts` existe justo para eso y **no debe
importarse nunca desde código que atienda peticiones**.

### BD2. `contexto_usuario` devuelve una fila sin `limit` determinista

**Situación.** `app.contexto_usuario()` usa `limit 1` sin `order by`. Si por un
error de datos un mismo `auth_user_id` tuviera dos perfiles, la función
devolvería uno cualquiera.

**Mitigación actual.** `usuarios.auth_user_id` tiene un índice único, así que no
puede pasar. **Deuda:** el `limit 1` queda como red de seguridad silenciosa; sería
mejor que un dato así reventara en vez de elegir al azar.

### ~~BD3. `siguienteNumeroEmpeno` puede repetir bajo concurrencia~~ → cerrado con `consecutivos_empeno` (0006, B5.2)

**Situación.** Calcula `max(numero) + 1`. Si dos usuarios registran un empeño al
mismo tiempo, ambos proponen el mismo consecutivo.

**Mitigación actual.** El índice único `(tenant_id, numero)` rechaza al segundo y
`accionCrearEmpeno` traduce el error a "Ese número de empeño ya está en uso". El
dueño escribe otro. Funciona, pero es un tropiezo evitable en un mostrador con dos
personas.

**Mejor solución:** una secuencia por negocio, o un `insert ... on conflict`
reintentando. Se puede posponer: es molesto, no incorrecto.

### BD4. `telefonos_empeno` permite varios IMEI nulos

**Situación.** El índice único `(tenant_id, imei)` no impide varios teléfonos sin
IMEI, porque en SQL `NULL` no es igual a `NULL`.

**Es correcto** para el caso de uso (dos teléfonos distintos sin IMEI anotado son
válidos). Se anota solo para que nadie lo lea como un bug.

### BD5. Sin índices para algunas búsquedas

**Situación.** El buscador de inventario usa `ILIKE '%texto%'`, que **no puede usar
un índice B-tree** y hace un recorrido completo de la tabla.

**Cuándo importa.** Con 4 negocios y cientos de motos cada uno, irrelevante. Con
decenas de miles de filas, se nota.

**Solución cuando haga falta:** la extensión `pg_trgm` con índices GIN sobre
`placa`, `marca`, `modelo` y los nombres.

### BD6. `count(*)` en cada búsqueda paginada

**Situación.** `buscarInventario` y `listarEmpenos` cuentan el total en una
segunda consulta para poder mostrar "Página 3 de 12".

**Cuándo importa.** El conteo recorre todas las filas que cumplen el filtro. Es la
forma correcta de paginar con total, pero no escala a millones de filas.

### BD7. El panel del dueño usa SQL crudo

**Situación.** `src/server/repositorios/panel.ts` usa `sql` crudo en vez del
constructor de Drizzle, porque `generate_series` y `count(*) filter (...)` no se
expresan bien con el constructor.

**Riesgo.** El SQL crudo no está tipado contra el esquema: si se renombra una
columna, **TypeScript no avisa** y el error aparece en tiempo de ejecución. Es el
archivo con más probabilidad de romperse en silencio. Ver B1.

---

## 🟡 Aplicación

### A1. `force-dynamic` en todas las páginas del panel

**Situación.** El panel, el inventario, los empeños y `/admin` usan
`export const dynamic = "force-dynamic"`.

**Por qué.** Dependen de la sesión y de datos que cambian a cada rato, y con
`force-dynamic` es imposible que queden cacheados por accidente.

**Costo.** Cada visita vuelve a consultar todo. Para 4 negocios es correcto y
predecible. **Deuda:** cuando haya más tráfico, evaluar `revalidate` con
invalidación explícita por `revalidateTag` en las Server Actions.

### A2. Sin paginación real en el listado de empeños

**Situación.** `listarEmpenos` recibe `pagina` y `porPagina`, pero la pantalla
**no dibuja controles de paginación**. El inventario sí los tiene.

**Impacto.** Con más de 20 empeños, los sobrantes son invisibles.

### A3. `obtenerEmpeno` hace consultas secuenciales

**Situación.** Consulta el empeño, luego el bien, luego los abonos. Son tres
viajes a la base que podrían ser uno con `join`.

**Impacto.** Menor. Se anota porque es fácil de arreglar al construir la ficha
(M4).

### A4. Manejo de errores sin `error.tsx` ni `not-found.tsx`

**Situación.** Hay `notFound()` en la ficha de la moto, que usa el 404 por
defecto de Next. No hay pantallas de error propias.

**Impacto.** Un fallo de base de datos muestra la pantalla genérica de Next en
inglés. Para un producto en español, no da la talla.

**Falta:** `error.tsx` en `/app` y en `/admin`, y `not-found.tsx` con un mensaje
útil.

### A5. Sin límite de tasa en el formulario público de demo

**Situación.** `enviarSolicitudDemo` es una Server Action pública. Cualquiera
puede enviarla en bucle.

**Impacto.** Llena `solicitudes_demo` de basura. No es grave, pero es gratis
evitarlo.

**Solución.** Un límite por IP —Vercel KV o Upstash— o un campo trampa (honeypot)
más una comprobación de tiempo mínimo de llenado. El honeypot es lo más simple y
no agrega dependencias.

### A6. Cobertura de pruebas: falta ejecutarlas y falta cubrir más

**Lo que ya hay.** 90 pruebas del dominio (`pnpm test`) en `src/domain/__pruebas__/`:
cálculo de intereses, saldos, reparto de abonos, estados por fecha, ganancia,
margen, rotación de inventario y todas las validaciones Zod. Más 21 pruebas de
aislamiento RLS escritas y listas, que se saltan sin credenciales.

Ya rindieron: encontraron tres bugs reales. Ver C1.

**Lo que falta:**

1. **Ejecutar las pruebas de aislamiento contra Neon.** Ver B1. Escritas no es lo
   mismo que verificadas.
2. **Pruebas de las Server Actions.** Hoy la validación con Zod se prueba a nivel
   de esquema, pero no el camino completo: acción → autorización → repositorio →
   traducción de errores de Postgres. `accionCrearMoto` tiene lógica propia
   (el mapeo de `unique_violation` a "Ya tienes una moto con esa placa") que no
   está probada.
3. **Pruebas de los repositorios contra la base.** `buscarInventario` arma una
   consulta con ocho filtros combinables; es el tipo de código donde un `and`
   mal puesto no se nota hasta que un dueño busca y no encuentra lo que sí tiene.
4. **Un caso que falta en el dominio:** `interesCausado` con un abono parcial de
   por medio. El saldo se recalcula sobre el capital vigente, y hay una prueba de
   eso, pero no del caso en que el abono ocurre *después* de causarse el interés.

**Nota sobre el entorno.** Vitest necesita el servicio de esbuild, que lanza un
proceso hijo. En entornos confinados que bloquean eso, `pnpm test` falla con
`spawn EPERM` antes de correr nada. En una máquina normal, o en CI, no hay
problema. Si te topas con eso, corre las pruebas fuera del confinamiento.

### A7. `comoRuta()` es un escape de tipos

**Situación.** `src/lib/rutas.ts` convierte un `string` en `Route` con un `as`.
Existe porque `typedRoutes` está activado y las URLs armadas en tiempo de
ejecución (la paginación con filtros) no son literales.

**Riesgo.** Si el `string` tiene un error de tipeo, TypeScript no lo detecta. Está
concentrado en una sola función a propósito —mejor un punto de conversión que
`as Route` repartido por toda la interfaz— pero sigue siendo un hueco.

### A8. Props de página tipadas a mano en vez de `PageProps<T>`

**Situación.** Las páginas declaran `props: { searchParams: Promise<...> }` en
lugar de usar el tipo global `PageProps<"/app">` que trae Next 16.

**Por qué.** `PageProps` solo existe después de que corra `next typegen` o
`next dev`. Si alguien clona el repositorio y corre `pnpm typecheck` antes de
`pnpm install && pnpm dev`, obtiene errores que no significan nada.

**Deuda.** Cuando el equipo esté cómodo con el flujo, migrar a `PageProps<T>` da
tipado más preciso en `params` y `searchParams`. Los tipos explícitos que hay
ahora son idénticos en forma, solo menos precisos.

---

## 🟡 Dependencias y herramientas

### H1. `@neondatabase/auth` va en una versión que exige Next ≥16

**Situación.** `@neondatabase/auth@0.6.0-beta` declara `next >= 16.0.0`. Es la
razón del cambio de Next 15 a 16 (ver `ESTRUCTURA.md` §1).

**Riesgo.** El SDK está en versión **beta** y arrastra un conflicto de peers sin
resolver dentro de un subpaquete opcional:

```
@neondatabase/auth-ui 0.4.0-beta → @daveyplate/better-auth-ui 3.4.0
  → @better-auth/api-key 1.7.10  ✕ unmet peer better-auth@^1.7.10 (found 1.7.6)
```

**Por qué no se rompe nada hoy.** El proyecto **no usa `@neondatabase/auth-ui`**:
la interfaz de acceso se escribió a mano con Server Actions. El conflicto está en
un paquete que ni se importa.

**Riesgo real.** Neon Auth es un servicio administrado en beta. Antes de meter
datos de clientes reales conviene confirmar con Neon la ruta de salida: qué pasa
si el servicio cambia de API o de precio. Los usuarios viven en **tu** Postgres,
lo cual ayuda mucho — la contraseña hasheada está en `neon_auth.account` — pero
migrar a Better Auth autoalojado sería trabajo.

### H2. `debug` y `ms` instalados a mano

**Situación.** ESLint 9 no resuelve `debug` bajo el `node_modules` estricto de
pnpm, así que `debug@4.4.3` está en `devDependencies`. Es un parche de
herramientas, no una dependencia del producto.

**Deuda.** Si ESLint actualiza su árbol de dependencias, revisar si sigue haciendo
falta.

### H3. Cachés de pnpm dentro del workspace

**Situación.** `.npmrc` apunta `store-dir`, `cache-dir` y `state-dir` a carpetas
dentro de `C:\Motiapp` (`.pnpm-store/`, `.pnpm-cache/`, `.pnpm-state/`) porque el
sandbox de este entorno no permite escribir en `AppData`.

**Deuda.** Es una decisión del entorno de desarrollo, no del proyecto. En otra
máquina conviene volver a las rutas por defecto, o dejar el `.npmrc` fuera del
control de versiones. Las tres carpetas están en `.gitignore`.

### H4. TanStack Query, TanStack Table y React Hook Form sin usar

**Situación.** Las tres están instaladas y ninguna se usa todavía. El detalle y la
justificación están en `ESTRUCTURA.md` §8.

**Deuda.** Son tres dependencias que hoy no aportan nada. La decisión a revisar:

- **React Hook Form** — lo más probable es que se adopte al construir los
  formularios de edición (M10), porque valida mientras el usuario escribe.
- **TanStack Table** — se justifica solo cuando haga falta ordenar por columna o
  elegir columnas visibles. Las tablas actuales son listas.
- **TanStack Query** — la menos probable con Server Components. Si en tres meses
  no se usó, **desinstalarla**.

### H5. Sin `next.config.ts` con cabeceras de seguridad

**Situación.** `next.config.ts` solo tiene `typedRoutes: true`.

**Falta.** Cabeceras de seguridad: `Content-Security-Policy`,
`X-Content-Type-Options`, `Referrer-Policy` y `Strict-Transport-Security`. Next
tiene guía de CSP en la documentación incluida. `poweredByHeader: false` también.

### H6. `cacheComponents` desactivado

**Situación.** Next 16 trae `cacheComponents` (Cache Components / PPR) estable y
**está apagado a propósito**.

**Por qué apagado.** Activarlo no es un cambio de bandera: obliga a envolver
`cookies()`, `headers()` y `searchParams` en `<Suspense>`, prohíbe exportar
`dynamic`/`revalidate`/`fetchCache`, y convierte en **error de build** cosas
inocentes como `new Date()` durante el prerender. En un panel que depende de la
sesión en cada página, el trabajo es considerable y el beneficio es menor: casi
todo es dinámico de todos modos.

**Cuándo revisarlo.** Cuando haya tráfico suficiente para que la landing pública
importe. Ahí sí: la landing es estática y cachearla tiene valor real.

---

## 🟢 Detalles menores

### m1. `DIRECCION` del negocio no se captura en el formulario de compra

El esquema de `clientes` tiene `direccion` y `ciudad`, pero el formulario de
empeño no los pide. Se pueden agregar sin migración.

### m2. Sin `README.md`

El proyecto no tiene README. `ESTRUCTURA.md` cubre el arranque, pero un README
corto apuntando ahí sería lo esperado al abrir el repositorio.

### m3. Accesibilidad sin verificar

Hay algunas cosas bien hechas: `aria-invalid` en los campos con error, `role="alert"`
en los mensajes, etiquetas asociadas con `htmlFor`, y alturas de 44px para el
pulgar. **Falta verificar:** contraste de los colores personalizados (`--exito`,
`--alerta`), navegación completa con teclado, y anuncio de errores por lector de
pantalla.

### m4. Tema oscuro sin interruptor

`globals.css` define el tema oscuro, pero depende de la clase `.dark` en `<html>`
y **nadie la pone**: solo responde a `prefers-color-scheme` si el sistema lo
activa. Falta el interruptor manual, o quitar las variables oscuras para no
mantener código muerto.

### m5. Números telefónicos colombianos fijos en el código

`telefonoSchema` en `src/domain/comun.ts` exige 10 dígitos y quita el indicativo
57. Es correcto para Colombia. Si el producto sale del país, esto hay que
parametrizarlo.

### m6. `formatearPorcentaje` usa coma decimal

`Intl.NumberFormat("es-CO")` produce `12,5 %`. Es correcto en español y puede
confundir si algún día se exporta a CSV que se abra en Excel con configuración
regional en inglés.

### m7. Sin `loading.tsx`

Las transiciones entre páginas no muestran nada mientras cargan. Con consultas
rápidas no se nota; con la base remota y una conexión lenta del local, sí.
`loading.tsx` con esqueletos resuelve esto y es barato.

---

## 📋 Orden actualizado del backlog

El orden prioritario de implementación ajustado con las nuevas decisiones es:

1. **Bloque 1.5 — Auth cerrado (solo invitación):**
   - Eliminar registro público (`/registrarse` o `/registro`) y el enlace "Crear una" del `/login`.
   - Creación de usuarios exclusivamente desde `/admin` por el super_admin, con envío de email con credenciales iniciales y enlace para cambiar contraseña.
   - Mantener el copy de login: *"Entra con el correo con el que te habilitó el administrador"*.
   - Landing orientada exclusivamente a "Solicitar acceso". Auto-redirect si hay sesión activa.

2. **Bloque 2.5 — Inversión y devoluciones:**
   - **Estado `en_preparacion` en motos:** Regla de negocio: toda moto recién comprada entra automáticamente en estado `en_preparacion` (alistamiento, revisión mecánica, papeles). Solo desde `en_preparacion` puede pasar a `disponible`.
   - **Categorización simplificada de gastos:** `repuestos` y `otros` para gastos por moto (`moto_id` no nulo) vs. `arriendo`, `servicios` y `otros` para operativos (`moto_id` nulo), con nuevo constraint `CHECK`.
   - **Migración para eliminar `tenants.tasa_mensual_defecto`:** Quitar la columna, el CHECK `tenants_tasa_check` y la función `tasaDefecto()`. Dejar el campo de tasa del formulario de nuevo empeño completamente VACÍO.
   - **Estados de inventario y flujo de devoluciones:** Estados `en_preparacion`, `disponible`, `reservada`, `en_reparacion`, `vendida`, `devuelta`, `dada_de_baja`. Flujo completo de devolución de ventas con reingreso a stock y reversión de utilidades.


3. ✅ **Bloque 3 — Ventas (incluye alta rápida de moto y precio pactado):** completado (salvo alta rápida, V6).
   - **Alta rápida de moto:** registro con solo campos mínimos obligatorios (`placa`, `marca`, `modelo`, `anio`, `precio_compra`, `precio_venta`). Resto de campos opcionales con badge *"Información incompleta"* en la ficha.
   - **Precio de venta final editable:** campo editable precargado con `precio_venta`, guardado de `precio_venta_pactado` en la venta, conservación del `precio_venta` original en moto, cálculo de ganancia real sobre precio pactado y campo `descuento_aplicado`.
   - Tabla propia `ventas` desacoplada.
   - Devoluciones y recibo de venta en PDF descargable.
   - **Estado tras el Bloque 3:** hecho tabla `ventas`, precio publicado/pactado con
     descuento, recibo PDF, historial y ganancia por período. Devoluciones hechas (V1).
     Pendiente: alta rápida con badge (V6).

4. ✅ **Bloque 4 — Clientes:** completado (ver «Cerrado: Bloque 4»).
   - Listado y búsqueda unificada de clientes con paginación.
   - Ficha integral con historial consolidado (compras, ventas y empeños).
   - Edición de clientes y libreta de contactos.

5. ✅ **Bloque 5 — Dashboard Empresa (incluye UX a un toque):** hecho lo pedido (KPIs, gráficas 7/30/90, alertas de vencidos y stock +60 días, accesos rápidos). **Pendiente:** notificaciones 5 días antes (M6: requiere correo/WhatsApp) y alertas de SOAT/tecnomecánica (no hay columnas de esas fechas: migración nueva). Ver D5-1 a D5-3.
   - **UX del panel `/app`:** saludo al dueño con KPIs del día y accesos directos a un toque (registrar moto, venta, empeño, gasto).
   - Métricas clave de empeños: intereses ganados, capital prestado activo, cartera en riesgo.
   - Alertas de vencimiento de empeños en tiempo real.
   - Notificaciones con 5 días de anticipación al cumplimiento del mes (dueño y cliente).
   - Alertas preventivas de vencimiento de SOAT y Tecnomecánica para inventario y garantías prendarias.

6. **Bloque 6 — Reporte mensual:**
   - Reporte consolidado financiero mensual: ingresos por ventas e intereses, egresos operativos y compras, utilidad neta real y analítica de descuentos aplicados.

7. ✅ **Bloque 7 — Sistema de planes:** hecho con los valores actuales del esquema (`basico` = Negociante, `pro` = Empresa); no se renombraron en la base.
   - Campo `plan` (`negociante` / `empresa`) en tenants y sesión.
   - Guards / middleware de protección de rutas según plan activo.
   - Dashboard y navegación condicional (módulo de empeños oculto e inaccesible para Negociante).
   - Aplicación estricta de la regla de balance (sin límites artificiales de inventario o clientes en Negociante).

8. ✅ **Bloque 8 — Panel Super Admin:** hecho, salvo la invitación por correo: hoy el dueño se crea en Neon Auth y se asigna por correo desde `/admin`.
   - Gestión completa de compraventas (`tenants`) desde `/admin`: creación, cambio de plan y suspensión.
   - Creación de usuarios vinculada a la invitación por email del Bloque 1.5.
   - Supresión definitiva de la necesidad de usar el SQL Editor de Neon para dar de alta negocios.
   - Trazabilidad y auditoría básica.

9. ✅ **Bloque 9 — Landing final (CTA, PWA, legal y planes):** completo, salvo el QR de escritorio (ver «ronda final»).
   - **Hero:** UN solo botón primario grande *"Entrar al panel"* (`/login`).
   - **Header:** botón *"Descargar app"* (PWA multi-plataforma: Android `beforeinstallprompt`, modal iOS, QR en Desktop) y *"Solicitar acceso"* con scroll suave al formulario.
   - **Formulario de solicitud:** checkboxes con validación Zod (tratamiento de datos obligatorio, comunicaciones opcional) y texto minimalista de política.
   - **Legal minimalista:** rutas `/terminos` y `/privacidad` con el disclaimer legal obligatorio exacto.
   - **Tabla de planes:** actualización de `src/components/landing/planes.tsx` con planes Negociante / Empresa y matriz de features real.

---

### Tareas de infraestructura transversales

- **B1:** Aplicar esquema y migraciones en la rama `production` de Neon (sigue vacía) antes del primer cliente real.
- **Migración tasa en tenants:** Eliminación de `tasa_mensual_defecto` y neutralización en formulario de empeños asignada explícitamente al Bloque 2.5.

## ✅ Bloque 5.5 — Pulido de UX y Empeños (completo)

**Estado (21 oct 2026):** B5.1 a B5.5 hechos y probados; detalle y desvíos en
«Cerrado: ronda final». Lo de abajo es el pedido original, como referencia.

**Estado (20 oct 2026):** Se recibieron feedbacks de UX y funcionalidad del dueño del producto. El software está al 85% funcional, pero requieren pulir estos detalles antes de lanzar.

### B5.1 Buscador en formulario de ventas (Combobox)
- Actualmente el formulario usa un `<select>` estándar para elegir la moto. Se cambiará por un Combobox con búsqueda usando `shadcn/ui` `Command` y `Popover`. Debe permitir buscar por placa, marca o modelo. Al seleccionar, se actualizarán los datos de la moto.

### B5.2 Número de empeño automático
- Se eliminará el input manual de `numero_empeno` en el formulario de nuevo empeño. Se creará una migración `0005_numero_empeno.sql` que genere un secuencial automático por cada tenant (ej. EMP-0001, EMP-0002), ya sea con una secuencia en Postgres o calculando el MAX + 1 en una transacción.

### B5.3 Nuevo tipo de bien empeñado: "Otros"
- Se agregará la opción `otro` al enum de `tipo_bien` mediante migración SQL para actualizar el CHECK o enum. Se actualizará el dominio y los formularios.

### B5.4 Campos condicionales según tipo de bien
- Si el tipo de bien es `moto` o `carro`: mantener los campos actuales (placa, motor, chasis, marca, modelo, año).
- Si es `telefono`: mantener IMEI, marca, modelo.
- Si es `otro`: hacer todos los campos técnicos (placa, motor, chasis, IMEI) **opcionales**. Solo requerir `descripcion` (texto obligatorio para saber qué es) y `valor_tasacion`.

### B5.5 Mejora visual (UI Polish) aplicando principios de Emil Kowalski
- Mantener la estructura actual, pero eliminar la sensación de "hoja en blanco con letras".
- Usar fondos sutiles (`bg-slate-50` o similar) para el fondo general de la página.
- Usar `Card` de shadcn con bordes sutiles (`border-border`) y sombras suaves (`shadow-sm`) para encapsular las secciones de los formularios.
- Agregar separadores visuales (`Separator`) entre secciones (ej. entre "El comprador" y "El precio").
- Ajustar el espaciado (`gap`, `padding`) para que respire mejor.
- Mejorar los botones de acción primarios (ej. "Confirmar venta") con un hover sutil y transiciones.

