import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { authenticate, requireRol } from "../middleware/auth";
import { getSlotsDisponibles, jsDayToNuestro } from "../services/disponibilidad";
import { encolarNotificacion } from "../services/notificaciones";
import { getCancelationWindow } from "../services/vip";

const router = Router();

const AgendarCitaSchema = z.object({
  coachId: z.string().uuid(),
  fechaInicio: z.string().datetime(),
  notas: z.string().optional(),
});

// Disponibilidad del día
router.get("/disponibilidad", authenticate, async (req: Request, res: Response) => {
  const { coachId, fecha } = req.query as { coachId?: string; fecha?: string };

  if (!coachId || !fecha) {
    res.status(400).json({ error: "coachId y fecha son requeridos" });
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    res.status(400).json({ error: "Formato de fecha inválido (YYYY-MM-DD)" });
    return;
  }

  const coach = await prisma.coach.findUnique({ where: { id: coachId } });
  if (!coach) {
    res.status(404).json({ error: "Coach no encontrado" });
    return;
  }

  const slots = await getSlotsDisponibles(coachId, fecha);
  res.json(slots);
});

// Agendar cita (cliente)
router.post("/", authenticate, requireRol("CLIENTE"), async (req: Request, res: Response) => {
  const parsed = AgendarCitaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const cliente = await prisma.cliente.findUnique({
    where: { usuarioId: req.user!.userId },
    include: { usuario: { select: { email: true, nombre: true } } },
  });
  if (!cliente) {
    res.status(404).json({ error: "Perfil de cliente no encontrado" });
    return;
  }

  // Verificar membresía activa
  const ahora = new Date();
  const membresiaActiva = await prisma.membresia.findFirst({
    where: {
      clienteId: cliente.id,
      estado: "ACTIVA",
      fechaFin: { gte: ahora },
    },
  });

  if (!membresiaActiva) {
    res.status(403).json({
      error: "Tu membresía está vencida o no tienes una membresía activa. Por favor renueva para agendar citas.",
      codigo: "MEMBRESIA_VENCIDA",
    });
    return;
  }

  const coach = await prisma.coach.findUnique({
    where: { id: parsed.data.coachId },
    include: { usuario: { select: { nombre: true, email: true } } },
  });
  if (!coach || !coach.activo) {
    res.status(404).json({ error: "Coach no encontrado o inactivo" });
    return;
  }

  const fechaInicio = new Date(parsed.data.fechaInicio);

  // Límite de agendamiento: VIP = 60 días, regular = 30 días
  const diasMaximo = cliente.esVIP ? 60 : 30;
  const limiteAgendamiento = new Date(ahora.getTime() + diasMaximo * 24 * 60 * 60 * 1000);
  if (fechaInicio > limiteAgendamiento) {
    res.status(400).json({
      error: `Solo puedes agendar hasta ${diasMaximo} días de anticipación.`,
    });
    return;
  }

  // Validar disponibilidad usando el mismo código que muestra los slots al cliente
  // — garantiza consistencia sin importar el timezone del servidor.
  const fechaStr = fechaInicio.toISOString().slice(0, 10); // YYYY-MM-DD en UTC
  const slotHora = `${fechaInicio.getUTCHours().toString().padStart(2, "0")}:${fechaInicio.getUTCMinutes().toString().padStart(2, "0")}`;

  const slotsDelDia = await getSlotsDisponibles(coach.id, fechaStr);
  const slotSolicitado = slotsDelDia.find((s) => s.horaInicio === slotHora);

  if (!slotSolicitado) {
    res.status(409).json({ error: "El horario solicitado no existe en la agenda del coach" });
    return;
  }
  if (!slotSolicitado.disponible) {
    const msg =
      slotSolicitado.razon === "pasado"  ? "Este horario ya pasó" :
      slotSolicitado.razon === "ocupado" ? "Este horario ya está reservado" :
      "Horario no disponible";
    res.status(409).json({ error: msg });
    return;
  }

  // Obtener duración real del horario (usando UTC para el día)
  const diaSemana = jsDayToNuestro(fechaInicio.getUTCDay());
  const horario = await prisma.horarioCoach.findUnique({
    where: { coachId_diaSemana: { coachId: coach.id, diaSemana } },
  });

  const duracion = horario?.duracionCitaMinutos ?? 30;
  const fechaFin = new Date(fechaInicio.getTime() + duracion * 60000);

  const cita = await prisma.cita.create({
    data: {
      clienteId: cliente.id,
      coachId: coach.id,
      fechaInicio,
      fechaFin,
      notas: parsed.data.notas,
    },
    include: {
      coach: { include: { usuario: { select: { nombre: true, email: true } } } },
      cliente: { include: { usuario: { select: { nombre: true } } } },
    },
  });

  // Notificar confirmación
  await encolarNotificacion("CITA_CONFIRMADA", cliente.usuario.email, {
    nombreCliente: cliente.usuario.nombre,
    nombreCoach: coach.usuario.nombre,
    fecha: fechaInicio.toLocaleDateString("es-CL"),
    hora: fechaInicio.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
  });

  res.status(201).json(cita);
});

// Listar citas
router.get("/", authenticate, async (req: Request, res: Response) => {
  const user = req.user!;

  let where: Record<string, unknown> = {};

  if (user.rol === "CLIENTE") {
    const cliente = await prisma.cliente.findUnique({ where: { usuarioId: user.userId } });
    if (!cliente) { res.json([]); return; }
    where = { clienteId: cliente.id };
  } else if (user.rol === "COACH") {
    const coach = await prisma.coach.findUnique({ where: { usuarioId: user.userId } });
    if (!coach) { res.json([]); return; }
    where = { coachId: coach.id };
  }

  const citas = await prisma.cita.findMany({
    where,
    include: {
      coach: { include: { usuario: { select: { nombre: true } } } },
      cliente: { include: { usuario: { select: { nombre: true } } } },
    },
    orderBy: { fechaInicio: "desc" },
  });

  res.json(citas);
});

