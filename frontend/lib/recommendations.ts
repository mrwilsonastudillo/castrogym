import { type Insight } from "@/components/InsightCard";
import { type Reporte } from "@/lib/api";

// ─── Tipos internos ────────────────────────────────────────────────────────────

type Priority = 0 | 1 | 2 | 3; // 0=Alertas, 1=Mejoras, 2=Motivación, 3=Logros

interface ScoredInsight {
  priority: Priority;
  insight: Insight;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Genera hasta 4 recomendaciones deterministas basadas en las mediciones del
 * cliente. Ordenadas por prioridad: Alertas → Mejoras → Motivación → Logros.
 *
 * Sin IA externa — listo para upgrade futuro reemplazando esta función.
 */
export function generateMeasurementRecommendations(reporte: Reporte): Insight[] {
  const { actual, historico, progreso, cliente } = reporte;
  if (!actual) return [];

  const scored: ScoredInsight[] = [];
  const total = progreso?.totalMediciones ?? 0;
  const prevH = historico.length >= 2 ? historico[historico.length - 2] : null;

  // ── ALERTAS (priority 0) ────────────────────────────────────────────────────

  // Pérdida de masa muscular
  if (
    prevH &&
    actual.masaMuscular != null &&
    prevH.masaMuscular != null &&
    actual.masaMuscular < prevH.masaMuscular - 0.5
  ) {
    scored.push({
      priority: 0,
      insight: {
        type: "warning",
        icon: "💪",
        title: "Pérdida de masa muscular detectada",
        message:
          "Prioriza ejercicios de fuerza, revisa tu ingesta de proteína, mejora el descanso y consulta con tu coach para ajustar el plan.",
      },
    });
  }

  // Peso aumentando rápidamente (objetivo pérdida de peso)
  if (
    progreso &&
    progreso.pesoCambio >= 2 &&
    cliente.objetivo === "PERDIDA_PESO"
  ) {
    scored.push({
      priority: 0,
      insight: {
        type: "warning",
        icon: "📈",
        title: "Peso en alza",
        message:
          "Tu peso aumentó considerablemente. Revisa tu plan de alimentación, el descanso nocturno y agenda un seguimiento con tu coach.",
      },
    });
  }

  // ── MEJORAS (priority 1) ────────────────────────────────────────────────────

  // ICC moderado o alto → sugerencia cardiovascular
  if (
    reporte.puedeVerICC &&
    actual.icc != null &&
    actual.iccClasificacion != null &&
    (actual.iccClasificacion === "MODERADO" || actual.iccClasificacion === "ALTO")
  ) {
    scored.push({
      priority: 1,
      insight: {
        type: "info",
        icon: "❤️",
        title: "Incorpora más cardio",
        message:
          "Tu índice cintura-cadera sugiere incorporar ejercicio cardiovascular regular y hábitos saludables como mayor hidratación y mejor gestión del estrés.",
      },
    });
  }

  // Progreso ralentizado (peso estancado últimas 3 mediciones)
  if (
    historico.length >= 3 &&
    cliente.objetivo === "PERDIDA_PESO"
  ) {
    const last3 = historico.slice(-3).map((h) => h.pesoKg);
    const range = Math.max(...last3) - Math.min(...last3);
    if (range < 0.5) {
      scored.push({
        priority: 1,
        insight: {
          type: "info",
          icon: "⚠️",
          title: "Progreso estancado",
          message:
            "El peso no ha variado en tus últimas mediciones. Considera variar la rutina, ajustar la alimentación o hablar con tu coach.",
        },
      });
    }
  }

  // ── MOTIVACIÓN (priority 2) ─────────────────────────────────────────────────

  // Grasa corporal bajando
  if (
    prevH &&
    actual.porcentajeGrasa != null &&
    prevH.porcentajeGrasa != null &&
    actual.porcentajeGrasa < prevH.porcentajeGrasa - 0.3
  ) {
    scored.push({
      priority: 2,
      insight: {
        type: "success",
        icon: "🔥",
        title: "¡Grasa bajando!",
        message:
          "Tu porcentaje de grasa corporal disminuyó. Mantén la adherencia al plan y continúa con tu rutina actual.",
      },
    });
  }

  // IMC normal
  if (actual.clasificacionIMC === "normal") {
    scored.push({
      priority: 2,
      insight: {
        type: "success",
        icon: "✅",
        title: "IMC en rango saludable",
        message:
          "Tu índice de masa corporal está dentro del rango normal. ¡Sigue manteniendo este equilibrio!",
      },
    });
  }

  // Gran pérdida de peso total
  if (progreso && progreso.pesoCambio <= -3) {
    scored.push({
      priority: 2,
      insight: {
        type: "success",
        icon: "🏆",
        title: "Gran progreso de peso",
        message: `Has perdido ${Math.abs(progreso.pesoCambio)} kg desde tu primera medición. Los resultados hablan por sí solos.`,
      },
    });
  }

  // ── LOGROS (priority 3) ─────────────────────────────────────────────────────

  // Alta constancia
  if (total >= 5) {
    scored.push({
      priority: 3,
      insight: {
        type: "success",
        icon: "⭐",
        title: "Excelente constancia",
        message: `${total} mediciones registradas. La constancia es el pilar del progreso — ¡sigue así!`,
      },
    });
  } else if (total >= 2) {
    scored.push({
      priority: 3,
      insight: {
        type: "info",
        icon: "📊",
        title: "Construyendo tu historial",
        message:
          "Cada medición suma. Con más datos tu coach podrá personalizar aún mejor tu plan.",
      },
    });
  }

  // Ordenar por prioridad y devolver máximo 4
  return scored
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 4)
    .map((s) => s.insight);
}
