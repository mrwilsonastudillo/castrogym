"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarPlus, Users, Calendar, BarChart2, Crown,
  CreditCard, AlertTriangle, ChevronRight, Activity,
  Clock, RefreshCw, X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, Cita, AdminStats, CitaHoyDetalle, Medicion, Cliente, Coach } from "@/lib/api";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner } from "@/components/ui";
import { UserAvatar } from "@/components/UserAvatar";

function estadoCitaBadge(estado: string) {
  if (estado === "AGENDADA") return <Badge variant="info">Agendada</Badge>;
  if (estado === "COMPLETADA") return <Badge variant="success">Completada</Badge>;
  return <Badge variant="danger">Cancelada</Badge>;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    weekday: "long", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function imcLabel(imc: number) {
  if (imc < 18.5) return { label: "Bajo peso", color: "text-blue-600" };
  if (imc < 25) return { label: "Normal", color: "text-green-600" };
  if (imc < 30) return { label: "Sobrepeso", color: "text-yellow-600" };
  if (imc < 35) return { label: "Obesidad I", color: "text-orange-600" };
  return { label: "Obesidad II+", color: "text-red-600" };
}

// ─── Cliente Dashboard ────────────────────────────────────────────────────────

function ClienteDashboard() {
  const { user } = useAuth();
  const [citas, setCitas] = useState<Cita[]>([]);
  const [ultimaMedicion, setUltimaMedicion] = useState<Medicion | null>(null);
  const [clienteInfo, setClienteInfo] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.clienteId) return;
    Promise.all([
      api.get<Cita[]>("/api/citas"),
      api.get<Medicion[]>(`/api/mediciones/cliente/${user.clienteId}`).catch(() => [] as Medicion[]),
      api.get<Cliente>(`/api/clientes/${user.clienteId}`).catch(() => null),
    ])
      .then(([c, m, cl]) => {
        setCitas(c);
        if (m.length > 0) setUltimaMedicion(m[m.length - 1]);
        if (cl) setClienteInfo(cl);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  const proxima = citas.find((c) => c.estado === "AGENDADA" && new Date(c.fechaInicio) > new Date());
  const membresiaActual = clienteInfo?.membresiaActual;
  const estadoMembresia = clienteInfo?.estadoMembresia;
  const nombre = user?.nombre?.split(" ")[0] ?? "";

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400 font-medium">{saludo}</p>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
            {nombre}
            {clienteInfo?.esVIP && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                <Crown size={11} />VIP
              </span>
            )}
          </h1>
          {!clienteInfo?.esVIP && (
            <p className="text-xs text-gray-400 mt-0.5">
              Membresía{" "}
              <span className="font-medium text-gray-600">STANDARD</span>
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <UserAvatar
            personajeId={user?.avatarPersonaje}
            size={64}
            showName
          />
        </div>
      </div>

      {/* Alertas membresía */}
      {estadoMembresia === "INACTIVO" && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle size={17} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            Tu membresía está vencida.{" "}
            <strong>No puedes agendar citas.</strong>{" "}
            Contacta a la administración para renovar.
          </p>
        </div>
      )}
      {estadoMembresia === "POR_VENCER" && membresiaActual && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={17} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Tu membresía vence el{" "}
            <strong>{new Date(membresiaActual.fechaFin).toLocaleDateString("es-CL", { day: "numeric", month: "long" })}</strong>.
            Renueva pronto.
          </p>
        </div>
      )}

      {/* Próxima cita */}
      <Card>
        <CardContent className="pt-5 pb-5">
          {proxima ? (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                <Calendar size={18} className="text-sky-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Próxima cita</p>
                <p className="font-semibold text-gray-900 capitalize">{formatFecha(proxima.fechaInicio)}</p>
                <p className="text-sm text-gray-500 mt-0.5">Coach: {proxima.coach.usuario.nombre}</p>
              </div>
              {estadoCitaBadge(proxima.estado)}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <Calendar size={22} className="text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Sin citas próximas</p>
                <p className="text-xs text-gray-400">Agenda una sesión con tu coach</p>
              </div>
              {estadoMembresia !== "INACTIVO" && (
                <Link href="/agendar">
                  <Button size="sm">
                    <CalendarPlus size={14} className="mr-1.5" />Agendar ahora
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Última medición */}
      {ultimaMedicion && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Última medición</CardTitle>
              <Link
                href="/mis-mediciones"
                className="text-xs text-sky-500 hover:text-sky-600 flex items-center gap-0.5 font-medium"
              >
                Ver todo <ChevronRight size={13} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <MetricBox
                label="Peso"
                value={`${ultimaMedicion.pesoKg}`}
                unit="kg"
                color="text-sky-600"
              />
              <MetricBox
                label="IMC"
                value={ultimaMedicion.imc.toFixed(1)}
                sub={imcLabel(ultimaMedicion.imc).label}
                color={imcLabel(ultimaMedicion.imc).color}
              />
              {clienteInfo?.esVIP && ultimaMedicion.icc ? (
                <MetricBox label="ICC" value={ultimaMedicion.icc.toFixed(2)} color="text-purple-600" />
              ) : (
                <MetricBox label="Mediciones" value={`${clienteInfo?.totalMediciones ?? 0}`} color="text-gray-600" />
              )}
            </div>
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
              <Clock size={11} />
              {new Date(ultimaMedicion.fechaMedicion).toLocaleDateString("es-CL", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Accesos rápidos */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Accesos rápidos</p>
        <div className="grid grid-cols-2 gap-3">
          {estadoMembresia !== "INACTIVO" && (
            <QuickAction href="/agendar" icon={<CalendarPlus size={20} />} label="Agendar cita" color="sky" />
          )}
          <QuickAction href="/mis-mediciones" icon={<BarChart2 size={20} />} label="Mis mediciones" color="violet" />
          <QuickAction href="/mi-cuenta/mis-datos" icon={<Users size={20} />} label="Mis datos" color="slate" />
          {!clienteInfo?.esVIP && (
            <div className="relative">
              <QuickAction href="#" icon={<Crown size={20} />} label="Ir a VIP" color="amber" />
              <div className="absolute -top-1.5 -right-1.5">
                <span className="text-[9px] bg-amber-400 text-white font-bold px-1.5 py-0.5 rounded-full">PRO</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricBox({
  label, value, unit, sub, color,
}: {
  label: string; value: string; unit?: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
      <p className={`text-xl font-bold ${color ?? "text-gray-900"}`}>
        {value}
        {unit && <span className="text-sm font-normal text-gray-400 ml-0.5">{unit}</span>}
      </p>
      {sub && <p className={`text-xs font-medium mt-0.5 ${color ?? "text-gray-500"}`}>{sub}</p>}
    </div>
  );
}

function QuickAction({
  href, icon, label, color,
}: {
  href: string; icon: React.ReactNode; label: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    sky: "bg-sky-50 text-sky-500 group-hover:bg-sky-100",
    violet: "bg-violet-50 text-violet-500 group-hover:bg-violet-100",
    slate: "bg-slate-100 text-slate-500 group-hover:bg-slate-200",
    amber: "bg-amber-50 text-amber-500 group-hover:bg-amber-100",
  };
  return (
    <Link href={href}>
      <div className="group flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:border-gray-300 hover:shadow-sm transition-all">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${colorMap[color]}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
    </Link>
  );
}

// ─── Coach Dashboard ──────────────────────────────────────────────────────────

function CoachDashboard() {
  const router = useRouter();
  useEffect(() => { router.replace("/agenda"); }, [router]);
  return <div className="flex justify-center py-12"><Spinner /></div>;
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Reasignación
  const [citaReasignar, setCitaReasignar] = useState<CitaHoyDetalle | null>(null);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [nuevoCoachId, setNuevoCoachId] = useState("");
  const [reasignandoLoading, setReasignandoLoading] = useState(false);
  const [reasignandoError, setReasignandoError] = useState("");

  function cargarStats() {
    setLoading(true);
    api.get<AdminStats>("/api/admin/stats")
      .then(setStats)
      .finally(() => setLoading(false));
  }

  useEffect(() => { cargarStats(); }, []);

  function abrirModal(cita: CitaHoyDetalle) {
    setCitaReasignar(cita);
    setNuevoCoachId("");
    setReasignandoError("");
    if (coaches.length === 0) {
      api.get<Coach[]>("/api/coaches").then(setCoaches);
    }
  }

  function cerrarModal() {
    setCitaReasignar(null);
    setReasignandoError("");
  }

  async function confirmarReasignacion() {
    if (!citaReasignar || !nuevoCoachId) return;
    setReasignandoLoading(true);
    setReasignandoError("");
    try {
      await api.patch(`/api/citas/${citaReasignar.id}/reasignar`, { nuevoCoachId });
      cerrarModal();
      cargarStats();
    } catch (err: any) {
      setReasignandoError(err.message);
    } finally {
      setReasignandoLoading(false);
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const citasHoy = stats?.citasHoyDetalle ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-400">Resumen general</p>
        <h1 className="text-2xl font-bold text-gray-900">Panel Admin</h1>
      </div>

      {/* Métricas principales */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Actividad</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AdminStat label="Clientes" value={stats?.totalClientes ?? 0} icon={<Users size={18} />} colorClass="text-sky-500 bg-sky-50" />
          <AdminStat label="Coaches" value={stats?.totalCoaches ?? 0} icon={<Activity size={18} />} colorClass="text-violet-500 bg-violet-50" />
          <AdminStat label="Citas este mes" value={stats?.citasMes ?? 0} icon={<Calendar size={18} />} colorClass="text-green-500 bg-green-50" />
          <AdminStat label="Citas hoy" value={stats?.citasHoy ?? 0} icon={<CalendarPlus size={18} />} colorClass="text-orange-500 bg-orange-50" />
        </div>
      </div>

      {/* Citas del día */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Citas de hoy</p>
        <Card>
          <CardContent className="pt-4 pb-2">
            {citasHoy.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No hay citas agendadas para hoy.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Hora", "Cliente", "Coach", "Estado", ""].map((h) => (
                        <th key={h} className="text-left py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {citasHoy.map((cita) => (
                      <tr key={cita.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-2.5 pr-4 font-medium text-gray-800 whitespace-nowrap">
                          {new Date(cita.fechaInicio).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-2.5 pr-4 text-gray-700">{cita.clienteNombre}</td>
                        <td className="py-2.5 pr-4 text-gray-600">{cita.coachNombre}</td>
                        <td className="py-2.5 pr-4">
                          {cita.estado === "AGENDADA"   && <Badge variant="info">Agendada</Badge>}
                          {cita.estado === "COMPLETADA" && <Badge variant="success">Completada</Badge>}
                          {cita.estado === "CANCELADA"  && <Badge variant="danger">Cancelada</Badge>}
                        </td>
                        <td className="py-2.5">
                          {cita.estado === "AGENDADA" && (
                            <button
                              onClick={() => abrirModal(cita)}
                              className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
                            >
                              <RefreshCw size={12} />Reasignar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Membresías */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Membresías</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AdminStat label="Activos" value={stats?.clientesActivos ?? 0} icon={<CreditCard size={18} />} colorClass="text-emerald-500 bg-emerald-50" />
          <AdminStat label="Inactivos" value={stats?.clientesInactivos ?? 0} icon={<CreditCard size={18} />} colorClass="text-red-400 bg-red-50" />
          <AdminStat label="Por vencer (7d)" value={stats?.membresiasPorVencer ?? 0} icon={<AlertTriangle size={18} />} colorClass="text-amber-500 bg-amber-50" />
          <AdminStat label="Clientes VIP" value={stats?.clientesVIP ?? 0} icon={<Crown size={18} />} colorClass="text-yellow-500 bg-yellow-50" highlight />
        </div>
      </div>

      {/* Acciones */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Gestión</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AdminLink href="/clientes" icon={<Users size={18} />} label="Clientes" />
          <AdminLink href="/coaches" icon={<Activity size={18} />} label="Coaches" />
          <AdminLink href="/admin/membresias" icon={<CreditCard size={18} />} label="Membresías" />
          <AdminLink href="/admin/horarios" icon={<Calendar size={18} />} label="Horarios" />
        </div>
      </div>

      {/* Modal reasignación */}
      {citaReasignar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-gray-900">Reasignar cita</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {citaReasignar.clienteNombre} ·{" "}
                  {new Date(citaReasignar.fechaInicio).toLocaleString("es-CL", {
                    weekday: "short", day: "numeric", month: "short",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Coach actual: <span className="font-medium text-gray-700">{citaReasignar.coachNombre}</span></p>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nuevo coach</label>
              <select
                value={nuevoCoachId}
                onChange={(e) => { setNuevoCoachId(e.target.value); setReasignandoError(""); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-sky-500"
              >
                <option value="">— Seleccionar coach —</option>
                {coaches
                  .filter((c) => c.id !== citaReasignar.coachId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.usuario.nombre}</option>
                  ))}
              </select>
            </div>

            {reasignandoError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{reasignandoError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" onClick={cerrarModal}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={!nuevoCoachId}
                loading={reasignandoLoading}
                onClick={confirmarReasignacion}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminStat({
  label, value, icon, colorClass, highlight,
}: {
  label: string; value: number; icon: React.ReactNode; colorClass: string; highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "ring-1 ring-amber-200" : ""}>
      <CardContent className="pt-4 pb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colorClass}`}>
          {icon}
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function AdminLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:border-gray-300 hover:shadow-sm transition-all text-sm font-medium text-gray-700">
        <span className="text-gray-400">{icon}</span>
        {label}
      </div>
    </Link>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <ProtectedPage>
      {user?.rol === "CLIENTE" && <ClienteDashboard />}
      {user?.rol === "COACH" && <CoachDashboard />}
      {user?.rol === "ADMIN" && <AdminDashboard />}
    </ProtectedPage>
  );
}
