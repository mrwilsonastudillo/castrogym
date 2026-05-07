"use client";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/components/ui";
import type { ReactNode } from "react";

interface Props {
  label: string;
  value: string;
  subValue?: string;
  delta?: number;
  deltaUnit?: string;
  deltaLabel?: string;
  statusText?: string;
  invert?: boolean;
  icon?: ReactNode;
}

export function KpiCard({
  label,
  value,
  subValue,
  delta,
  deltaUnit = "",
  deltaLabel = "vs anterior",
  statusText,
  invert = false,
  icon,
}: Props) {
  const isGood = delta === undefined
    ? true
    : invert
    ? delta <= 0
    : delta >= 0;

  const hasChange = delta !== undefined && delta !== 0;

  const deltaClasses = hasChange
    ? isGood
      ? "text-emerald-700 bg-emerald-50 border-emerald-100"
      : "text-red-600 bg-red-50 border-red-100"
    : "text-gray-400 bg-gray-50 border-gray-100";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-2.5 transition-all duration-200 hover:shadow-md hover:-translate-y-px">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide leading-tight">
          {label}
        </span>
        {icon && <span className="text-gray-300 shrink-0">{icon}</span>}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">
          {value}
        </span>
        {subValue && (
          <span className="text-sm font-medium text-gray-400">{subValue}</span>
        )}
      </div>

      {delta !== undefined && (
        <div
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 border w-fit",
            deltaClasses
          )}
        >
          {delta === 0 ? (
            <Minus size={11} />
          ) : delta < 0 ? (
            <TrendingDown size={11} />
          ) : (
            <TrendingUp size={11} />
          )}
          {delta === 0
            ? "Sin cambio"
            : `${delta > 0 ? "+" : ""}${delta}${deltaUnit} ${deltaLabel}`}
        </div>
      )}
      {statusText && (
        <p className="text-xs text-gray-400 leading-none">{statusText}</p>
      )}
    </div>
  );
}
