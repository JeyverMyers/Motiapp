/**
 * La cinta inflada azul, firma visual del sistema Slush.
 *
 * El original es un render 3D. Aquí es un trazo plano en tres capas —borde
 * negro, cuerpo azul y un brillo blanco desplazado— que da el volumen de tubo
 * inflado sin degradados (el DESIGN.md los prohíbe). Va detrás del titular.
 */
const RECORRIDO =
  "M-60 300 C 140 40, 380 40, 540 200 S 880 400, 1020 210 S 1220 30, 1300 120";

export function Cinta({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1240 420"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={RECORRIDO} fill="none" stroke="#000" strokeWidth="96" strokeLinecap="round" />
      <path d={RECORRIDO} fill="none" stroke="#4da2ff" strokeWidth="92" strokeLinecap="round" />
      <path
        d={RECORRIDO}
        fill="none"
        stroke="#fff"
        strokeOpacity="0.55"
        strokeWidth="10"
        strokeLinecap="round"
        transform="translate(-4 -24)"
      />
    </svg>
  );
}
