"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, Reporte } from "@/lib/api";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import {
  Card, CardContent, CardHeader, CardTitle,
  Badge, Alert, Button, cn,
} from "@/components/ui";
import {
  HealthGauge,
  IMC_SEGMENTS,
  ICC_SEGMENTS_M,
  ICC_SEGMENTS_F,
} from "@/components/HealthGauge";
import { ICCBadge } from "@/components/ICCBadge";
import { VIPLock } from "@/components/VIPLock";
import { KpiCard } from "@/components/KpiCard";
import { ProgressChart, type ChartPoint } from "@/components/ProgressChart";
import { InsightCard, type Insight } from "@/components/InsightCard";
import { BodyMetricsGrid } from "@/components/BodyMetricsGrid";
import { RangeIndicator } from "@/components/RangeIndicator";
import { GamificationWidget } from "@/components/GamificationWidget";
import { NextActionCard, type NextAction } from "@/components/NextActionCard";
import Link from "next/link";
import {
  Scale, Activity, TrendingDown, TrendingUp, Plus, Dumbbell,
  MessageCircle, Crown,
} from "lucide-react";

// ─── Insights Engine ──────────────────────────────────────────────────────────

function generateInsights(reporte: Reporte): Insight[] {
  const insights: Insight[] = [];
  const { historico, progreso, actual, cliente } = reporte;
  if (!actual) return insights;

  const total = progreso?.totalMediciones ?? 0;
  const prevH = historico.length >= 2 ? historico[historico.length - 2] : null;

  if (total === 1) {
    insights.push({
      type: "info",
      icon: "🎯",
      title: "¡Primera medición registrada!",
      message:
        "Has dado el primer paso. Agenda tu próxima cita para ver tu evolución.",
    });
    return insights;
  }

  if (progreso && progreso.pesoCambio <= -3) {
    insights.push({
      type: "success",
      icon: "🔥",
      title: "Gran progreso",
      message: `Has perdido ${Math.abs(progreso.pesoCambio)} kg desde tu primera medición. ¡Sigue así!`,
    });
  } else if (
    progreso &&
    progreso.pesoCambio >= 2 &&
    cliente.objetivo === "PERDIDA_PESO"
  ) {
    insights.push({
      type: "danger",
      icon: "📈",
      title: "Peso en alza",
      message: `Tu peso aumentó ${progreso.pesoCambio} kg. Revisa tu plan de alimentación.`,
    });
  }

  if (
    historico.length >= 4 &&
    cliente.objetivo === "PERDIDA_PESO"
  ) {
    const last = historico[historico.length - 1].pesoKg;
    const mid  = historico[historico.length - 2].pesoKg;
    const prev = historico[historico.length - 3].pesoKg;
    const recentDelta = Math.abs(last - mid);
    const prevDelta   = Math.abs(mid - prev);
    if (prevDelta > 0.5 && recentDelta < prevDelta * 0.3) {
      insights.push({
        type: "warning",
        icon: "⚠️",
        title: "Progreso ralentizado",
        message:
          "El progreso se ha ralentizado. Considera variar tu rutina o consultar con tu coach.",
      });
    }
  }

  if (
    prevH &&
    actual.masaMuscular != null &&
    prevH.masaMuscular != null &&
    actual.masaMuscular < prevH.masaMuscular - 0.5
  ) {
    insights.push({
      type: "warning",
      icon: "💪",
      title: "Pérdida de masa muscular",
      message:
        "Perdiste masa muscular en la última medición. Revisa tu plan de entrenamiento.",
    });
  }

  if (actual.porcentajeGrasa != null && !actual.grasaEstimada) {
    const isOptimal =
      cliente.genero === "M"
        ? actual.porcentajeGrasa >= 6 && actual.porcentajeGrasa <= 17
        : actual.porcentajeGrasa >= 14 && actual.porcentajeGrasa <= 24;
    if (isOptimal) {
      insights.push({
        type: "success",
        icon: "💚",
        title: "Composición ideal",
        message:
          "Tu % de grasa está en el rango óptimo de fitness. ¡Mantén el trabajo!",
      });
    }
  }

  if (total >= 5 && insights.length < 3) {
    insights.push({
      type: "success",
      icon: "⭐",
      title: "Excelente constancia",
      message: `${total} mediciones registradas. ¡La constancia es la clave del éxito!`,
    });
  }

  return insights.slice(0, 3);
}

