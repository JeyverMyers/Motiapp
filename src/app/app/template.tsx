/**
 * Next vuelve a montar `template` en cada navegación (el layout no): por eso
 * aquí vive la única animación del panel, la entrada suave de cada página. Con
 * `prefers-reduced-motion` no se mueve (ver `.entrada-pagina` en globals.css).
 */
export default function Plantilla({ children }: { children: React.ReactNode }) {
  return <div className="entrada-pagina">{children}</div>;
}
