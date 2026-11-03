"use client";

/**
 * Último recurso: falló el layout raíz, así que no hay estilos ni fuentes.
 * Va con estilos en línea y sin componentes del proyecto.
 */
export default function ErrorGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0 }}>
        <main style={{ textAlign: "center", padding: 16, maxWidth: 360 }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Algo salió mal</h1>
          <p style={{ color: "#555", fontSize: 14 }}>
            Intenta de nuevo en un momento.{error.digest ? ` Código ${error.digest}.` : ""}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 12, padding: "10px 16px", borderRadius: 8, border: 0, background: "#1c1917", color: "#fff", cursor: "pointer" }}
          >
            Intentar de nuevo
          </button>
        </main>
      </body>
    </html>
  );
}
