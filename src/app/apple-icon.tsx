import { ImageResponse } from "next/og";

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
          background: "#1c1917",
        }}
      >
        <div
          style={{
            width: 112,
            height: 112,
            borderRadius: 56,
            background: "#ffd731",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 74,
            fontWeight: 800,
            color: "#000000",
          }}
        >
          M
        </div>
      </div>
    ),
    size,
  );
}
