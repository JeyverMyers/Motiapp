# Lanzamiento a producción

Pasos en orden para poner Motiapp en línea y entregarle el acceso a un cliente.
Lo que dice **[tú]** necesita tu cuenta (Neon, GitHub, Vercel, dominio); el
resto son comandos de este repositorio. Calcula 45–60 minutos la primera vez.

> Nunca pegues contraseñas ni cadenas de conexión en el chat, en un commit ni en
> un archivo distinto de `.env.produccion` (que ya está en `.gitignore`).

---

## 1. Base de datos de producción (Neon)

1. **[tú]** En la consola de Neon, proyecto `raspy-butterfly-37978462`, rama
   **`production`** → pestaña **Auth** → activar **Neon Auth**. Tiene que ser
   ANTES de migrar.
2. **[tú]** En esa misma pestaña, en dominios de confianza, agregar el dominio
   donde va a vivir la app (p. ej. `https://motiapp.co` y el de Vercel,
   `https://motiapp.vercel.app`).
3. Crear el archivo `.env.produccion` en la raíz (no se sube a git) con:

   ```ini
   # Rol dueño, host DIRECTO (sin -pooler). Neon → production → Connect → rol neondb_owner
   DATABASE_URL_MIGRACIONES=postgresql://neondb_owner:...@ep-....neon.tech/neondb?sslmode=require
   # Neon → production → Auth → Configuration
   NEON_AUTH_BASE_URL=https://...
   # El dominio público de la app
   NEXT_PUBLIC_URL_SITIO=https://motiapp.co
   # Contraseña nueva para el rol de la app (ver abajo cómo generarla)
   MOTIAPP_APP_PASSWORD=...
   ```

   Para generar `MOTIAPP_APP_PASSWORD` (cópiala al archivo, no la compartas):

   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
   ```

4. Ver qué se va a aplicar (no toca nada):

   ```bash
   pnpm prod:migrar
   ```

   Debe listar `0000` a `0007`. Si dice otra base, revisa el archivo.

5. Aplicar las migraciones y fijar la contraseña del rol de la app:

   ```bash
   pnpm prod:migrar --aplicar
   ```

6. Comprobar que RLS quedó bien (debe terminar sin errores):

   ```bash
   node --env-file=.env.produccion scripts/verificar-base.mjs
   ```

7. Crear tu cuenta de super administrador (imprime la contraseña UNA vez):

   ```bash
   pnpm prod:alta-usuario tu-correo@dominio.com "Tu Nombre" --super-admin
   ```

8. Armar la cadena de la app para Vercel: mismo host pero **con `-pooler`**,
   usuario `motiapp_app` y la contraseña del paso 3:

   ```
   postgresql://motiapp_app:<MOTIAPP_APP_PASSWORD>@ep-...-pooler.<región>.aws.neon.tech/neondb?sslmode=require
   ```

---

## 2. Código en GitHub

1. **[tú]** Crear un repositorio **privado** en GitHub (p. ej. `motiapp`).
2. Subir el código (el `.gitignore` ya excluye `.env*`, `node_modules`,
   `_pendiente` y las cachés):

   ```bash
   git init
   git add .
   git commit -m "chore: primera versión de Motiapp"
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/motiapp.git
   git push -u origin main
   ```

   Antes del `commit`, revisa con `git status` que no aparezca ningún `.env`.

---

## 3. Vercel

1. **[tú]** En Vercel (equipo «jeyvermyers' projects») → **Add New → Project** →
   importar el repositorio. Framework: Next.js (lo detecta solo).
2. **Variables de entorno** (Production):

   | Variable | Valor |
   |---|---|
   | `MOTIAPP_DATABASE_URL` | la cadena del paso 1.8 (`motiapp_app`, con `-pooler`). Va en una variable propia porque la integración de Neon controla `DATABASE_URL` con el rol dueño |
   | `NEON_AUTH_BASE_URL` | la de la rama `production` |
   | `NEON_AUTH_COOKIE_SECRET` | **una nueva**, no la de desarrollo: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
   | `NEXT_PUBLIC_URL_SITIO` | `https://motiapp.co` (o el dominio de Vercel mientras tanto) |
   | `EMAIL_SOPORTE` | el correo de soporte |

   **No** pongas `DATABASE_URL_MIGRACIONES` ni las `SEED_*` en Vercel: la app no
   las necesita y el rol dueño se salta el aislamiento entre negocios.
3. Deploy. Si el build falla por una variable, el mensaje dice cuál.
4. **[tú]** Dominio propio (opcional para mañana): Vercel → Settings → Domains.
   Si lo agregas, actualiza `NEXT_PUBLIC_URL_SITIO` y los dominios de confianza
   de Neon Auth (paso 1.2), y vuelve a desplegar.

---

## 4. Prueba de humo en producción (10 minutos)

1. Abrir el sitio: la landing carga; `/terminos` y `/privacidad` también.
2. `/login` con tu cuenta de super admin → te lleva a `/admin`.
3. **Nuevo negocio** con los datos del cliente. Plan **Empresa** si presta con
   empeño, **Negociante** si solo compra y vende. Estado **Activo**.
4. En la ficha del negocio → **Dar acceso** con el correo y nombre del dueño.
   Copia la **contraseña temporal** que aparece: no se vuelve a mostrar.
   - Si dice «Ya existe una cuenta con ese correo», **no marques la casilla**
     salvo que sepas por qué existe: alguien pudo crearla.
5. En una ventana privada, entra como el dueño: registra una moto de prueba y
   bórrala o márcala de baja.
6. Vuelve a `/admin` y revisa `/admin/auditoria`: deben estar el alta del
   negocio y la asignación del dueño.

---

## 5. Entrega al cliente

- Envíale por un canal privado (WhatsApp directo, no un grupo): el enlace, su
  correo y la contraseña temporal.
- «¿Olvidaste tu contraseña?» manda un correo desde Neon Auth: **pruébalo una
  vez en producción** con tu cuenta antes de prometérselo al cliente. Si no
  llega, por ahora la salida es crearle otra cuenta con otro correo.
- Para instalarla en el celular: abrir el sitio → «Descargar app».

## Si algo sale mal

- **No puede entrar y el negocio está activo:** en `/admin` → el negocio →
  revisa que el usuario tenga acceso activo.
- **«Algo salió mal» con un código:** búscalo en Vercel → el proyecto → Logs.
- **Suspender por falta de pago:** `/admin` → el negocio → «Suspender». No se
  borra nada; «Reactivar» lo devuelve.
