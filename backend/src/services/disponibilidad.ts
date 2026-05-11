import { prisma } from "../utils/prisma";

export interface Slot {
  horaInicio: string; // "HH:mm" UTC
  horaFin: string;
  disponible: boolean;
  razon?: string;
}

// JS getUTCDay: 0=Dom, 1=Lun, ..., 6=Sab
// Nuestro schema: 0=Lun, 1=Mar, 2=Mie, 3=Jue, 4=Vie, 5=Sab, 6=Dom
export function jsDayToNuestro(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// Colombia es UTC-5 (sin horario de verano)
const COL_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Los horarios del coach se almacenan como strings HH:mm en hora local Colombia.
 * `fecha` llega como "YYYY-MM-DD" en hora local Colombia.
 * Toda comparación de "¿ya pasó este slot?" se hace en el dominio Colombia.
 */
export async function getSlotsDisponibles(coachId: string, fecha: string): Promise<Slot[]> {
  // El día de semana se calcula sobre la fecha Colombia (tratada como si fuera UTC)
  const fechaDate = new Date(fecha + "T00:00:00.000Z");
  const diaSemana = jsDayToNuestro(fechaDate.getUTCDay());

  const horario = await prisma.horarioCoach.findUnique({
    where: { coachId_diaSemana: { coachId, diaSemana } },
  });

  if (!horario) return [];

  // Citas guardadas en UTC: buscamos el rango del día Colombia en UTC
  // Colombia medianoche = UTC 05:00; Colombia 23:59 = UTC siguiente día 04:59
  const inicioDiaUTC = new Date(fecha + "T00:00:00.000Z");
  inicioDiaUTC.setTime(inicioDiaUTC.getTime() + COL_OFFSET_MS); // +5h → UTC
  const finDiaUTC = new Date(fecha + "T23:59:59.000Z");
  finDiaUTC.setTime(finDiaUTC.getTime() + COL_OFFSET_MS);

  const citasDelDia = await prisma.cita.findMany({
    where: {
      coachId,
      estado: "AGENDADA",
      fechaInicio: { gte: inicioDiaUTC, lte: finDiaUTC },
    },
  });

  // "Ahora" en hora Colombia, representado en el dominio UTC para comparar con los slots
  const ahoraCol = new Date(Date.now() - COL_OFFSET_MS);

  const slots: Slot[] = [];
  const inicio = timeToMinutes(horario.horaInicio);
  const fin = timeToMinutes(horario.horaFin);
  const duracion = horario.duracionCitaMinutos;

  for (let t = inicio; t + duracion <= fin; t += duracion) {
    const slotInicio = minutesToTime(t);
    const slotFin = minutesToTime(t + duracion);

    // Slot como Colombia-local datetime (en dominio UTC para comparar)
    const slotInicioCol = new Date(`${fecha}T${slotInicio}:00.000Z`);
    const slotFinCol   = new Date(`${fecha}T${slotFin}:00.000Z`);

    if (slotInicioCol <= ahoraCol) {
      slots.push({ horaInicio: slotInicio, horaFin: slotFin, disponible: false, razon: "pasado" });
      continue;
    }

    // Para solapamiento comparamos contra los datetime UTC reales de las citas
    const slotInicioUTC = new Date(slotInicioCol.getTime() + COL_OFFSET_MS);
    const slotFinUTC    = new Date(slotFinCol.getTime() + COL_OFFSET_MS);

    const ocupado = citasDelDia.some(
      (c) => slotInicioUTC < c.fechaFin && slotFinUTC > c.fechaInicio
    );

    slots.push({
      horaInicio: slotInicio,
      horaFin: slotFin,
      disponible: !ocupado,
      razon: ocupado ? "ocupado" : undefined,
    });
  }

  return slots;
}

export async function isSlotDisponible(
  coachId: string,
  fechaInicio: Date,
  duracionMinutos: number
): Promise<{ ok: boolean; razon?: string }> {
  if (fechaInicio <= new Date()) {
    return { ok: false, razon: "La fecha debe ser futura" };
  }

  const diaSemana = jsDayToNuestro(fechaInicio.getUTCDay());

  const horario = await prisma.horarioCoach.findUnique({
    where: { coachId_diaSemana: { coachId, diaSemana } },
  });

  if (!horario) {
    return { ok: false, razon: "El coach no tiene horario ese día" };
  }

  // Comparar en minutos UTC
  const slotInicioMin = fechaInicio.getUTCHours() * 60 + fechaInicio.getUTCMinutes();
  const slotFinMin = slotInicioMin + duracionMinutos;
  const horarioInicioMin = timeToMinutes(horario.horaInicio);
  const horarioFinMin = timeToMinutes(horario.horaFin);

  if (slotInicioMin < horarioInicioMin || slotFinMin > horarioFinMin) {
    return { ok: false, razon: "Fuera del horario del coach" };
  }

  const fechaFin = new Date(fechaInicio.getTime() + duracionMinutos * 60000);

  const solapamiento = await prisma.cita.findFirst({
    where: {
      coachId,
      estado: "AGENDADA",
      fechaInicio: { lt: fechaFin },
      fechaFin: { gt: fechaInicio },
    },
  });

  if (solapamiento) {
    return { ok: false, razon: "Slot ya ocupado" };
  }

  return { ok: true };
}
