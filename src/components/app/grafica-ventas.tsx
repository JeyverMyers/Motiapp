"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatearFecha, formatearMoneda } from "@/lib/formato";
import type { PuntoSerie } from "@/server/repositorios/panel";

/**
 * Gráfica de ventas y ganancia por día.
 *
 * Client Component porque Recharts mide el contenedor en el navegador. Los datos
 * llegan ya calculados del servidor: aquí no se consulta nada.
 */
export function GraficaVentas({ serie }: { serie: PuntoSerie[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="rellenoVentas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-info)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-info)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="rellenoGanancia" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-exito)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-exito)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="fecha"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickFormatter={(valor: string) =>
              formatearFecha(valor).replace(/ de /g, " ").slice(0, 6)
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickFormatter={(valor: number) =>
              valor >= 1_000_000
                ? `${(valor / 1_000_000).toFixed(1)}M`
                : valor >= 1_000
                  ? `${Math.round(valor / 1_000)}k`
                  : String(valor)
            }
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
              nombre === "ventas" ? "Vendido" : "Ganancia",
            ]}
          />
          <Area
            type="monotone"
            dataKey="ventas"
            stroke="var(--color-info)"
            strokeWidth={2}
            fill="url(#rellenoVentas)"
          />
          <Area
            type="monotone"
            dataKey="ganancia"
            stroke="var(--color-exito)"
            strokeWidth={2}
            fill="url(#rellenoGanancia)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
