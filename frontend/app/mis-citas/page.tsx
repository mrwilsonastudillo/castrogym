"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Calendar, Crown, Clock, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, Cita } from "@/lib/api";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner, Alert } from "@/components/ui";

function estadoBadge(estado: string) {
  if (estado === "AGENDADA") return <Badge variant="info">Agendada</Badge>;
  if (estado === "COMPLETADA") return <Badge variant="success">Completada</Badge>;
  return <Badge variant="danger">Cancelada</Badge>;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Minutos hasta que empieza la cita */
function minutosHastaCita(fechaInicio: string): number {
  return (new Date(fechaInicio).getTime() - Date.now()) / 60_000;
}

export default function MisCitasPage() {
  const { user } = useAuth();
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Ventana de cancelación según membresía (frontend informativo)
  const ventanaMinutos = user?.esVIP ? 30 : 120;

  useEffect(() => {
    api.get<Cita[]>("/api/citas")
      .then(setCitas)
      .finally(() => setLoading(false));
  }, []);

  async function cancelarCita(id: string) {
    setCancelando(id);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/api/citas/${id}/cancelar`);
      setCitas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, estado: "CANCELADA" as const } : c))
      );
      setSuccess("Cita cancelada correctamente.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCancelando(null);
    }
  }

  const proximas = citas.filter(
    (c) => c.estado === "AGENDADA" && new Date(c.fechaInicio) > new Date()
  ).sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));

  const pasadas = citas.filter(
    (c) => c.estado !== "AGENDADA" || new Date(c.fechaInicio) <= new Date()
  ).sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));

  return (
    <ProtectedPage roles={["CLIENTE"]}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-400 font-medium">Reservas</p>
            <h1 className="text-2xl font-bold text-gray-900">Mis citas</h1>
          </div>
          <Link href="/agendar">
            <Button size="sm">
              <CalendarPlus size={14} className="mr-1.5" />Nueva cita
            </Button>
          </Link>
        </div>

        {/* Política de cancelación */}
        <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 border ${user?.esVIP ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
          {user?.esVIP
            ? <Crown size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            : <Clock size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
          }
          <p className={`text-xs ${user?.esVIP ? "text-amber-800" : "text-gray-500"}`}>
            {user?.esVIP
              ? <>Membresía <strong>VIP</strong>: puedes cancelar hasta <strong>30 minutos</strong> antes de la cita.</>
              : <>Membresía <strong>STANDARD</strong>: cancelación hasta <strong>2 horas</strong> antes de la cita.</>
            }
          </p>
        </div>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <>
            {/* Próximas */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Próximas ({proximas.length})
              </p>
              {proximas.length === 0 ? (
                <Card>
                  <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
                    <Calendar size={36} className="text-gray-300" />
                    <p className="text-sm font-medium text-gray-500">Sin citas próximas</p>
                    <Link href="/agendar">
                      <Button size="sm" variant="secondary">
                        <CalendarPlus size={13} className="mr-1.5" />Agendar
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {proximas.map((c) => {
                    const minutos = minutosHastaCita(c.fechaInicio);
                    const puedeCancelar = minutos > ventanaMinutos;
                    return (
                      <Card key={c.id} className="border-sky-100">
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Calendar size={17} className="text-sky-500" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 capitalize text-sm">
                                  {formatFecha(c.fechaInicio)}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Coach: <span className="font-medium">{c.coach.usuario.nombre}</span>
                                </p>
                                {c.notas && (
                                  <p className="text-xs text-gray-400 mt-0.5">{c.notas}</p>
                                )}
                                {!puedeCancelar && (
                                  <p className="text-xs text-orange-500 mt-1">
                                    Ya no se puede cancelar (menos de {ventanaMinutos >= 60 ? `${ventanaMinutos / 60}h` : `${ventanaMinutos} min`})
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              {estadoBadge(c.estado)}
                              {puedeCancelar && (
                                <button
                                  onClick={() => cancelarCita(c.id)}
                                  disabled={cancelando === c.id}
                                  className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors"
                                >
                                  <X size={12} />
                                  {cancelando === c.id ? "Cancelando…" : "Cancelar"}
                                </button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Historial */}
            {pasadas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Historial ({pasadas.length})
                </p>
                <div className="space-y-2">
                  {pasadas.slice(0, 10).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-700 capitalize">
                          {new Date(c.fechaInicio).toLocaleDateString("es-CL", {
                            weekday: "short", day: "numeric", month: "short", year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(c.fechaInicio).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                          {" · "}Coach: {c.coach.usuario.nombre}
                        </p>
                      </div>
                      {estadoBadge(c.estado)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedPage>
  );
}
