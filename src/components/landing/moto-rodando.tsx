/**
 * Moto que rueda bajo el titular (animación 1).
 *
 * Es CSS puro (`globals.css`: `.carril-moto`, `.moto-rodando`): no envía ni un
 * byte de JavaScript y por eso sigue siendo un Server Component. Solo se anima
 * `transform` —el avance, el vaivén del chasis y el giro de las ruedas—, que el
 * navegador resuelve en la GPU sin recalcular el layout. Con
 * `prefers-reduced-motion` la moto aparece estacionada.
 */
export function MotoRodando() {
  return (
    <div
      className="carril-moto relative h-20 overflow-hidden border-b border-carbon sm:h-32"
      aria-hidden="true"
    >
      <div className="moto-rodando absolute bottom-0 left-0">
        <svg viewBox="0 0 180 112" className="block w-full" focusable="false">
          <g className="cuerpo-moto">
            {/* Basculante y escape */}
            <path d="M44 84 L80 62" stroke="#000" strokeWidth="6" strokeLinecap="round" />
            <path d="M56 74 L96 78" stroke="#000" strokeWidth="7" strokeLinecap="round" />
            {/* Motor */}
            <rect x="72" y="52" width="32" height="20" rx="7" fill="#5c4ade" stroke="#000" strokeWidth="3" />
            {/* Tanque y carenado */}
            <path
              d="M68 50 Q76 28 104 30 L124 46 Q112 54 96 54 Z"
              fill="#fb4903"
              stroke="#000"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Sillín */}
            <path d="M44 46 Q52 38 72 42 L70 52 L48 54 Z" fill="#000" />
            {/* Barra y manubrio */}
            <path d="M124 46 L142 84" stroke="#000" strokeWidth="6" strokeLinecap="round" />
            <path d="M118 28 L128 22 L138 25" fill="none" stroke="#000" strokeWidth="5" strokeLinecap="round" />
            {/* Farola */}
            <circle cx="132" cy="38" r="7" fill="#ffd731" stroke="#000" strokeWidth="3" />
            {/* Guardabarros */}
            <path d="M120 64 Q142 54 162 70" fill="none" stroke="#000" strokeWidth="4" strokeLinecap="round" />
          </g>
          <Rueda cx={44} />
          <Rueda cx={142} />
        </svg>
      </div>
    </div>
  );
}

function Rueda({ cx }: { cx: number }) {
  return (
    <g className="rueda">
      <circle cx={cx} cy={84} r={23} fill="#fff" stroke="#000" strokeWidth="5" />
      <path
        d={`M${cx - 15} 84 H${cx + 15} M${cx} 69 V99 M${cx - 11} 73 L${cx + 11} 95 M${cx + 11} 73 L${cx - 11} 95`}
        stroke="#000"
        strokeWidth="2.5"
      />
      <circle cx={cx} cy={84} r={7} fill="#ffd731" stroke="#000" strokeWidth="2.5" />
    </g>
  );
}
