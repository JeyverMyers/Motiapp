import { ImageResponse } from "next/og";

import { EscudoMotiapp } from "@/components/marca/escudo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícono para «Añadir a pantalla de inicio» en iPhone (iOS redondea las esquinas). */
export default function IconoApple() {
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
        <EscudoMotiapp ancho={112} />
      </div>
    ),
    size,
  );
}
