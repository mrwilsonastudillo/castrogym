"use client";
import { cn } from "@/components/ui";
import type { Reporte } from "@/lib/api";

interface Level {
  nombre: string;
  nivel: number;
  progresoActual: number;
  progresoTarget: number;
}

interface Badge {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
}

interface GamData {
  nivel: Level;
  streak: number;
  badges: Badge[];
}

function calcularGamificacion(reporte: Reporte): GamData {
  const { historico, progreso } = reporte;
  const total = progreso?.totalMediciones ?? 0;

  // Level
  let nivel: Level;
  if (total < 3) {
    nivel = { nombre: "Principiante", nivel: 1, progresoActual: total, progresoTarget: 3 };
  } else if (total < 10) {
    nivel = { nombre: "Intermedio", nivel: 2, progresoActual: total, progresoTarget: 10 };
  } else {
    nivel = { nombre: "Avanzado", nivel: 3, progresoActual: total, progresoTarget: total };
  }

  // Streak: consecutive weight-loss measurements
  let streak = 0;
  for (let i = historico.length - 1; i > 0; i--) {
    if (historico[i].pesoKg < historico[i - 1].pesoKg) streak++;
    else break;
  }

  // Badges
  const pesoLost = progreso ? Math.abs(Math.min(0, progreso.pesoCambio)) : 0;
  const badges: Badge[] = [
    { id: "primera",  label: "Primer paso",  icon: "🏁", earned: total >= 1 },
    { id: "constante", label: "Constante",   icon: "⭐", earned: total >= 5 },
    { id: "dedicado", label: "Dedicado",     icon: "🏆", earned: total >= 10 },
    { id: "5kg",      label: "−5 kg",        icon: "🔥", earned: pesoLost >= 5 },
    { id: "10kg",     label: "−10 kg",       icon: "💪", earned: pesoLost >= 10 },
    { id: "racha3",   label: "Racha ×3",     icon: "⚡", earned: streak >= 3 },
  ];

  return { nivel, streak, badges };
}

const nivelColors: Record<number, string> = {
  1: "#f59e0b",
  2: "#6366f1",
  3: "#10b981",
};

export function GamificationWidget({ reporte }: { reporte: Reporte }) {
  const { nivel, streak, badges } = calcularGamificacion(reporte);
  const color = nivelColors[nivel.nivel] ?? "#0ea5e9";

  const progPct =
    nivel.nivel < 3
      ? Math.min((nivel.progresoActual / nivel.progresoTarget) * 100, 100)
      : 100;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
      {/* Level + streak */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white text-lg font-extrabold shrink-0"
            style={{ backgroundColor: color }}
          >
            {nivel.nivel}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{nivel.nombre}</p>
            <p className="text-xs text-gray-400">{nivel.progresoActual} medición{nivel.progresoActual !== 1 ? "es" : ""}</p>
          </div>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 rounded-full px-3 py-1.5 text-sm font-bold border border-orange-100">
            🔥 {streak} en racha
          </div>
        )}
      </div>

      {/* Progress bar to next level */}
      {nivel.nivel < 3 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Hacia nivel {nivel.nivel + 1}</span>
            <span>
              {nivel.progresoActual}/{nivel.progresoTarget}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progPct}%`, backgroundColor: color }}
            />
          </div>
        </div>
      )}

      {/* Badges */}
      <div>
        <p className="text-xs font-semibold text-gray-400 mb-2.5">Logros</p>
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <div
              key={b.id}
              title={b.earned ? `Logro desbloqueado: ${b.label}` : `Pendiente: ${b.label}`}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
                b.earned
                  ? "bg-white border-gray-200 text-gray-700 shadow-sm"
                  : "bg-gray-50 border-gray-100 text-gray-300"
              )}
            >
              <span className={b.earned ? "" : "grayscale opacity-30"}>
                {b.icon}
              </span>
              {b.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
