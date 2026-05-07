"use client";
import { Info } from "lucide-react";

const CONFIG = {
  BAJO: { label: "Riesgo bajo", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  MODERADO: { label: "Riesgo moderado", bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  ALTO: { label: "Riesgo alto", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
};

interface ICCBadgeProps {
  icc: number;
  clasificacion: "BAJO" | "MODERADO" | "ALTO";
  genero: string;
  showTooltip?: boolean;
}

export function ICCBadge({ icc, clasificacion, genero, showTooltip = false }: ICCBadgeProps) {
  const cfg = CONFIG[clasificacion] ?? CONFIG.BAJO;

  return (
    <div className="flex flex-col gap-1">
      <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        ICC {icc.toFixed(2)} · {cfg.label}
      </div>
      {showTooltip && (
        <p className="text-xs text-gray-400">
          Referencia OMS: {genero === "M" ? "H <0.90 bajo, 0.90–0.99 moderado, ≥1.00 alto" : "M <0.80 bajo, 0.80–0.84 moderado, ≥0.85 alto"}
        </p>
      )}
    </div>
  );
}

// Guía de medición para el coach (tooltip)
export function ICCGuia() {
  return (
    <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-xs text-sky-700">
      <Info size={14} className="mt-0.5 flex-shrink-0" />
      <div>
        <p><span className="font-semibold">Cintura:</span> zona más estrecha del torso, justo por encima del ombligo, sin comprimir la piel.</p>
        <p className="mt-0.5"><span className="font-semibold">Cadera:</span> parte más prominente de los glúteos.</p>
      </div>
    </div>
  );
}
