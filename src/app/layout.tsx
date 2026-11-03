import type { Metadata, Viewport } from "next";

import { fuenteUi } from "@/components/landing/fuentes";
import { APP, URL_SITIO } from "@/lib/constantes";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITIO),
  title: {
    default: `${APP.nombre} — Software para negocios de motos y empeño`,
    template: `%s · ${APP.nombre}`,
  },
  description: APP.descripcion,
  applicationName: APP.nombre,
  // La app no debe indexarse salvo la landing; cada panel lo sobreescribe.
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // El dueño usa el celular: el tema sigue al sistema operativo.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`h-full ${fuenteUi.variable}`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