// ─── Dashboard helpers ────────────────────────────────────────────────────────

function calcTrendLabel(values: number[], invert: boolean, metricName: string): string {
  if (values.length < 3) return "";
  const last3 = values.slice(-3);
  const d1 = last3[1] - last3[0];
  const d2 = last3[2] - last3[1];
  const avg = (d1 + d2) / 2;
  if (Math.abs(avg) < 0.15) return `${metricName}: sin cambios significativos ⚠️`;
  const isGood = invert ? avg < 0 : avg > 0;
  const dir = avg < 0 ? "descendente" : "ascendente";
  return isGood
    ? `${metricName}: tendencia ${dir} estable 🔥`
    : `${metricName}: tendencia ${dir} ⚠️`;
}

function calcStatusText(delta: number | undefined, invert: boolean): string | undefined {
  if (delta === undefined) return undefined;
  if (delta === 0) return "🟡 Sin cambio";
  const isGood = invert ? delta < 0 : delta > 0;
  return isGood ? "🟢 Buen progreso" : "🔴 Revisar plan";
}

function getNextAction(reporte: Reporte): NextAction {
  const { historico, progreso, actual } = reporte;
  const total = progreso?.totalMediciones ?? 0;

  if (total <= 1) {
    return {
      type: "action",
      title: "Siguiente paso",
      message: "Agenda tu próxima cita para comenzar a ver tu evolución.",
      cta: { label: "Agendar cita", href: "/agendar" },
    };
  }

  const daysSince = actual
    ? Math.floor((Date.now() - new Date(actual.fechaMedicion).getTime()) / 86400000)
    : 0;

  if (daysSince > 30) {
    return {
      type: "warning",
      title: "Tiempo sin medir",
      message: `Llevas ${daysSince} días sin registrar mediciones. ¡Es momento de actualizarlas!`,
      cta: { label: "Nueva medición", href: "/agendar" },
    };
  }

  if (historico.length >= 3) {
    const last3 = historico.slice(-3).map((h) => h.pesoKg);
    const range = Math.max(...last3) - Math.min(...last3);
    if (range < 0.5) {
      return {
        type: "warning",
        title: "Progreso estancado",
        message: "Tu peso no ha cambiado en las últimas mediciones. Considera variar tu rutina.",
        cta: { label: "Contactar coach", href: "/agendar" },
      };
    }
  }

  if (progreso && progreso.pesoCambio <= -2) {
    return {
      type: "success",
      title: "¡Vas muy bien!",
      message: "Mantén tu rutina actual. Los resultados hablan por sí solos.",
      cta: { label: "Ver plan", href: "/contenido/entrenamiento" },
    };
  }

  return {
    type: "action",
    title: "Siguiente acción",
    message: "Registra tu próxima medición para seguir tu progreso de cerca.",
    cta: { label: "Agendar cita", href: "/agendar" },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function imcBadge(cls: string) {
  const map: Record<string, { label: string; v: "success" | "info" | "warning" | "danger" }> = {
    bajo_peso:   { label: "Bajo peso",    v: "info" },
    normal:      { label: "Normal",       v: "success" },
    sobrepeso:   { label: "Sobrepeso",    v: "warning" },
    obesidad_i:  { label: "Obesidad I",   v: "danger" },
    obesidad_ii: { label: "Obesidad II+", v: "danger" },
  };
  const { label, v } = map[cls] ?? { label: cls, v: "default" as any };
  return <Badge variant={v}>{label}</Badge>;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-gray-100 rounded-2xl", className)} />
  );
}

function LoadingSkeleton() {
  return (
    <ProtectedPage roles={["CLIENTE"]}>
      <div className="space-y-6 pb-8">
        <Skeleton className="h-8 w-52" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-24" />
        <Skeleton className="h-16" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
        <Skeleton className="h-36" />
      </div>
    </ProtectedPage>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function MisMedicionesPage() {
  const { user } = useAuth();
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.clienteId) return;
    api
      .get<Reporte>(`/api/reportes/cliente/${user.clienteId}`)
      .then(setReporte)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <LoadingSkeleton />;

  const historico   = reporte?.historico ?? [];
  const prevH       = historico.length >= 2 ? historico[historico.length - 2] : null;
  const actual      = reporte?.actual ?? null;
  const progreso    = reporte?.progreso ?? null;
  const puedeVerICC = reporte?.puedeVerICC ?? false;
  const puedeVerYuhasz = reporte?.puedeVerYuhasz ?? false;
  const genero      = reporte?.cliente.genero ?? "M";

  const pesoVsAnterior =
    prevH && actual
      ? parseFloat((actual.pesoKg - prevH.pesoKg).toFixed(1))
      : undefined;

  const grasaVsAnterior =
    prevH && actual?.porcentajeGrasa != null && prevH.porcentajeGrasa != null
      ? parseFloat((actual.porcentajeGrasa - prevH.porcentajeGrasa).toFixed(1))
      : undefined;

  const imcVsAnterior =
    prevH && actual
      ? parseFloat((actual.imc - prevH.imc).toFixed(2))
      : undefined;

  // Days between last two measurements
  const daysSinceLast =
    prevH && actual
      ? Math.max(
          1,
          Math.round(
            (new Date(actual.fechaMedicion).getTime() -
              new Date(historico[historico.length - 2].fecha).getTime()) /
              86400000
          )
        )
      : undefined;

  const deltaLabel = daysSinceLast ? `en ${daysSinceLast} día${daysSinceLast !== 1 ? "s" : ""}` : "vs anterior";

  const pesoTrendLabel = calcTrendLabel(historico.map((h) => h.pesoKg), true, "Peso");
  const grasaTrendLabel = calcTrendLabel(
    historico.filter((h) => h.porcentajeGrasa != null).map((h) => h.porcentajeGrasa!),
    true,
    "% Grasa"
  );

  const insights = reporte ? generateInsights(reporte) : [];
  const nextAction = reporte ? getNextAction(reporte) : null;

  return (
    <ProtectedPage roles={["CLIENTE"]}>
      <div className="space-y-6 pb-8">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Seguimiento
            </p>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-0.5">
              Mis mediciones
            </h1>
            {actual && (
              <p className="text-xs text-gray-400 mt-1">
                Última medición:{" "}
                {new Date(actual.fechaMedicion).toLocaleDateString("es-CL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-2">
            <Link href="/agendar">
              <Button size="sm" className="gap-1.5">
                <Plus size={14} /> Nueva medición
              </Button>
            </Link>
            <Link href="/contenido/entrenamiento">
              <Button size="sm" variant="secondary" className="gap-1.5">
                <Dumbbell size={14} /> Ver plan
              </Button>
            </Link>
            <Link href="/agendar">
              <Button size="sm" variant="secondary" className="gap-1.5">
                <MessageCircle size={14} /> Contactar coach
              </Button>
            </Link>
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {/* ── Empty state ── */}
        {!actual ? (
          <Card>
            <CardContent className="py-20 text-center">
              <p className="text-5xl mb-4">📊</p>
              <p className="font-bold text-gray-700 text-lg">Sin mediciones aún</p>
              <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
                Agenda una cita con tu coach para registrar tu primera medición
                y comenzar a ver tu progreso.
              </p>
              <div className="mt-6">
                <Link href="/agendar">
                  <Button>
                    <Plus size={15} className="mr-2" /> Agendar cita
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KpiCard
                label="Peso actual"
                value={`${actual.pesoKg}`}
                subValue="kg"
                delta={pesoVsAnterior}
                deltaUnit=" kg"
                deltaLabel={deltaLabel}
                statusText={calcStatusText(pesoVsAnterior, true)}
                invert
                icon={<Scale size={17} />}
              />
              <KpiCard
                label="% Grasa corporal"
                value={
                  actual.porcentajeGrasa != null
                    ? actual.porcentajeGrasa.toFixed(1)
                    : "—"
                }
                subValue={actual.porcentajeGrasa != null ? "%" : undefined}
                delta={grasaVsAnterior}
                deltaUnit="%"
                deltaLabel={deltaLabel}
                statusText={calcStatusText(grasaVsAnterior, true)}
                invert
                icon={<Activity size={17} />}
              />
              <KpiCard
                label="IMC"
                value={actual.imc.toFixed(1)}
                delta={imcVsAnterior}
                deltaLabel={deltaLabel}
                statusText={calcStatusText(imcVsAnterior, true)}
                invert
                icon={<TrendingDown size={17} />}
              />
            </div>

            {/* ── Insights ── */}
            {insights.length > 0 && (
              <div className="space-y-2.5">
                {insights.map((ins, i) => (
                  <InsightCard key={i} insight={ins} />
                ))}
              </div>
            )}

            {/* ── Next Action ── */}
            {nextAction && <NextActionCard action={nextAction} />}

            {/* ── Fat % Range Indicator ── */}
            {actual.porcentajeGrasa != null && (
              <Card>
                <CardContent className="pt-5 pb-5">
                  <RangeIndicator
                    value={actual.porcentajeGrasa}
                    genero={genero}
                    estimated={actual.grasaEstimada}
                  />
                </CardContent>
              </Card>
            )}

            {/* ── Progress Charts ── */}
            {historico.length > 1 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">
                      Evolución de peso
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ProgressChart
                      data={historico.map<ChartPoint>((h) => ({
                        label: new Date(h.fecha).toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "short",
                        }),
                        "Peso (kg)": h.pesoKg,
                      }))}
                      series={[
                        { key: "Peso (kg)", label: "Peso (kg)", color: "#0ea5e9" },
                      ]}
                      trendLabel={pesoTrendLabel || undefined}
                    />
                  </CardContent>
                </Card>

                {historico.some((h) => h.porcentajeGrasa != null) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">
                        Evolución de % grasa
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ProgressChart
                        data={historico.map<ChartPoint>((h) => ({
                          label: new Date(h.fecha).toLocaleDateString("es-CL", {
                            day: "numeric",
                            month: "short",
                          }),
                          "% Grasa": h.porcentajeGrasa,
                        }))}
                        series={[
                          { key: "% Grasa", label: "% Grasa", color: "#f97316" },
                        ]}
                        trendLabel={grasaTrendLabel || undefined}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ── Body Metrics Grid ── */}
            {(actual.bicepsCm ??
              actual.toraxCm ??
              actual.cinturaCm ??
              actual.musloCm ??
              actual.pantorrillaCm ??
              actual.caderaCm) != null && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Medidas corporales
                </p>
                <BodyMetricsGrid
                  metrics={[
                    {
                      label: "Bíceps",
                      value: actual.bicepsCm,
                      prevValue: prevH?.bicepsCm ?? null,
                      unit: "cm",
                    },
                    {
                      label: "Pecho",
                      value: actual.toraxCm,
                      prevValue: prevH?.toraxCm ?? null,
                      unit: "cm",
                    },
                    {
                      label: "Cintura",
                      value: actual.cinturaCm,
                      prevValue: prevH?.cinturaCm ?? null,
                      unit: "cm",
                      invert: true,
                    },
                    {
                      label: "Muslo",
                      value: actual.musloCm,
                      prevValue: prevH?.musloCm ?? null,
                      unit: "cm",
                    },
                    {
                      label: "Pantorrilla",
                      value: actual.pantorrillaCm,
                      prevValue: prevH?.pantorrillaCm ?? null,
                      unit: "cm",
                    },
                    {
                      label: "Cadera",
                      value: actual.caderaCm,
                      prevValue: prevH?.caderaCm ?? null,
                      unit: "cm",
                      invert: true,
                    },
                  ]}
                />
              </div>
            )}

            {/* ── Gamification ── */}
            <GamificationWidget reporte={reporte!} />

            {/* ── IMC Gauge ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold">
                    Índice de Masa Corporal (IMC)
                  </CardTitle>
                  {imcBadge(actual.clasificacionIMC)}
                </div>
              </CardHeader>
              <CardContent className="flex justify-center pt-0">
                <div className="w-full max-w-xs">
                  <HealthGauge
                    value={actual.imc}
                    min={10}
                    max={45}
                    segments={IMC_SEGMENTS}
                    title="IMC"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── ICC Gauge (VIP) ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold">
                    Índice Cintura-Cadera (ICC)
                  </CardTitle>
                  {!puedeVerICC && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Crown size={10} /> VIP
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {puedeVerICC ? (
                  actual.icc ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-full max-w-xs">
                        <HealthGauge
                          value={actual.icc}
                          min={0.6}
                          max={genero === "M" ? 1.3 : 1.1}
                          segments={
                            genero === "M" ? ICC_SEGMENTS_M : ICC_SEGMENTS_F
                          }
                          title="ICC"
                        />
                      </div>
                      <ICCBadge
                        icc={actual.icc}
                        clasificacion={actual.iccClasificacion!}
                        genero={genero}
                        showTooltip
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 py-6 text-center">
                      Sin datos — requiere medición de cintura y cadera.
                    </p>
                  )
                ) : (
                  <VIPLock>
                    <HealthGauge
                      value={0.78}
                      min={0.6}
                      max={1.1}
                      segments={ICC_SEGMENTS_F}
                      title="ICC"
                    />
                  </VIPLock>
                )}
              </CardContent>
            </Card>

            {/* ── Pliegues Yuhasz (solo VIP) ── */}
            {puedeVerYuhasz ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">
                      Pliegues Yuhasz
                    </CardTitle>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Crown size={10} /> VIP
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {actual.grasaYuhasz != null ? (
                    <div className="space-y-5">
                      {/* Result */}
                      <div className="text-center bg-sky-50 rounded-2xl py-5 px-4">
                        <p
                          className="text-5xl font-extrabold text-sky-600 tracking-tight"
                        >
                          {actual.grasaYuhasz.toFixed(1)}
                          <span className="text-2xl font-bold text-sky-400">%</span>
                        </p>
                        <p className="text-sm text-sky-700 font-medium mt-1">
                          % Grasa corporal — método Yuhasz
                        </p>
                        {actual.sumaPliegues != null && (
                          <p className="text-xs text-sky-400 mt-1">
                            Suma de 6 pliegues: {actual.sumaPliegues.toFixed(1)} mm
                          </p>
                        )}
                      </div>

                      {/* Individual skinfolds */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {[
                          { label: "Tríceps",      value: actual.pliegueTricepe },
                          { label: "Subescapular", value: actual.pliegueSubescapular },
                          { label: "Supraespinal", value: actual.pliegueSupraespinal },
                          { label: "Abdominal",    value: actual.pliegueAbdominal },
                          { label: "Muslo ant.",   value: actual.pliegueMusloAnt },
                          { label: "Pantorrilla",  value: actual.plieguePantorrilla },
                        ]
                          .filter((p) => p.value != null)
                          .map((p) => (
                            <div
                              key={p.label}
                              className="bg-gray-50 rounded-xl p-3 text-center"
                            >
                              <p className="text-lg font-bold text-gray-900">
                                {p.value}{" "}
                                <span className="text-xs font-normal text-gray-400">
                                  mm
                                </span>
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {p.label}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 py-6 text-center">
                      Sin datos — requiere medición de los 6 pliegues cutáneos por tu coach.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold">
                      Pliegues Yuhasz
                    </CardTitle>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Crown size={10} /> VIP
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <VIPLock>
                    <div className="text-center py-8 space-y-2">
                      <p className="text-4xl font-extrabold text-gray-200">—%</p>
                      <p className="text-sm text-gray-300">
                        Análisis de pliegues cutáneos
                      </p>
                      <p className="text-xs text-gray-300">
                        Método Yuhasz · 6 pliegues
                      </p>
                    </div>
                  </VIPLock>
                </CardContent>
              </Card>
            )}

            {/* ── Composición corporal ── */}
            {(actual.masaMuscular != null || actual.densidadOsea != null) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    Composición corporal
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {actual.masaMuscular != null && (
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-xl font-bold text-gray-900">
                          {actual.masaMuscular.toFixed(1)}{" "}
                          <span className="text-sm font-normal text-gray-400">kg</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Masa muscular</p>
                      </div>
                    )}
                    {actual.densidadOsea != null && (
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-xl font-bold text-gray-900">
                          {actual.densidadOsea.toFixed(2)}{" "}
                          <span className="text-sm font-normal text-gray-400">g/cm²</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Densidad ósea</p>
                      </div>
                    )}
                  </div>
                  {actual.grasaEstimada && (
                    <p className="text-xs text-gray-400 mt-3">
                      * % grasa estimado con fórmula Deurenberg (IMC + edad + sexo).
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Progreso total ── */}
            {progreso && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    Progreso total
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <ProgresoItem label="Peso" delta={progreso.pesoCambio} unit=" kg" invert />
                    <ProgresoItem label="IMC" delta={progreso.imcCambio} invert />
                    {progreso.cinturaCambio != null && (
                      <ProgresoItem label="Cintura" delta={progreso.cinturaCambio} unit=" cm" invert />
                    )}
                    {puedeVerICC && progreso.iccCambio != null && (
                      <ProgresoItem label="ICC" delta={progreso.iccCambio} invert />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    {progreso.totalMediciones} medición
                    {progreso.totalMediciones !== 1 ? "es" : ""} · desde{" "}
                    {new Date(progreso.fechaPrimera).toLocaleDateString("es-CL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ── Historial completo ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Historial completo
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto px-0 pb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {[
                        "Fecha",
                        "Peso",
                        "IMC",
                        ...(puedeVerICC ? ["ICC"] : []),
                        "Cintura",
                        "Cadera",
                        "% Grasa",
                        ...(puedeVerYuhasz &&
                        historico.some((h) => h.grasaYuhasz != null)
                          ? ["Yuhasz"]
                          : []),
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left py-2.5 px-3 first:pl-6 last:pr-6 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...historico].reverse().map((m, i) => (
                      <tr
                        key={i}
                        className="hover:bg-gray-50/60 transition-colors"
                      >
                        <td className="py-2.5 px-3 pl-6 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(m.fecha).toLocaleDateString("es-CL", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900 whitespace-nowrap">
                          {m.pesoKg} kg
                        </td>
                        <td className="py-2.5 px-3 text-gray-700">
                          {m.imc.toFixed(1)}
                        </td>
                        {puedeVerICC && (
                          <td className="py-2.5 px-3">
                            {m.icc && m.iccClasificacion ? (
                              <span
                                className={cn(
                                  "text-xs font-semibold",
                                  m.iccClasificacion === "BAJO"
                                    ? "text-green-600"
                                    : m.iccClasificacion === "MODERADO"
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                )}
                              >
                                {m.icc.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-gray-600">
                          {m.cinturaCm ? (
                            `${m.cinturaCm} cm`
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">
                          {m.caderaCm ? (
                            `${m.caderaCm} cm`
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {m.porcentajeGrasa != null ? (
                            <span className="text-xs text-gray-600">
                              {m.porcentajeGrasa.toFixed(1)}%
                              {m.grasaEstimada && (
                                <span className="text-gray-400 ml-0.5">*</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        {puedeVerYuhasz &&
                          historico.some((h) => h.grasaYuhasz != null) && (
                            <td className="py-2.5 px-3 pr-6">
                              {m.grasaYuhasz != null ? (
                                <span className="text-xs font-semibold text-sky-600">
                                  {m.grasaYuhasz.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {historico.some((h) => h.grasaEstimada) && (
                  <p className="text-xs text-gray-400 mt-3 px-6">
                    * Valor estimado (fórmula Deurenberg)
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ProtectedPage>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function ProgresoItem({
  label,
  delta,
  unit = "",
  invert = false,
}: {
  label: string;
  delta: number;
  unit?: string;
  invert?: boolean;
}) {
  const isGood = invert ? delta <= 0 : delta >= 0;
  const Icon =
    delta === 0 ? null : delta < 0 ? TrendingDown : TrendingUp;

  return (
    <div className="flex flex-col gap-1.5 bg-gray-50 rounded-2xl p-3">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <div className="flex items-center gap-1">
        {Icon && (
          <Icon
            size={13}
            className={isGood ? "text-emerald-500" : "text-red-500"}
          />
        )}
        <span
          className={cn(
            "text-lg font-bold",
            delta === 0
              ? "text-gray-400"
              : isGood
              ? "text-emerald-600"
              : "text-red-500"
          )}
        >
          {delta > 0 ? "+" : ""}
          {delta}
          {unit}
        </span>
      </div>
    </div>
  );
}
