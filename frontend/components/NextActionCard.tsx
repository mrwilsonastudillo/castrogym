"use client";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

export interface NextAction {
  type: "action" | "success" | "warning";
  title: string;
  message: string;
  cta: { label: string; href: string };
}

const styles: Record<NextAction["type"], string> = {
  action:  "bg-sky-50 border-sky-200",
  success: "bg-emerald-50 border-emerald-200",
  warning: "bg-amber-50 border-amber-200",
};

const icons: Record<NextAction["type"], string> = {
  action:  "🎯",
  success: "🌟",
  warning: "⚡",
};

export function NextActionCard({ action }: { action: NextAction }) {
  return (
    <div
      className={`rounded-2xl border p-4 flex items-center justify-between gap-4 flex-wrap ${styles[action.type]}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-2xl shrink-0 leading-none mt-0.5">{icons[action.type]}</span>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-gray-900">{action.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{action.message}</p>
        </div>
      </div>
      <a href={action.cta.href} className="shrink-0">
        <Button size="sm" variant="secondary" className="gap-1.5 whitespace-nowrap">
          {action.cta.label} <ArrowRight size={13} />
        </Button>
      </a>
    </div>
  );
}
