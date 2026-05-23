"use client";
import { useEffect, useState } from "react";
import {
  Crown, FileText, ChevronDown, ChevronUp,
  Utensils, Dumbbell, AlertCircle, Pill, Star, Target, MessageSquare,
  Lock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, PlanVIP, Reporte } from "@/lib/api";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner } from "@/components/ui";

const SECCIONES_CONFIG = [
  { key: "dieta",           label: "Dieta",            icon: <Utensils size={16} />,     color: "text-green-600 bg-green-50" },
  { key: "habitos",         label: "Hábitos",           icon: <Star size={16} />,         color: "text-amber-600 bg-amber-50" },
  { key: "recomendaciones", label: "Recomendaciones",   icon: <MessageSquare size={16} />, color: "text-sky-600 bg-sky-50" },
  { key: "metaFisica",      label: "Meta física",       icon: <Target size={16} />,       color: "text-violet-600 bg-violet-50" },
  { key: "suplementacion",  label: "Suplementación",    icon: <Pill size={16} />,         color: "text-indigo-600 bg-indigo-50" },
  { key: "restricciones",   label: "Restricciones",     icon: <AlertCircle size={16} />,  color: "text-red-600 bg-red-50" },
  { key: "observaciones",   label: "Observaciones",     icon: <FileText size={16} />,     color: "text-gray-600 bg-gray-100" },
] as const;

function SeccionPlan({
  icon, label, color, contenido,
}: {
  icon: React.ReactNode; label: string; color: string; contenido: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <span className="text-sm font-semibold text-gray-800">{label}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && (
        <CardContent className="pt-0 pb-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{contenido}</p>
        </CardContent>
      )}
    </Card>
  );
}

function MiPlanContent() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanVIP | null>(null);
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [esVIP, setEsVIP] = useState(false);

  useEffect(() => {
    if (!user?.clienteId) return;

    Promise.all([
      api.get<PlanVIP[]>(`/api/planes/cliente/${user.clienteId}`).catch(() => [] as PlanVIP[]),
      api.get<Reporte>(`/api/reportes/cliente/${user.clienteId}`).catch(() => null),
    ]).then(([planes, rep]) => {
      const activo = planes.find((p) => p.activo) ?? planes[0] ?? null;
      setPlan(activo);
      setReporte(rep);
      setEsVIP(user.esVIP ?? false);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  if (!esVIP) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
          <Lock size={28} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Contenido exclusivo VIP</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">
            Los planes personalizados están disponibles solo para miembros VIP.
            Contáctanos para conocer los beneficios.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
          <Crown size={20} className="text-amber-500" />
        </div>
        <div>
          <p className="text-sm text-gray-400">Exclusivo VIP</p>
          <h1 className="text-xl font-bold text-gray-900">Mi plan personalizado</h1>
        </div>
      </div>

      {/* Progreso rápido */}
      {reporte?.actual && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Tu progreso actual</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Peso</p>
                <p className="text-lg font-bold text-gray-900">{reporte.actual.pesoKg}<span className="text-xs text-gray-400 ml-0.5">kg</span></p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">IMC</p>
                <p className="text-lg font-bold text-gray-900">{reporte.actual.imc.toFixed(1)}</p>
              </div>
              {reporte.actual.icc && (
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-amber-600 mb-1">ICC</p>
                  <p className="text-lg font-bold text-amber-700">{reporte.actual.icc.toFixed(2)}</p>
                </div>
              )}
            </div>
            {reporte.progreso && (
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span>{reporte.progreso.totalMediciones} mediciones registradas</span>
                {reporte.progreso.pesoCambio !== 0 && (
                  <span className={reporte.progreso.pesoCambio < 0 ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
                    {reporte.progreso.pesoCambio > 0 ? "+" : ""}{reporte.progreso.pesoCambio}kg vs inicio
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan activo */}
      {!plan ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <FileText size={22} className="text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Aún no tienes un plan asignado</p>
            <p className="text-xs text-gray-400 mt-0.5">Tu coach te asignará un plan pronto</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Info del plan */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-gray-900 text-base">{plan.titulo}</h2>
                  {plan.objetivo && <p className="text-sm text-gray-500 mt-0.5">{plan.objetivo}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>Coach: {plan.coach?.usuario.nombre}</span>
                    <span>Desde: {new Date(plan.fechaInicio).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}</span>
                    {plan.fechaFin && (
                      <span>Hasta: {new Date(plan.fechaFin).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge variant="success">Activo</Badge>
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">v{plan.version}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Secciones estructuradas */}
          {SECCIONES_CONFIG.filter(({ key }) => plan[key as keyof PlanVIP]).map(({ key, label, icon, color }) => (
            <SeccionPlan
              key={key}
              label={label}
              icon={icon}
              color={color}
              contenido={plan[key as keyof PlanVIP] as string}
            />
          ))}

          {/* Si no hay ninguna sección estructurada, mostrar el texto del PDF legiblemente */}
          {SECCIONES_CONFIG.every(({ key }) => !plan[key as keyof PlanVIP]) && (
            plan.textoExtraido ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText size={16} className="text-sky-500" />Contenido de tu plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    {plan.textoExtraido.split(/\n{2,}/).map((parrafo, i) => (
                      <p key={i} className="text-sm text-gray-700 leading-relaxed mb-3 whitespace-pre-wrap">
                        {parrafo.trim()}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-6 text-sm text-gray-400">
                <FileText size={28} className="mx-auto mb-2 text-gray-300" />
                El plan aún no tiene contenido cargado. Tu coach lo actualizará pronto.
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default function MiPlanPage() {
  return (
    <ProtectedPage roles={["CLIENTE"]}>
      <MiPlanContent />
    </ProtectedPage>
  );
}
