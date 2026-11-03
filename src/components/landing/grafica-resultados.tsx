"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

/**
 * Gráfica de ejemplo (animación 2): las barras crecen desde cero la primera vez
 * que la gráfica entra en pantalla.
 *
 * El truco es no montar Recharts hasta que se vea: su animación de entrada
 * corre al montarse, así que basta un `IntersectionObserver` que la monte en el
 * momento justo. Mientras tanto se reserva el mismo alto para que la página no
 * salte (CLS).
 *
 * Los datos son ilustrativos y así se rotula en pantalla: la landing nunca
 * muestra datos de un negocio real.
 */
const DATOS = [
  { mes: "May", ganancia: 3.1 },
  { mes: "Jun", ganancia: 4.2 },
  { mes: "Jul", ganancia: 3.6 },
  { mes: "Ago", ganancia: 5.4 },
  { mes: "Sep", ganancia: 4.8 },
  { mes: "Oct", ganancia: 6.3 },
];

/** Los seis colores de sticker, uno por barra: ninguno manda sobre los demás. */
const COLORES = ["#4da2ff", "#55db9c", "#e9ccff", "#fb4903", "#ffd731", "#5c4ade"];

const ALTO = 320;

function suscribirMovimiento(avisar: () => void) {
  const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

function quiereMenosMovimiento() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function GraficaResultados() {
  const contenedor = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const menosMovimiento = useSyncExternalStore(suscribirMovimiento, quiereMenosMovimiento, () => false);

  useEffect(() => {
    const elemento = contenedor.current;
    if (!elemento) return;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) {
          setVisible(true);
          observador.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={contenedor}
      role="img"
      aria-label="Gráfica de ejemplo: ganancia mensual de un negocio ficticio, de 3,1 millones en mayo a 6,3 millones en octubre."
      style={{ height: ALTO }}
    >
      {visible ? (
        <ResponsiveContainer width="100%" height={ALTO}>
          <BarChart data={DATOS} margin={{ top: 28, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="#000" strokeOpacity={0.12} />
            <XAxis
              dataKey="mes"
              axisLine={{ stroke: "#000" }}
              tickLine={false}
              tick={{ fill: "#000", fontSize: 13, fontWeight: 700 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#000", fontSize: 12, fontWeight: 500 }}
              tickFormatter={(valor: number) => `${valor} M`}
            />
            <Bar
              dataKey="ganancia"
              radius={[14, 14, 0, 0]}
              stroke="#000"
              strokeWidth={1}
              isAnimationActive={!menosMovimiento}
              animationDuration={1100}
              animationEasing="ease-out"
            >
              {DATOS.map((dato, indice) => (
                <Cell key={dato.mes} fill={COLORES[indice % COLORES.length]} />
              ))}
              <LabelList
                dataKey="ganancia"
                position="top"
                formatter={(valor) => String(valor).replace(".", ",")}
                style={{ fill: "#000", fontSize: 12, fontWeight: 700 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
