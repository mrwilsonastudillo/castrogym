"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, Crown, AlertTriangle, TrendingDown, Activity,
  ChevronRight, Filter, X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, MetricasAdmin, ClienteSegmentado } from "@/lib/api";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner } from "@/components/ui";
import Link from "next/link";

const IMC_LABELS: Record<string, { label: string; color: string }> = {
  bajo_peso:   { label: "Bajo peso",   color: "#60a5fa" },
  normal:      { label: "Normal",      color: "#34d399" },
  sobrepeso:   { label: "Sobrepeso",   color: "#fbbf24" },
  obesidad_i:  { label: "Obesidad I",  color: "#f97316" },
  obesidad_ii: { label: "Obesidad II", color: "#ef4444" },
};

const OBJETIVO_LABELS: Record<string, string> = {
  PERDIDA_PESO:       "Pérdida grasa",
  GANANCIA_MUSCULAR:  "Masa muscular",
  TONIFICACION:       "Definición",
  ACONDICIONAMIENTO:  "Acondicionamiento",
  REHABILITACION:     "Rehabilitación",
  RENDIMIENTO:        "Rendimiento",
  OTRO:               "Otro",
};

const NICHO_LABELS: Record<string, string> = {
  lumbar:          "Lumbar",
  rodilla:         "Rodilla",
  hombro:          "Hombro",
  movilidad:       "Movilidad",
  hipertension:    "Hipertensión",
  obesidad:        "Obesidad",
  rehabilitacion:  "Rehabilitación",
  adultos_mayores: "Adultos mayores",
};

