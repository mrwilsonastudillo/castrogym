"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, Reporte } from "@/lib/api";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Button, Alert } from "@/components/ui";
import { InsightCard } from "@/components/InsightCard";
import { generateMeasurementRecommendations } from "@/lib/recommendations";
import { MessageCircle, Dumbbell, Sparkles } from "lucide-react";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-2xl ${className ?? ""}`} />;
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function EntrenamientoPage() {
  const { user } = useAuth();
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.clienteId) {
      setLoading(false);
      return;
    }
    api
      .get<Reporte>(`/api/reportes/cliente/${user.clienteId}`)
      .then(setReporte)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const recommendations = reporte ? generateMeasurementRecommendations(reporte) : [];
  const nombre = reporte?.cliente.usuario.nombre.split(" ")[0] ?? user?.nombre?.split(" ")[0] ?? "";

  return (
    <ProtectedPage roles={["CLIENTE"]}>
      <div className="space-y-6 pb-8">
        {/* ── Header ── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Contenido
          </p>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-0.5">
            Plan de entrenamiento
          </h1>
          {nombre && (
            <p className="text-sm text-gray-400 mt-1">Personalizado para {nombre}</p>
          )}
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {/* ── Recomendaciones para ti ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-sky-500" />
              <CardTitle className="text-sm font-semibold">Recomendaciones para ti</CardTitle>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Basadas en tu última medición y evolución registrada
            </p>
          </CardHeader>
          <CardContent className="pt-0 space-y-2.5">
            {loading ? (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </>
            ) : recommendations.length > 0 ? (
              recommendations.map((rec, i) => (
                <InsightCard key={i} insight={rec} />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-3xl mb-3">📊</p>
                <p className="text-sm font-semibold text-gray-600">Sin datos aún</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  Registra tu primera medición para ver recomendaciones personalizadas.
                </p>
                <div className="mt-4">
                  <a href="/agendamedidas/agendar">
                    <Button size="sm">Agendar cita</Button>
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Plan general ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Dumbbell size={16} className="text-sky-500" />
              <CardTitle className="text-sm font-semibold">Tu plan de trabajo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  emoji: "🏋️",
                  title: "Fuerza",
                  desc: "3–4 sesiones semanales con progresión de cargas.",
                },
                {
                  emoji: "🏃",
                  title: "Cardio",
                  desc: "2–3 sesiones de 30 min a intensidad moderada.",
                },
                {
                  emoji: "🥗",
                  title: "Nutrición",
                  desc: "Déficit o superávit según tu objetivo. Proteína: 1.6–2 g/kg.",
                },
              ].map((block) => (
                <div
                  key={block.title}
                  className="bg-gray-50 rounded-2xl p-4 space-y-1.5"
                >
                  <p className="text-2xl">{block.emoji}</p>
                  <p className="text-sm font-semibold text-gray-800">{block.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{block.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Acompañamiento profesional (siempre visible) ── */}
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none shrink-0">🎓</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sky-900">Acompañamiento profesional</p>
              <p className="text-xs text-sky-700 mt-1 leading-relaxed">
                Estas recomendaciones son orientativas y deben complementarse con el
                acompañamiento de un coach certificado Castro Gym.
              </p>
              <div className="mt-3">
                <a href="/agendamedidas/agendar">
                  <Button size="sm" className="gap-1.5">
                    <MessageCircle size={14} /> Contactar coach
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
