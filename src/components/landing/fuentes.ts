import { Bowlby_One, Inter } from "next/font/google";

/**
 * Fuentes de la landing.
 *
 * El sistema Slush usa Lateral 800 (display) y Aeonik Pro (UI), que son
 * comerciales. El propio documento de diseño propone sustitutos: Bowlby One
 * para el display —gruesa y redonda, se ve «inflada» como los stickers— e
 * Inter para todo lo demás. Bowlby One solo existe en un peso, que ya es el más
 * pesado de la familia; hace el papel del 800.
 *
 * Se exponen como variables CSS y solo se aplican en la landing: el panel del
 * dueño no paga la descarga.
 */
export const fuenteDisplay = Bowlby_One({
  weight: "400",
  // Bowlby One solo publica el subconjunto latino, que ya trae ñ y tildes.
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bowlby",
});

/** Variable (todos los pesos en un archivo): la landing usa 500/700 y el panel 400–600. */
export const fuenteUi = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});
