"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ChevronLeft, ChevronRight, Crown, Info } from "lucide-react";
import { api, Coach, Slot } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Button, Alert, Spinner, cn } from "@/components/ui";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDate(d: Date) {
  return d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}

export default function AgendarPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Coach[]>("/api/coaches").then(setCoaches);
  }, []);

  useEffect(() => {
    if (!selectedCoach || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    api
      .get<Slot[]>(`/api/citas/disponibilidad?coachId=${selectedCoach.id}&fecha=${toDateStr(selectedDate)}`)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [selectedCoach, selectedDate]);

  async function confirmar() {
    if (!selectedCoach || !selectedDate || !selectedSlot) return;
    setBooking(true);
    setError("");
    try {
      // Los slots se muestran en hora Colombia (UTC-5).
      // Convertimos a UTC sumando 5h antes de enviar al backend.
      const [slotH, slotM] = selectedSlot.horaInicio.split(":").map(Number);
      const utcH = slotH + 5;
      const isoDate = utcH >= 24
        ? toDateStr(addDays(selectedDate!, 1))
        : toDateStr(selectedDate!);
      const fechaInicio = `${isoDate}T${String(utcH % 24).padStart(2, "0")}:${String(slotM).padStart(2, "0")}:00.000Z`;
      await api.post("/api/citas", {
        coachId: selectedCoach.id,
        fechaInicio,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  }

  if (success) {
    return (
      <ProtectedPage roles={["CLIENTE"]}>
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <CheckCircle size={56} className="text-green-500" />
          <h2 className="text-xl font-bold text-gray-900">¡Cita agendada!</h2>
          <p className="text-gray-500">
            {formatDate(selectedDate!)} a las {selectedSlot?.horaInicio} con {selectedCoach?.usuario.nombre}
          </p>
          <Button onClick={() => router.push("/dashboard")}>Ir al inicio</Button>
        </div>
      </ProtectedPage>
    );
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <ProtectedPage roles={["CLIENTE"]}>
      <div className="space-y-5">
        <div>
          <p className="text-sm text-gray-400 font-medium">Reserva</p>
          <h1 className="text-2xl font-bold text-gray-900">Agendar cita</h1>
        </div>

        {/* Info de ventana según membresía */}
        {user?.esVIP ? (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Crown size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Como cliente <strong>VIP</strong> puedes agendar hasta{" "}
              <strong>60 días</strong> de anticipación y cancelar hasta{" "}
              <strong>30 minutos</strong> antes.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <Info size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-500">
              Membresía <strong>STANDARD</strong>: agendamiento hasta{" "}
              <strong>30 días</strong> de anticipación · cancelación hasta{" "}
              <strong>2 horas</strong> antes.
            </p>
          </div>
        )}

        {error && <Alert type="error">{error}</Alert>}

        {/* Step 1: Coach */}
        <Card>
          <CardHeader><CardTitle>1. Selecciona un coach</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {coaches.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCoach(c); setSelectedDate(null); setSlots([]); setSelectedSlot(null); }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                    selectedCoach?.id === c.id
                      ? "border-sky-500 bg-sky-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  {c.fotoPerfil ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}${c.fotoPerfil}`}
                      alt={c.usuario.nombre}
                      className="h-9 w-9 rounded-full object-cover flex-shrink-0 border border-gray-200"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-sm flex-shrink-0">
                      {c.usuario.nombre.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{c.usuario.nombre}</p>
                    {c.especialidad && <p className="text-xs text-gray-500">{c.especialidad}</p>}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Date */}
        {selectedCoach && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>2. Selecciona una fecha</CardTitle>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
                    className="p-1 rounded hover:bg-gray-100"
                    disabled={addDays(currentWeekStart, -1) < today}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))} className="p-1 rounded hover:bg-gray-100">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((d, i) => {
                  const isPast = d < today;
                  const isSelected = selectedDate && toDateStr(d) === toDateStr(selectedDate);
                  const isToday = toDateStr(d) === toDateStr(today);
                  return (
                    <button
                      key={i}
                      onClick={() => !isPast && setSelectedDate(d)}
                      disabled={isPast}
                      className={cn(
                        "flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs transition-colors",
                        isSelected ? "bg-sky-500 text-white" : "",
                        !isSelected && !isPast ? "hover:bg-sky-50 text-gray-700" : "",
                        isPast ? "text-gray-300 cursor-not-allowed" : "",
                        isToday && !isSelected ? "font-bold text-sky-600" : ""
                      )}
                    >
                      <span className="text-[10px] uppercase">{DIAS[i]}</span>
                      <span className="text-base font-semibold">{d.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Slot */}
        {selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle>3. Selecciona un horario</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5 capitalize">{formatDate(selectedDate)}</p>
            </CardHeader>
            <CardContent>
              {loadingSlots ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : slots.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Sin horarios disponibles para este día</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.filter((s) => s.disponible).map((s) => (
                    <button
                      key={s.horaInicio}
                      onClick={() => setSelectedSlot(s)}
                      className={cn(
                        "py-2 rounded-lg text-sm font-medium border transition-colors",
                        selectedSlot?.horaInicio === s.horaInicio
                          ? "border-sky-500 bg-sky-500 text-white"
                          : "border-gray-200 hover:border-sky-300 text-gray-700"
                      )}
                    >
                      {s.horaInicio}
                    </button>
                  ))}
                  {slots.filter((s) => s.disponible).length === 0 && (
                    <p className="col-span-4 text-center text-gray-500 text-sm py-4">Todos los horarios están ocupados</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Confirm */}
        {selectedSlot && (
          <Card className="border-sky-200 bg-sky-50">
            <CardContent className="pt-5">
              <p className="text-sm font-medium text-gray-700 mb-3">Resumen de tu cita:</p>
              <div className="space-y-1 text-sm text-gray-600 mb-4">
                <p><span className="font-medium">Coach:</span> {selectedCoach?.usuario.nombre}</p>
                <p><span className="font-medium">Fecha:</span> {formatDate(selectedDate!)}</p>
                <p><span className="font-medium">Hora:</span> {selectedSlot.horaInicio} – {selectedSlot.horaFin} (UTC)</p>
              </div>
              <Button onClick={confirmar} loading={booking} className="w-full">
                Confirmar cita
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedPage>
  );
}