// Cancelar cita
router.patch("/:id/cancelar", authenticate, async (req: Request, res: Response) => {
  const cita = await prisma.cita.findUnique({
    where: { id: req.params.id },
    include: {
      cliente: {
        select: {
          usuarioId: true,
          esVIP: true,
          usuario: { select: { email: true, nombre: true } },
        },
      },
      coach: { include: { usuario: { select: { nombre: true } } } },
    },
  });

  if (!cita) {
    res.status(404).json({ error: "Cita no encontrada" });
    return;
  }

  if (cita.estado !== "AGENDADA") {
    res.status(400).json({ error: "Solo se pueden cancelar citas con estado AGENDADA" });
    return;
  }

  const user = req.user!;
  const esPropioCliente = user.rol === "CLIENTE" && cita.cliente.usuarioId === user.userId;
  const esPropioCoach = user.rol === "COACH" && cita.coach.usuarioId === user.userId;
  if (!esPropioCliente && !esPropioCoach && user.rol !== "ADMIN") {
    res.status(403).json({ error: "Sin permiso" });
    return;
  }

  // Ventana de cancelación: VIP = 30 min, STANDARD = 120 min. Admins y coaches no tienen restricción.
  if (esPropioCliente) {
    const ventanaMinutos = getCancelationWindow(cita.cliente);
    const limiteMs = Date.now() + ventanaMinutos * 60 * 1000;
    if (cita.fechaInicio.getTime() <= limiteMs) {
      const horas = ventanaMinutos / 60;
      const label = horas < 1
        ? `${ventanaMinutos} minutos`
        : horas === 1 ? "1 hora" : `${horas} horas`;
      res.status(400).json({
        error: `No puedes cancelar con menos de ${label} de anticipación`,
        ventanaMinutos,
      });
      return;
    }
  }

  const citaCancelada = await prisma.cita.update({
    where: { id: req.params.id },
    data: { estado: "CANCELADA" },
  });

  // Notificar cancelación al cliente
  await encolarNotificacion("CITA_CANCELADA", cita.cliente.usuario.email, {
    nombreCliente: cita.cliente.usuario.nombre,
    nombreCoach: cita.coach.usuario.nombre,
    fecha: cita.fechaInicio.toLocaleDateString("es-CL"),
    hora: cita.fechaInicio.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
  });

  res.json(citaCancelada);
});

// Reasignar cita a otro coach (solo admin)
router.patch("/:id/reasignar", authenticate, requireRol("ADMIN"), async (req: Request, res: Response) => {
  const { nuevoCoachId } = req.body;

  if (!nuevoCoachId || typeof nuevoCoachId !== "string") {
    res.status(400).json({ error: "nuevoCoachId es requerido" });
    return;
  }

  const cita = await prisma.cita.findUnique({
    where: { id: req.params.id },
    include: {
      cliente: { include: { usuario: { select: { nombre: true } } } },
      coach:   { include: { usuario: { select: { nombre: true } } } },
    },
  });

  if (!cita) {
    res.status(404).json({ error: "Cita no encontrada" });
    return;
  }

  if (cita.estado !== "AGENDADA") {
    res.status(400).json({ error: "Solo se pueden reasignar citas con estado AGENDADA" });
    return;
  }

  if (nuevoCoachId === cita.coachId) {
    res.status(400).json({ error: "El nuevo coach debe ser diferente al actual" });
    return;
  }

  const nuevoCoach = await prisma.coach.findUnique({
    where: { id: nuevoCoachId },
    include: { usuario: { select: { nombre: true } } },
  });

  if (!nuevoCoach || !nuevoCoach.activo) {
    res.status(404).json({ error: "Coach no encontrado o inactivo" });
    return;
  }

  // Obtener la duración del horario del nuevo coach para ese día
  const diaSemana = jsDayToNuestro(cita.fechaInicio.getUTCDay());
  const horario = await prisma.horarioCoach.findUnique({
    where: { coachId_diaSemana: { coachId: nuevoCoachId, diaSemana } },
  });

  if (!horario) {
    res.status(409).json({
      error: `${nuevoCoach.usuario.nombre} no tiene horario configurado para ese día`,
    });
    return;
  }

  const duracion = horario.duracionCitaMinutos;

  // Verificar disponibilidad del nuevo coach (excluir la cita actual del check)
  const fechaFin = new Date(cita.fechaInicio.getTime() + duracion * 60000);
  const solapamiento = await prisma.cita.findFirst({
    where: {
      coachId: nuevoCoachId,
      estado: "AGENDADA",
      id: { not: cita.id },
      fechaInicio: { lt: fechaFin },
      fechaFin: { gt: cita.fechaInicio },
    },
  });

  if (solapamiento) {
    res.status(409).json({
      error: `${nuevoCoach.usuario.nombre} ya tiene una cita en ese horario`,
    });
    return;
  }

  const citaActualizada = await prisma.cita.update({
    where: { id: cita.id },
    data: { coachId: nuevoCoachId, fechaFin },
    include: {
      coach:   { include: { usuario: { select: { nombre: true } } } },
      cliente: { include: { usuario: { select: { nombre: true } } } },
    },
  });

  res.json(citaActualizada);
});

export default router;
