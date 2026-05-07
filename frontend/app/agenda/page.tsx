"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Crown } from "lucide-react";
import { api, Cita } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner, Button } from "@/components/ui";

function estadoBadge(estado: string) {
  if (estado === "AGENDADA") return <Badge variant="info">Agendada</Badge>;
  if (estado === "COMPLETADA") return <Badge variant="success">Completada</Badge>;
  return <Badge variant="danger">Cancelada</Badge>;
}

export default function AgendaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    api.get<Cita[]>("/api/citas")
      .then(setCitas)
      .finally(() => setLoading(false));
  }, []);

  const fechaStr = viewDate.toLocaleDateString("es-CL", {
    weekday: "long", day: "numeric", month: "long",
  });

  const citasDelDia = citas.filter((c) => {
    const d = new Date(c.fechaInicio);
    d.setUTCHours(d.getUTCHours()); // keep UTC
    return (
      d.toISOString().slice(0, 10) === viewDate.toISOString().slice(0, 10)
    );
  }).sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));

  function changeDay(delta: number) {
    setViewDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + delta);
      return nd;
    });
  }

  return (
    <ProtectedPage roles={["COACH"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Mi agenda</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => changeDay(-1)}>←</Button>
            <Button variant="ghost" size="sm" onClick={() => setViewDate(new Date(new Date().setHours(0,0,0,0)))}>Hoy</Button>
            <Button variant="ghost" size="sm" onClick={() => changeDay(1)}>→</Button>
          </div>
        </div>

        <p className="text-gray-500 capitalize -mt-3">{fechaStr}</p>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : citasDelDia.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
              <Calendar size={40} className="text-gray-300" />
              <p className="text-gray-500">Sin citas para este día</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {citasDelDia.map((c) => {
              const inicio = new Date(c.fechaInicio);
              const fin = new Date(c.fechaFin);
              const hora = `${inicio.getUTCHours().toString().padStart(2,"0")}:${inicio.getUTCMinutes().toString().padStart(2,"0")} – ${fin.getUTCHours().toString().padStart(2,"0")}:${fin.getUTCMinutes().toString().padStart(2,"0")}`;
              return (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center w-16">
                        <p className="text-lg font-bold text-sky-600">{hora.split(" – ")[0]}</p>
                        <p className="text-xs text-gray-400">UTC</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-gray-900">{c.cliente.usuario.nombre}</p>
                          {c.cliente.esVIP && (
                            <span className="inline-flex items-center gap-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                              <Crown size={10} />VIP
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{hora}</p>
                        {c.notas && <p className="text-xs text-gray-400 mt-0.5">{c.notas}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {estadoBadge(c.estado)}
                      {c.estado === "AGENDADA" && (
                        <Button
                          size="sm"
                          onClick={() => router.push(`/cita/${c.id}`)}
                        >
                          Tomar medidas
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
