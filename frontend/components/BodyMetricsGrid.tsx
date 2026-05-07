"use client";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/components/ui";

export interface MetricItem {
  label: string;
  value: number | null;
  prevValue: number | null;
  unit: string;
  invert?: boolean;
}

function MetricTile({ label, value, prevValue, unit, invert = false }: MetricItem) {
  if (value === null) return null;

  const delta =
    prevValue !== null ? parseFloat((value - prevValue).toFixed(1)) : null;
  const isGood =
    delta === null || delta === 0
      ? true
      : invert
      ? delta <= 0
      : delta >= 0;

  return (
    <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-1.5">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <span className="text-sm text-gray-400">{unit}</span>
      </div>
      {delta !== null && delta !== 0 && (
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-semibold",
            isGood ? "text-emerald-600" : "text-red-500"
          )}
        >
          {delta < 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
          {delta > 0 ? "+" : ""}
          {delta} {unit}
          {isGood && invert && delta < 0 && <span>🔥</span>}
          {isGood && !invert && delta > 0 && <span>💪</span>}
        </div>
      )}
      {delta === 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Minus size={11} /> Sin cambio
        </div>
      )}
    </div>
  );
}

export function BodyMetricsGrid({ metrics }: { metrics: MetricItem[] }) {
  const visible = metrics.filter((m) => m.value !== null);
  if (visible.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {visible.map((m) => (
        <MetricTile key={m.label} {...m} />
      ))}
    </div>
  );
}
