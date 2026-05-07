"use client";
import { cn } from "@/components/ui";

export type InsightType = "success" | "warning" | "info" | "danger";

export interface Insight {
  type: InsightType;
  icon: string;
  title: string;
  message: string;
}

const styles: Record<InsightType, string> = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  info:    "bg-sky-50 border-sky-200 text-sky-900",
  danger:  "bg-red-50 border-red-200 text-red-900",
};

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 transition-all duration-200",
        styles[insight.type]
      )}
    >
      <span className="text-2xl leading-none shrink-0 mt-0.5">{insight.icon}</span>
      <div>
        <p className="font-semibold text-sm">{insight.title}</p>
        <p className="text-xs mt-0.5 opacity-75 leading-relaxed">{insight.message}</p>
      </div>
    </div>
  );
}
