/**
 * Stickers decorativos del sistema Slush: figuras planas con borde negro,
 * rellenas con uno de los seis colores, que se pegan torcidas alrededor de los
 * titulares como recortes sobre un tablero.
 *
 * Son decoración pura: `aria-hidden` y sin foco. Sin degradados ni sombras.
 */

type PropsSticker = { className?: string };

const TRAZO = { stroke: "#000", strokeWidth: 2, strokeLinejoin: "round" as const };

/** Moneda: lo que entra a la caja. */
export function StickerMoneda({ className }: PropsSticker) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="46" fill="#ffd731" {...TRAZO} />
      <circle cx="50" cy="50" r="34" fill="none" {...TRAZO} />
      <text x="50" y="67" textAnchor="middle" fontSize="46" className="font-display" fill="#000">
        $
      </text>
    </svg>
  );
}

/** Calendario con un 7: la alerta de vencimiento. */
export function StickerCalendario({ className }: PropsSticker) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <rect x="6" y="12" width="88" height="82" rx="20" fill="#fb4903" {...TRAZO} />
      <path d="M6 38 H94" fill="none" {...TRAZO} />
      <rect x="26" y="4" width="10" height="20" rx="5" fill="#fff" {...TRAZO} />
      <rect x="64" y="4" width="10" height="20" rx="5" fill="#fff" {...TRAZO} />
      <text x="50" y="84" textAnchor="middle" fontSize="44" className="font-display" fill="#000">
        7
      </text>
    </svg>
  );
}

/** Chulo verde: lo que ya cuadró. */
export function StickerCheck({ className }: PropsSticker) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <rect x="6" y="6" width="88" height="88" rx="22" fill="#55db9c" {...TRAZO} />
      <path
        d="M28 52 L44 68 L74 34"
        fill="none"
        stroke="#000"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Billetera violeta: el capital prestado. */
export function StickerBilletera({ className }: PropsSticker) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <path d="M14 22 L66 8 L76 22" fill="#e9ccff" {...TRAZO} />
      <rect x="6" y="20" width="88" height="68" rx="16" fill="#5c4ade" {...TRAZO} />
      <rect x="58" y="42" width="36" height="24" rx="12" fill="#e9ccff" {...TRAZO} />
      <circle cx="70" cy="54" r="5" fill="#ffd731" {...TRAZO} />
    </svg>
  );
}

/** Etiqueta de precio lila: la moto lista para vender. */
export function StickerEtiqueta({ className }: PropsSticker) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <path d="M10 30 Q10 14 26 14 H62 L92 50 L62 86 H26 Q10 86 10 70 Z" fill="#e9ccff" {...TRAZO} />
      <circle cx="30" cy="50" r="8" fill="#fff" {...TRAZO} />
      <path d="M48 40 H72 M48 60 H66" stroke="#000" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
