"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatearFecha, formatearMoneda } from "@/lib/formato";
import type { PuntoSerie } from "@/server/repositorios/panel";

function abreviar(valor: number): string {
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `${Math.round(valor / 1_000)}k`;
  return String(valor);
}

/**
 * Capital prestado (barras) e intereses cobrados (línea) por día.
 *
 * Van en ejes distintos: los intereses son un orden de magnitud menores que el
 * capital y en el mismo eje la línea quedaría pegada al piso.
 */
export function GraficaEmpenos({ serie }: { serie: PuntoSerie[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="fecha"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickFormatter={(valor: string) => formatearFecha(valor).replace(/ de /g, " ").slice(0, 6)}
          />
          <YAxis
            yAxisId="capital"
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickFormatter={abreviar}
          />
          <YAxis
            yAxisId="intereses"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickFormatter={abreviar}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
            }}
            labelFormatter={(valor) => formatearFecha(String(valor))}
            formatter={(valor, nombre) => [
              formatearMoneda(Number(valor)),
              nombre === "capitalPrestado" ? "Prestado" : "Intereses",
            ]}
          />
          <Bar
            yAxisId="capital"
            dataKey="capitalPrestado"
            fill="var(--color-info)"
            fillOpacity={0.55}
            radius={[3, 3, 0, 0]}
            maxBarSize={18}
          />
          <Line
            yAxisId="intereses"
            type="monotone"
            dataKey="intereses"
            stroke="var(--color-exito)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