const PIE_COLORS = ["#0ea5e9", "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

function StatCard({
  label, value, sub, icon, colorClass,
}: {
  label: string; value: number | string; sub?: string; icon: React.ReactNode; colorClass: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colorClass}`}>
          {icon}
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Segmentación panel ────────────────────────────────────────────────────────

function SegmentacionPanel() {
  const [clientes, setClientes] = useState<ClienteSegmentado[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    genero: "", objetivo: "", esVIP: "", estadoMembresia: "", nicho: "",
    edadMin: "", edadMax: "",
  });

  function buscar() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtros.genero) params.set("genero", filtros.genero);
    if (filtros.objetivo) params.set("objetivo", filtros.objetivo);
    if (filtros.esVIP) params.set("esVIP", filtros.esVIP);
    if (filtros.estadoMembresia) params.set("estadoMembresia", filtros.estadoMembresia);
    if (filtros.nicho) params.set("nicho", filtros.nicho);
    if (filtros.edadMin) params.set("edadMin", filtros.edadMin);
    if (filtros.edadMax) params.set("edadMax", filtros.edadMax);
    api.get<ClienteSegmentado[]>(`/api/reportes/admin/segmentacion?${params}`)
      .then(setClientes)
      .finally(() => setLoading(false));
  }

  function limpiar() {
    setFiltros({ genero: "", objetivo: "", esVIP: "", estadoMembresia: "", nicho: "", edadMin: "", edadMax: "" });
    setClientes([]);
  }

  const selectCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-sky-500";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <select value={filtros.genero} onChange={(e) => setFiltros((f) => ({ ...f, genero: e.target.value }))} className={selectCls}>
          <option value="">Género: todos</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>
        <select value={filtros.objetivo} onChange={(e) => setFiltros((f) => ({ ...f, objetivo: e.target.value }))} className={selectCls}>
          <option value="">Objetivo: todos</option>
          {Object.entries(OBJETIVO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filtros.esVIP} onChange={(e) => setFiltros((f) => ({ ...f, esVIP: e.target.value }))} className={selectCls}>
          <option value="">Tipo: todos</option>
          <option value="true">VIP</option>
          <option value="false">Estándar</option>
        </select>
        <select value={filtros.estadoMembresia} onChange={(e) => setFiltros((f) => ({ ...f, estadoMembresia: e.target.value }))} className={selectCls}>
          <option value="">Membresía: todas</option>
          <option value="ACTIVO">Activa</option>
          <option value="INACTIVO">Inactiva</option>
        </select>
        <select value={filtros.nicho} onChange={(e) => setFiltros((f) => ({ ...f, nicho: e.target.value }))} className={selectCls}>
          <option value="">Limitación: todas</option>
          {Object.entries(NICHO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input
          type="number" placeholder="Edad min" min={0} max={100}
          value={filtros.edadMin}
          onChange={(e) => setFiltros((f) => ({ ...f, edadMin: e.target.value }))}
          className={selectCls}
        />
        <input
          type="number" placeholder="Edad max" min={0} max={100}
          value={filtros.edadMax}
          onChange={(e) => setFiltros((f) => ({ ...f, edadMax: e.target.value }))}
          className={selectCls}
        />
        <div className="flex gap-2">
          <Button onClick={buscar} loading={loading} className="flex-1">
            <Filter size={14} className="mr-1.5" />Filtrar
          </Button>
          <Button variant="secondary" onClick={limpiar} disabled={loading}>
            <X size={14} />
          </Button>
        </div>
      </div>

      {clientes.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">{clientes.length} clientes encontrados</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Nombre", "Edad", "Género", "Objetivo", "IMC", "Membresía", ""].map((h) => (
                    <th key={h} className="text-left py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 pr-4 font-medium text-gray-800">
                      {c.nombre}
                      {c.esVIP && <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">VIP</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600">{c.edad}a</td>
                    <td className="py-2.5 pr-4 text-gray-600">{c.genero === "M" ? "M" : "F"}</td>
                    <td className="py-2.5 pr-4 text-gray-600">{OBJETIVO_LABELS[c.objetivo] ?? c.objetivo}</td>
                    <td className="py-2.5 pr-4">
                      {c.imc ? (
                        <span className={`text-xs font-medium ${IMC_LABELS[c.clasificacionIMC ?? ""]?.color ? "" : ""}`}>
                          {c.imc.toFixed(1)}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2.5 pr-4">
                      {c.estadoMembresia === "ACTIVO"
                        ? <Badge variant="success">Activa</Badge>
                        : <Badge variant="danger">Inactiva</Badge>}
                    </td>
                    <td className="py-2.5">
                      <Link href={`/clientes/${c.id}`} className="text-xs text-sky-500 hover:text-sky-600 flex items-center gap-0.5 font-medium">
                        Ver <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

function ReportesContent() {
  const [metricas, setMetricas] = useState<MetricasAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"resumen" | "segmentacion">("resumen");

  useEffect(() => {
    api.get<MetricasAdmin>("/api/reportes/admin/metricas")
      .then(setMetricas)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!metricas) return null;

  // Prepare chart data
  const imcData = Object.entries(metricas.imc).map(([k, v]) => ({
    name: IMC_LABELS[k]?.label ?? k,
    value: v.count,
    fill: IMC_LABELS[k]?.color ?? "#ccc",
  }));

  const objetivosData = Object.entries(metricas.objetivos).map(([k, v]) => ({
    name: OBJETIVO_LABELS[k] ?? k,
    value: v,
  }));

  const nichosData = Object.entries(metricas.limitaciones.nichos)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({
      name: NICHO_LABELS[k] ?? k,
      value: v,
    }));

  const vipData = [
    { name: "VIP", value: metricas.clientes.vip },
    { name: "Estándar", value: metricas.clientes.estandar },
  ];

  return (
    <div className="space-y-6">
      {/* Header + tabs */}
      <div>
        <p className="text-sm text-gray-400">Análisis y métricas</p>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <div className="flex gap-1 mt-4 border-b border-gray-200">
          {(["resumen", "segmentacion"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t ? "border-sky-500 text-sky-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "resumen" ? "Resumen" : "Segmentación"}
            </button>
          ))}
        </div>
      </div>

      {tab === "resumen" && (
        <>
          {/* KPIs clientes */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Clientes</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total clientes" value={metricas.clientes.total} icon={<Users size={16} />} colorClass="text-sky-500 bg-sky-50" />
              <StatCard label="Activos" value={metricas.clientes.activos} icon={<Activity size={16} />} colorClass="text-green-500 bg-green-50" />
              <StatCard label="Inactivos" value={metricas.clientes.inactivos} icon={<TrendingDown size={16} />} colorClass="text-red-400 bg-red-50" />
              <StatCard label="Clientes VIP" value={metricas.clientes.vip} icon={<Crown size={16} />} colorClass="text-amber-500 bg-amber-50" />
            </div>
          </div>

          {/* Métricas del mes */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Este mes</p>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Nuevos" value={metricas.clientes.nuevosEsteMes} icon={<Users size={16} />} colorClass="text-sky-500 bg-sky-50" />
              <StatCard label="Renovaciones" value={metricas.clientes.renovacionesEsteMes} icon={<Activity size={16} />} colorClass="text-green-500 bg-green-50" />
              <StatCard label="Cancelaciones" value={metricas.clientes.cancelacionesEsteMes} icon={<AlertTriangle size={16} />} colorClass="text-red-400 bg-red-50" />
            </div>
          </div>

          {/* Alertas */}
          {(metricas.alertas.sinMedicionReciente > 0 || metricas.alertas.membresiasPorVencer > 0) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Alertas</p>
              {metricas.alertas.sinMedicionReciente > 0 && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    <strong>{metricas.alertas.sinMedicionReciente}</strong> clientes activos sin medición en los últimos 90 días
                  </p>
                </div>
              )}
              {metricas.alertas.membresiasPorVencer > 0 && (
                <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                  <AlertTriangle size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-orange-700">
                    <strong>{metricas.alertas.membresiasPorVencer}</strong> membresías vencen en los próximos 7 días
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* IMC */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Distribución IMC</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={imcData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v} clientes`]} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {imcData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* VIP vs Estándar */}
            <Card>
              <CardHeader><CardTitle className="text-sm">VIP vs Estándar</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={vipData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {vipData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} clientes`]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Objetivos */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Objetivos físicos</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={objetivosData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 80 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(v) => [`${v} clientes`]} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Nichos de limitaciones */}
            {nichosData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Limitaciones físicas</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 mb-3">
                      {metricas.limitaciones.totalConLimitaciones} clientes ({metricas.limitaciones.porcentaje}%) reportan limitaciones
                    </p>
                    {nichosData.map(({ name, value }) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-28 flex-shrink-0">{name}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-violet-400 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (value / metricas.limitaciones.totalConLimitaciones) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-6 text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {tab === "segmentacion" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Segmentación dinámica</CardTitle></CardHeader>
          <CardContent><SegmentacionPanel /></CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ReportesPage() {
  return (
    <ProtectedPage roles={["ADMIN", "COACH"]}>
      <ReportesContent />
    </ProtectedPage>
  );
}
