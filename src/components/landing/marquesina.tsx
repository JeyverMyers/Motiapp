/**
 * Franja negra superior con un mensaje que se repite.
 *
 * Es la única animación que el DESIGN.md contempla. El texto va duplicado para
 * que el bucle no tenga salto: la pista se desplaza la mitad de su ancho y
 * vuelve a empezar justo donde estaba la copia. La copia es decorativa para los
 * lectores de pantalla.
 */
const MENSAJES = [
  "Inventario de motos",
  "Empeños con interés por día",
  "Alerta 7 días antes de vencer",
  "Contratos en PDF",
  "Hecho para el celular",
];

export function Marquesina() {
  const linea = MENSAJES.map((mensaje) => (
    <span key={mensaje} className="flex items-center gap-6 pr-6 whitespace-nowrap">
      {mensaje}
      <span aria-hidden="true">✦</span>
    </span>
  ));

  return (
    <div className="overflow-hidden border-y border-carbon bg-carbon py-2.5 font-ui text-[12px] font-bold uppercase tracking-[0.032em] text-paper-white">
      <div className="marquesina-pista flex w-max">
        <div className="flex">{linea}</div>
        <div className="flex" aria-hidden="true">
          {linea}
        </div>
      </div>
    </div>
  );
}
