/**
 * Constantes del producto. Todo texto de marca sale de aquí para que renombrar
 * el SaaS sea un solo cambio.
 */

export const APP = {
  nombre: "Motiapp",
  descripcion:
    "Software para negocios de compra y venta de motos y de empeño. Inventario, empeños, clientes y reportes en un solo lugar.",
  dominio: "motiapp.co",
  emailSoporte: "soporte@motiapp.co",
  emailRemitente: "Motiapp <notificaciones@motiapp.co>",
} as const;

/**
 * Dirección pública del sitio, sin barra final. En Vercel se fija con
 * `NEXT_PUBLIC_URL_SITIO` (por ejemplo https://motiapp.co); sin ella se asume el
 * dominio de la marca. Se usa en `robots`, `sitemap` y las imágenes sociales.
 */
export const URL_SITIO = (process.env.NEXT_PUBLIC_URL_SITIO ?? `https://${APP.dominio}`).replace(/\/+$/, "");

/** Moneda y formato regionales. El negocio opera en Colombia. */
export const LOCALE = "es-CO";
export const MONEDA = "COP";

/** Zona horaria del negocio; las fechas se calculan en hora local. */
export const ZONA_HORARIA = "America/Bogota";
