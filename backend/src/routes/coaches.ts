import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { authenticate, requireRol } from "../middleware/auth";

const router = Router();

const CrearCoachSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nombre: z.string().min(2),
  especialidad: z.string().optional(),
  telefono: z.string().optional(),
});

const HorariosSchema = z.array(
  z.object({
    diaSemana: z.number().int().min(0).max(6),
    horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
    horaFin: z.string().regex(/^\d{2}:\d{2}$/),
    duracionCitaMinutos: z.number().int().min(15).max(120).default(30),
  })
);

// Lista de coaches activos (público, para que clientes puedan agendar)
router.get("/", async (_req: Request, res: Response) => {
  const coaches = await prisma.coach.findMany({
    where: { activo: true },
    include: {
      usuario: { select: { id: true, nombre: true, email: true } },
      horarios: true,
    },
    orderBy: { usuario: { nombre: "asc" } },
  });
  res.json(coaches);
});

// Crear coach: solo admin
router.post("/", authenticate, requireRol("ADMIN"), async (req: Request, res: Response) => {
  const parsed = CrearCoachSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const data = parsed.data;

  const existe = await prisma.usuario.findUnique({ where: { email: data.email } });
  if (existe) {
    res.status(409).json({ error: "Email ya registrado" });
    return;
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const usuario = await prisma.usuario.create({
    data: {
      email: data.email,
      passwordHash,
      nombre: data.nombre,
      rol: "COACH",
      coach: {
        create: {
          especialidad: data.especialidad,
          telefono: data.telefono,
        },
      },
    },
    include: { coach: true },
  });

  res.status(201).json({
    id: usuario.coach?.id,
    usuarioId: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    especialidad: usuario.coach?.especialidad,
    telefono: usuario.coach?.telefono,
  });
});

// Ver horarios de un coach
router.get("/:id/horarios", async (req: Request, res: Response) => {
  const coach = await prisma.coach.findUnique({ where: { id: req.params.id } });
  if (!coach) {
    res.status(404).json({ error: "Coach no encontrado" });
    return;
  }

  const horarios = await prisma.horarioCoach.findMany({
    where: { coachId: req.params.id },
    orderBy: { diaSemana: "asc" },
  });
  res.json(horarios);
});

// Configurar horarios: solo el propio coach o admin
router.post("/:id/horarios", authenticate, async (req: Request, res: Response) => {
  const coach = await prisma.coach.findUnique({
    where: { id: req.params.id },
    include: { usuario: true },
  });
  if (!coach) {
    res.status(404).json({ error: "Coach no encontrado" });
    return;
  }

  const user = req.user!;
  const esPropioCoach = user.rol === "COACH" && coach.usuarioId === user.userId;
  if (!esPropioCoach && user.rol !== "ADMIN") {
    res.status(403).json({ error: "Sin permiso" });
    return;
  }

  const parsed = HorariosSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Eliminar días que ya no están activos (no incluidos en el payload)
  const diasRecibidos = parsed.data.map((h) => h.diaSemana);
  await prisma.horarioCoach.deleteMany({
    where: { coachId: req.params.id, diaSemana: { notIn: diasRecibidos } },
  });

  // Upsert cada día recibido
  const horarios = await Promise.all(
    parsed.data.map((h) =>
      prisma.horarioCoach.upsert({
        where: { coachId_diaSemana: { coachId: req.params.id, diaSemana: h.diaSemana } },
        update: {
          horaInicio: h.horaInicio,
          horaFin: h.horaFin,
          duracionCitaMinutos: h.duracionCitaMinutos,
        },
        create: {
          coachId: req.params.id,
          diaSemana: h.diaSemana,
          horaInicio: h.horaInicio,
          horaFin: h.horaFin,
          duracionCitaMinutos: h.duracionCitaMinutos,
        },
      })
    )
  );

  res.json(horarios);
});

export default router;
