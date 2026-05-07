"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, Coach, Horario } from "@/lib/api";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Alert, Spinner, Badge } from "@/components/ui";
import { CheckCircle } from "lucide-react";

const DIAS = [
  { label: "Lunes", short: "L" },
  { label: "Martes", short: "M" },
  { label: "Miércoles", short: "X" },
  { label: "Jueves", short: "J" },
  { label: "Viernes", short: "V" },
  { label: "Sábado", short: "S" },
  { label: "Domingo", short: "D" },
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

export default function HorariosPage() {
  const { user } = useAuth();
  const [coachId, setCoachId] = useState<string | null>(null);
  const [dias, setDias] = useState<DiaForm[]>(DIAS.map(() => ({ ...DEFAULT_DIA })));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.coachId) return;
    setCoachId(user.coachId);
    api.get<Horario[]>(`/api/coaches/${user.coachId}/horarios`).then((horarios) => {
      setDias(
        DIAS.map((_, i) => {
          const h = horarios.find((h) => h.diaSemana === i);
          if (h) return { activo: true, horaInicio: h.horaInicio, horaFin: h.horaFin, duracionCitaMinutos: h.duracionCitaMinutos };
          return { ...DEFAULT_DIA };
        })
      );
    }).finally(() => setLoading(false));
  }, [user]);

  function setDia(index: number, field: keyof DiaForm, value: string | number | boolean) {
    setDias((prev) => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
    setSuccess(false);
  }

  async function handleSave() {
    if (!coachId) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const payload = dias
        .map((d, i) => ({ ...d, diaSemana: i }))
        .filter((d) => d.activo)
        .map(({ activo: _, ...d }) => d);
      await api.post(`/api/coaches/${coachId}/horarios`, payload);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ProtectedPage roles={["COACH"]}><div className="flex justify-center py-12"><Spinner /></div></ProtectedPage>;

  return (
    <ProtectedPage roles={["COACH"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis horarios</h1>
          <p className="text-gray-500 text-sm mt-1">Configura tu disponibilidad semanal (horarios en UTC)</p>
        </div>

        {error && <Alert type="error">{error}</Alert>}
        {success && (
          <Alert type="success">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} />
              Horarios guardados correctamente
            </div>
          </Alert>
        )}

        <div className="space-y-3">
          {DIAS.map((dia, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Toggle día */}
                  <div className="flex items-center gap-3 w-28">
                    <input
                      type="checkbox"
                      id={`dia-${i}`}
                      checked={dias[i].activo}
                      onChange={(e) => setDia(i, "activo", e.target.checked)}
                      className="h-4 w-4 rounded text-sky-500 cursor-pointer"
                    />
                    <label htmlFor={`dia-${i}`} className={`text-sm font-medium cursor-pointer ${dias[i].activo ? "text-gray-900" : "text-gray-400"}`}>
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
                      <div className="flex items-center gap-2">
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
          Guardar horarios
        </Button>
      </div>
    </ProtectedPage>
  );
}
