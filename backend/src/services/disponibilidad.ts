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

export async function getSlotsDisponibles(coachId: string, fecha: string): Promise<Slot[]> {
  // Parse as UTC midnight
  const fechaDate = new Date(fecha + "T00:00:00.000Z");
  const diaSemana = jsDayToNuestro(fechaDate.getUTCDay());

  const horario = await prisma.horarioCoach.findUnique({
    where: { coachId_diaSemana: { coachId, diaSemana } },
  });

  if (!horario) return [];

  const inicioDia = new Date(fecha + "T00:00:00.000Z");
  const finDia = new Date(fecha + "T23:59:59.000Z");

  const citasDelDia = await prisma.cita.findMany({
    where: {
      coachId,
      estado: "AGENDADA",
      fechaInicio: { gte: inicioDia, lte: finDia },
    },
  });

  const ahora = new Date();
  const slots: Slot[] = [];

  const inicio = timeToMinutes(horario.horaInicio);
  const fin = timeToMinutes(horario.horaFin);
  const duracion = horario.duracionCitaMinutos;

  for (let t = inicio; t + duracion <= fin; t += duracion) {
    const slotInicio = minutesToTime(t);
    const slotFin = minutesToTime(t + duracion);

    const slotInicioDate = new Date(`${fecha}T${slotInicio}:00.000Z`);
    const slotFinDate = new Date(`${fecha}T${slotFin}:00.000Z`);

    if (slotInicioDate <= ahora) {
      slots.push({ horaInicio: slotInicio, horaFin: slotFin, disponible: false, razon: "pasado" });
      continue;
    }

    const ocupado = citasDelDia.some(
      (c) => slotInicioDate < c.fechaFin && slotFinDate > c.fechaInicio
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
