/**
 * Clases compartidas de la landing (sistema Slush).
 *
 * Botones en píldora con borde negro de 1px. El DESIGN.md pide 10px de relleno
 * vertical; aquí miden 44–48px de alto porque un botón más bajo no se toca bien
 * con el pulgar en el celular (ajuste de accesibilidad, ver DEUDAS.md).
 */
const BASE_BOTON =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-carbon px-6 font-ui text-[13px] font-bold uppercase tracking-[0.032em] transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon";

/** Acción principal: fondo negro. Una por pantalla. */
export const BOTON_LLENO = `${BASE_BOTON} bg-carbon text-paper-white`;

/** Acción secundaria: contorno negro sobre blanco. */
export const BOTON_CONTORNO = `${BASE_BOTON} bg-paper-white text-carbon`;

/** Etiqueta en píldora, como las de los stickers. */
export const PILDORA =
  "inline-flex items-center gap-2 rounded-full border border-carbon bg-paper-white px-4 py-1.5 font-ui text-[12px] font-bold uppercase tracking-[0.032em] text-carbon";

/** Contenedor de sección: ancho máximo de 1440px y respiración lateral. */
export const CONTENEDOR = "mx-auto w-full max-w-[1440px] px-4 sm:px-8";

/** Titular display: Bowlby One con interlineado aplastado (0.8). */
export const DISPLAY = "font-display uppercase leading-[0.8] text-carbon";
