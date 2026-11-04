import { ImageResponse } from "next/og";

import { EscudoMotiapp } from "@/components/marca/escudo";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/**
 * Ícono de la app (PWA y pestaña): el escudo de MotiApp sobre un fondo claro
 * cálido, como el mármol del logo. Deja margen para que el recorte «maskable»
 * de Android no se coma el escudo.
 */
export default function Icono() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f1ed",
        }}
      >
        <EscudoMotiapp ancho={280} />
      </div>
    ),
    size,
  );
}
