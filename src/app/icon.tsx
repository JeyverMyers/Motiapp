import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/**
 * Ícono de la app (PWA y pestaña), dibujado en el servidor: una «M» amarilla
 * sobre el carbón de la marca. Deja margen para que el recorte «maskable» de
 * Android no se coma la letra.
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
          background: "#1c1917",
        }}
      >
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: 150,
            background: "#ffd731",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 200,
            fontWeight: 800,
            color: "#000000",
            letterSpacing: -8,
          }}
        >
          M
        </div>
      </div>
    ),
    size,
  );
}
