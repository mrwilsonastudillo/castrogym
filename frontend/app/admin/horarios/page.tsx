"use client";
import { useEffect, useState } from "react";
import { api, Coach, Horario } from "@/lib/api";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Alert, Spinner, Badge } from "@/components/ui";
import { CheckCircle, Calendar } from "lucide-react";

const DIAS = [
  { label: "Lunes",     short: "L" },
  { label: "Martes",    short: "M" },
  { label: "Miércoles", short: "X" },
  { label: "Jueves",    short: "J" },
  { label: "Viernes",   short: "V" },
  { label: "Sábado",    short: "S" },
  { label: "Domingo",   short: "D" },
];

interface DiaForm {
  activo: boolean;
  horaInicio: string;
  horaFin: string;
  duracionCitaMinutos: number;
}

const DEFAULT_DIA: DiaForm = {
  activo: false,
  horaInicio: "06:00",
  horaFin: "20:00",
  duracionCitaMinutos: 30,
};

export default function AdminHorariosPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string>("");
  const [dias, setDias] = useState<DiaForm[]>(DIAS.map(() => ({ ...DEFAULT_DIA })));
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Coach[]>("/api/coaches")
      .then(setCoaches)
      .finally(() => setLoadingCoaches(false));
  }, []);

  function handleCoachChange(coachId: string) {
    setSelectedCoachId(coachId);
    setSuccess(false);
    setError("");
    setDias(DIAS.map(() => ({ ...DEFAULT_DIA })));

    if (!coachId) return;

    setLoadingHorarios(true);
    api.get<Horario[]>(`/api/coaches/${coachId}/horarios`)
      .then((horarios) => {
        setDias(
          DIAS.map((_, i) => {
            const h = horarios.find((h) => h.diaSemana === i);
            if (h) return { activo: true, horaInicio: h.horaInicio, horaFin: h.horaFin, duracionCitaMinutos: h.duracionCitaMinutos };
            return { ...DEFAULT_DIA };
          })
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingHorarios(false));
  }

  function setDia(index: number, field: keyof DiaForm, value: string | number | boolean) {
    setDias((prev) => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
    setSuccess(false);
  }

  async function handleSave() {
    if (!selectedCoachId) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const payload = dias
        .map((d, i) => ({ ...d, diaSemana: i }))
        .filter((d) => d.activo)
        .map(({ activo: _, ...d }) => d);
      await api.post(`/api/coaches/${selectedCoachId}/horarios`, payload);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedCoach = coaches.find((c) => c.id === selectedCoachId);

  return (
    <ProtectedPage roles={["ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-sm text-gray-400 font-medium">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de horarios</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configura la disponibilidad semanal de cualquier coach.
          </p>
        </div>

        {/* Selector de coach */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar size={16} className="text-sky-500" />
              Seleccionar coach
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCoaches ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedCoachId}
                  onChange={(e) => handleCoachChange(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">— Seleccionar coach —</option>
                  {coaches.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {coach.usuario.nombre}
                      {coach.especialidad ? ` · ${coach.especialidad}` : ""}
                    </option>
                  ))}
                </select>
                {selectedCoach && (
                  <div className="flex items-center gap-2">
                    <Badge variant="info">
                      {selectedCoach.usuario.email}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulario de horarios */}
        {selectedCoachId && (
          <>
            {error && <Alert type="error">{error}</Alert>}
            {success && (
              <Alert type="success">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  Horarios guardados correctamente para {selectedCoach?.usuario.nombre}
                </div>
              </Alert>
            )}

            {loadingHorarios ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <>
                <div className="space-y-3">
                  {DIAS.map((dia, i) => (
                    <Card key={i}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-4 flex-wrap">
                          {/* Toggle día */}
                          <div className="flex items-center gap-3 w-28">
                            <input
                              type="checkbox"
                              id={`dia-admin-${i}`}
                              checked={dias[i].activo}
                              onChange={(e) => setDia(i, "activo", e.target.checked)}
                              className="h-4 w-4 rounded text-sky-500 cursor-pointer"
                            />
                            <label
                              htmlFor={`dia-admin-${i}`}
                              className={`text-sm font-medium cursor-pointer ${dias[i].activo ? "text-gray-900" : "text-gray-400"}`}
                            >
                              {dia.label}
                            </label>
                          </div>

                          {dias[i].activo ? (
                            <div className="flex items-center gap-3 flex-wrap flex-1">
                              <Input
                                type="time"
                                value={dias[i].horaInicio}
                                onChange={(e) => setDia(i, "horaInicio", e.target.value)}
                                className="w-32"
                              />
                              <span className="text-gray-400 text-sm">hasta</span>
                              <Input
                                type="time"
                                value={dias[i].horaFin}
                                onChange={(e) => setDia(i, "horaFin", e.target.value)}
                                className="w-32"
                              />
                              <select
                                value={dias[i].duracionCitaMinutos}
                                onChange={(e) => setDia(i, "duracionCitaMinutos", parseInt(e.target.value))}
                                className="rounded-lg border border-gray-300 px-2 py-2 text-sm bg-white focus:outline-none focus:border-sky-500"
                              >
                                <option value={15}>15 min</option>
                                <option value={30}>30 min</option>
                                <option value={45}>45 min</option>
                                <option value={60}>60 min</option>
                                <option value={90}>90 min</option>
                              </select>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No disponible</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Button onClick={handleSave} loading={saving} className="w-full" size="lg">
                  Guardar horarios de {selectedCoach?.usuario.nombre}
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </ProtectedPage>
  );
}
