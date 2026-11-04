/**
 * Marca de MotiApp: escudo negro con filo cobre, la «M» arriba y una moto
 * abajo. Es la versión plana del logo 3D (foto sobre mármol), pensada para
 * verse nítida desde 16 px (pestaña) hasta el ícono del celular.
 *
 * Solo SVG con colores fijos: funciona igual en Server Components, en la
 * landing y dentro de `ImageResponse` (íconos generados).
 */

export const COLOR_COBRE = "#c48a5f";
export const COLOR_ESCUDO = "#1c1917";

export function EscudoMotiapp({
  className,
  titulo,
  ancho,
}: {
  className?: string;
  /** Si el escudo va solo (sin el nombre al lado), su texto para lectores de pantalla. */
  titulo?: string;
  /** Ancho en px; necesario en `ImageResponse`, que no lee clases. */
  ancho?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 72"
      width={ancho}
      height={ancho ? (ancho * 72) / 64 : undefined}
      className={className}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 3.5h54v36.5c0 14.5-11.5 24.5-27 29.5C16.5 64.5 5 54.5 5 40Z"
        fill={COLOR_ESCUDO}
        stroke={COLOR_COBRE}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <path
        d="M15 31V13l17 13 17-13v18"
        fill="none"
        stroke={COLOR_COBRE}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={20} cy={49} r={5.5} fill="none" stroke={COLOR_COBRE} strokeWidth={3} />
      <circle cx={44} cy={49} r={5.5} fill="none" stroke={COLOR_COBRE} strokeWidth={3} />
      <path
        d="M20 49l8-9h9l7 9M28 40l-3-4h-4M37 40l3-5h4"
        fill="none"
        stroke={COLOR_COBRE}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
