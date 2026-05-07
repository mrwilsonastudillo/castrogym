"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface TrendSerie {
  key: string;
  label: string;
  color: string;
  unit?: string;
}

export interface TrendPoint {
  label: string; // etiqueta del eje X
  [key: string]: number | string | null;
}

interface TrendChartProps {
  data: TrendPoint[];
  series: TrendSerie[];
  height?: number;
  yDomain?: [number | "auto", number | "auto"];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-500">{entry.name}:</span>
          <span className="font-medium text-gray-900">
            {entry.value != null ? entry.value : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ data, series, height = 240, yDomain }: TrendChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-gray-400">
        Necesitas al menos 2 mediciones para ver la gráfica.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          domain={yDomain}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "#64748b", paddingTop: 8 }}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: s.color, strokeWidth: 2, stroke: "white" }}
            activeDot={{ r: 6, fill: s.color }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
