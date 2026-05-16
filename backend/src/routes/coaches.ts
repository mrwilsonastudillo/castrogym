import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { authenticate, requireRol } from "../middleware/auth";

const router = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads", "coaches");

const CrearCoachSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nombre: z.string().min(2),
  especialidad: z.string().optional(),
  telefono: z.string().optional(),
});

const EditarCoachSchema = z.object({
  nombre: z.string().min(2).optional(),
  email: z.string().email().optional(),
  especialidad: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
});

const HorariosSchema = z.array(
  z.object({
    diaSemana: z.number().int().min(0).max(6),
    horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
    horaFin: z.string().regex(/^\d{2}:\d{2}$/),
    duracionCitaMinutos: z.number().int().min(15).max(120).default(30),
  })
);

// ─── Lista pública: solo coaches activos (para agendar) ───────────────────────
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

// ─── Todos los coaches (activos e inactivos): solo admin ──────────────────────
router.get("/all", authenticate, requireRol("ADMIN"), async (_req: Request, res: Response) => {
  const coaches = await prisma.coach.findMany({
    include: {
      usuario: { select: { id: true, nombre: true, email: true } },
      horarios: true,
    },
    orderBy: { usuario: { nombre: "asc" } },
  });
  res.json(coaches);
});

// ─── Coach edita sus propios datos ────────────────────────────────────────────
router.patch("/me", authenticate, requireRol("COACH"), async (req: Request, res: Response) => {
  const parsed = z.object({
    nombre: z.string().min(2).optional(),
    especialidad: z.string().optional().nullable(),
    telefono: z.string().optional().nullable(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const coach = await prisma.coach.findUnique({ where: { usuarioId: req.user!.userId } });
  if (!coach) {
    res.status(404).json({ error: "Coach no encontrado" });
    return;
  }

  const { nombre, ...coachFields } = parsed.data;

  if (nombre) {
    await prisma.usuario.update({ where: { id: req.user!.userId }, data: { nombre } });
  }
  await prisma.coach.update({ where: { id: coach.id }, data: coachFields });

  res.json({ message: "Datos actualizados" });
});

// ─── Coach sube su foto de perfil ─────────────────────────────────────────────
router.post("/me/foto", authenticate, requireRol("COACH"), async (req: Request, res: Response) => {
  const parsed = z.object({
    fotoBase64: z.string().min(1),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "fotoBase64 requerido" });
    return;
  }

  const coach = await prisma.coach.findUnique({ where: { usuarioId: req.user!.userId } });
  if (!coach) {
    res.status(404).json({ error: "Coach no encontrado" });
    return;
  }

  const dataUrl = parsed.data.fotoBase64;
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    res.status(400).json({ error: "Formato de imagen inválido" });
    return;
  }

  const ext = match[1].split("/")[1].replace("jpeg", "jpg");
  const buffer = Buffer.from(match[2], "base64");

  if (buffer.byteLength > 2 * 1024 * 1024) {
    res.status(400).json({ error: "La imagen no debe superar 2 MB" });
    return;
  }

  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  // Remove old photo if exists and has different extension
  if (coach.fotoPerfil) {
    const oldPath = path.resolve(process.cwd(), coach.fotoPerfil.replace(/^\//, ""));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const fileName = `${coach.id}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(filePath, buffer);

  const fotoUrl = `/uploads/coaches/${fileName}`;
  await prisma.coach.update({ where: { id: coach.id }, data: { fotoPerfil: fotoUrl } });

  res.json({ fotoPerfil: fotoUrl });
});

// ─── Crear coach: solo admin ──────────────────────────────────────────────────
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

// ─── Ver horarios de un coach ─────────────────────────────────────────────────
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

// ─── Configurar horarios: solo el propio coach o admin ───────────────────────
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

  const diasRecibidos = parsed.data.map((h) => h.diaSemana);
  await prisma.horarioCoach.deleteMany({
    where: { coachId: req.params.id, diaSemana: { notIn: diasRecibidos } },
  });

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

// ─── Editar datos de un coach: solo admin ────────────────────────────────────
router.patch("/:id", authenticate, requireRol("ADMIN"), async (req: Request, res: Response) => {
  const parsed = EditarCoachSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const coach = await prisma.coach.findUnique({
    where: { id: req.params.id },
    include: { usuario: true },
  });
  if (!coach) {
    res.status(404).json({ error: "Coach no encontrado" });
    return;
  }

  const { nombre, email, ...coachFields } = parsed.data;

  if (email && email !== coach.usuario.email) {
    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      res.status(409).json({ error: "Email ya registrado" });
      return;
    }
  }

  if (nombre || email) {
    await prisma.usuario.update({
      where: { id: coach.usuarioId },
      data: { ...(nombre && { nombre }), ...(email && { email }) },
    });
  }

  if (Object.keys(coachFields).length > 0) {
    await prisma.coach.update({ where: { id: req.params.id }, data: coachFields });
  }

  const updated = await prisma.coach.findUnique({
    where: { id: req.params.id },
    include: { usuario: { select: { id: true, nombre: true, email: true } }, horarios: true },
  });

  res.json(updated);
});

// ─── Reset password de coach: solo admin ─────────────────────────────────────
router.patch("/:id/reset-password", authenticate, requireRol("ADMIN"), async (req: Request, res: Response) => {
  const { nuevaPassword } = req.body;
  if (!nuevaPassword || typeof nuevaPassword !== "string" || nuevaPassword.length < 6) {
    res.status(400).json({ error: "nuevaPassword debe tener al menos 6 caracteres" });
    return;
  }

  const coach = await prisma.coach.findUnique({ where: { id: req.params.id } });
  if (!coach) {
    res.status(404).json({ error: "Coach no encontrado" });
    return;
  }

  const passwordHash = await bcrypt.hash(nuevaPassword, 10);
  await prisma.usuario.update({ where: { id: coach.usuarioId }, data: { passwordHash } });

  res.json({ message: "Contraseña actualizada correctamente" });
});

// ─── Activar / desactivar coach: solo admin ──────────────────────────────────
router.patch("/:id/activo", authenticate, requireRol("ADMIN"), async (req: Request, res: Response) => {
  const coach = await prisma.coach.findUnique({ where: { id: req.params.id } });
  if (!coach) {
    res.status(404).json({ error: "Coach no encontrado" });
    return;
  }

  const updated = await prisma.coach.update({
    where: { id: req.params.id },
    data: { activo: !coach.activo },
    include: { usuario: { select: { id: true, nombre: true, email: true } }, horarios: true },
  });

  res.json(updated);
});

export default router;
