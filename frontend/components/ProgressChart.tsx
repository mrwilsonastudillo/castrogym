"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface ChartSerie {
  key: string;
  label: string;
  color: string;
}

export interface ChartPoint {
  label: string;
  [key: string]: number | string | null | undefined;
}

interface Props {
  data: ChartPoint[];
  series: ChartSerie[];
  height?: number;
  trendLabel?: string;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="text-xs font-semibold text-gray-500 mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-400 text-xs">{entry.name}:</span>
          <span className="font-bold text-gray-900">
            {entry.value != null ? entry.value : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

function renderDot(color: string, dataLen: number) {
  return (props: any) => {
    const { cx, cy, index } = props;
    if (cx == null || cy == null) return <g key={`dot-${index}`} />;
    const isEdge = index === 0 || index === dataLen - 1;
    return (
      <circle
        key={`dot-${index}`}
        cx={cx}
        cy={cy}
        r={isEdge ? 5.5 : 3}
        fill={color}
        stroke="white"
        strokeWidth={isEdge ? 2.5 : 1.5}
      />
    );
  };
}

export function ProgressChart({ data, series, height = 220, trendLabel }: Props) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-16 text-sm text-gray-400">
        Necesitas al menos 2 mediciones para ver la gráfica.
      </div>
    );
  }

  return (
    <div>
      {trendLabel && (
        <p className="text-xs font-medium text-gray-500 mb-3 px-1">{trendLabel}</p>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`pg-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} width={40} />
          <Tooltip content={<CustomTooltip />} />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2.5}
              fill={`url(#pg-grad-${s.key})`}
              dot={renderDot(s.color, data.length)}
              activeDot={{ r: 6, fill: s.color, stroke: "white", strokeWidth: 2 }}
              connectNulls={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
