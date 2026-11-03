import { fuenteDisplay, fuenteUi } from "@/components/landing/fuentes";
import { Funciones } from "@/components/landing/funciones";
import { Hero } from "@/components/landing/hero";
import { Marquesina } from "@/components/landing/marquesina";
import { Navegacion } from "@/components/landing/navegacion";
import { Pie } from "@/components/landing/pie";
import { Planes } from "@/components/landing/planes";
import { Resultados } from "@/components/landing/resultados";
import { SeccionDemo } from "@/components/landing/seccion-demo";

/**
 * Landing pública, con el sistema visual «Slush».
 *
 * Regla dura: aquí NO se muestra inventario, empeños, clientes ni ningún dato de
 * negocio. Solo qué hace el software y cómo pedir acceso. La gráfica usa datos
 * de ejemplo y lo dice en pantalla.
 *
 * Es un Server Component. Solo son de cliente la gráfica (mide su contenedor y
 * se monta al verse) y el formulario de demo. La moto y la marquesina son CSS.
 *
 * Las bandas de color se alternan como pide el sistema: azul cielo, blanco,
 * gris, azul cielo, blanco. El fondo raíz es azul cielo para que la franja de la
 * navegación (que flota, sin fondo propio) empalme con el hero.
 */
export default function LandingPage() {
  return (
    <div
      className={`${fuenteDisplay.variable} ${fuenteUi.variable} flex min-h-dvh flex-col bg-sky-wash font-ui text-carbon`}
    >
      <Marquesina />
      <Navegacion />
      <main className="flex-1">
        <Hero />
        <Funciones />
        <Resultados />
        <Planes />
        <SeccionDemo />
      </main>
      <Pie />
    </div>
  );
}
