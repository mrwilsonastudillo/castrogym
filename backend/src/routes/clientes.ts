import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma";
import { authenticate, requireRol } from "../middleware/auth";
import { calcularEstadoMembresia } from "./membresias";

const router = Router();

const UpdateClienteSchema = z.object({
  nombre: z.string().min(2).optional(),
  telefono: z.string().min(8).optional(),
  objetivo: z.enum(["PERDIDA_PESO", "GANANCIA_MUSCULAR", "TONIFICACION", "OTRO"]).optional(),
  limitacionesFisicas: z.string().optional(),
});

// Admin puede editar además: género, fecha nacimiento, email y password
const UpdateClienteAdminSchema = UpdateClienteSchema.extend({
  genero: z.enum(["M", "F"]).optional(),
  fechaNacimiento: z.string().datetime().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});

function getNivelAvatar(totalMediciones: number): { nivel: number; nombre: string } {
  if (totalMediciones <= 2) return { nivel: 1, nombre: "Novato" };
  if (totalMediciones <= 5) return { nivel: 2, nombre: "Comprometido" };
  if (totalMediciones <= 10) return { nivel: 3, nombre: "Constante" };
  if (totalMediciones <= 20) return { nivel: 4, nombre: "Dedicado" };
  return { nivel: 5, nombre: "Élite" };
}

async function enriquecerCliente(cliente: any, ahora: Date = new Date()) {
  // Obtener última membresía activa
  const ultimaMembresia = await prisma.membresia.findFirst({
    where: { clienteId: cliente.id },
    orderBy: { createdAt: "desc" },
  });

  const estadoMembresia = ultimaMembresia
    ? calcularEstadoMembresia(ultimaMembresia, ahora)
    : "INACTIVO";

  // Contar mediciones para avatar
  const totalMediciones = await prisma.medicion.count({ where: { clienteId: cliente.id } });
  const avatar = getNivelAvatar(totalMediciones);

  return {
    ...cliente,
    estadoMembresia,
    membresiaActual: ultimaMembresia,
    nivelAvatar: avatar,
    totalMediciones,
  };
}

// Lista: solo admin o coach
router.get("/", authenticate, requireRol("ADMIN", "COACH"), async (req: Request, res: Response) => {
  const { estado, esVIP } = req.query as { estado?: string; esVIP?: string };
  const ahora = new Date();

  const clientes = await prisma.cliente.findMany({
    where: esVIP === "true" ? { esVIP: true } : undefined,
    include: {
      usuario: { select: { id: true, email: true, nombre: true, activo: true, createdAt: true } },
    },
    orderBy: { usuario: { nombre: "asc" } },
  });

  // Enriquecer con membresía y avatar
  const enriched = await Promise.all(clientes.map((c) => enriquecerCliente(c, ahora)));

  // Filtrar por estado de membresía si se pide
  const filtered = estado
    ? enriched.filter((c) => c.estadoMembresia === estado)
    : enriched;

  res.json(filtered);
});

// Actualizar avatar del cliente autenticado
router.patch("/me/avatar", authenticate, requireRol("CLIENTE"), async (req: Request, res: Response) => {
  const { avatarPersonaje } = req.body;
  if (typeof avatarPersonaje !== "string" || avatarPersonaje.trim().length === 0) {
    res.status(400).json({ error: "avatarPersonaje requerido" });
    return;
  }

  const cliente = await prisma.cliente.findUnique({ where: { usuarioId: req.user!.userId } });
  if (!cliente) {
    res.status(404).json({ error: "Perfil de cliente no encontrado" });
    return;
  }

  await prisma.cliente.update({
    where: { id: cliente.id },
    data: { avatarPersonaje: avatarPersonaje.trim() },
  });

  res.json({ avatarPersonaje: avatarPersonaje.trim() });
});

// Export de datos propios (ARCO)
router.get("/me/export", authenticate, requireRol("CLIENTE"), async (req: Request, res: Response) => {
  const cliente = await prisma.cliente.findUnique({
    where: { usuarioId: req.user!.userId },
    include: {
      usuario: { select: { id: true, email: true, nombre: true, createdAt: true } },
      mediciones: true,
      citas: { include: { coach: { include: { usuario: { select: { nombre: true } } } } } },
      membresias: true,
    },
  });

  if (!cliente) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }

  res.setHeader("Content-Disposition", "attachment; filename=mis-datos-castro-gym.json");
  res.setHeader("Content-Type", "application/json");
  res.json({
    exportadoEn: new Date().toISOString(),
    datos: cliente,
  });
});

// Solicitar eliminación de cuenta (marca como inactivo)
router.delete("/me", authenticate, requireRol("CLIENTE"), async (req: Request, res: Response) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.user!.userId } });
  if (!usuario) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  // Marcar como inactivo (no eliminar físicamente por 5 años - norma fiscal)
  await prisma.usuario.update({
    where: { id: req.user!.userId },
    data: { activo: false },
  });

  res.json({ mensaje: "Tu cuenta ha sido marcada para desactivación. Tus datos se conservarán por 5 años según la normativa fiscal vigente (Ley 1581 de Colombia)." });
});

// Detalle: propio cliente, coach o admin
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  const cliente = await prisma.cliente.findUnique({
    where: { id: req.params.id },
    include: {
      usuario: { select: { id: true, email: true, nombre: true, activo: true, createdAt: true } },
    },
  });

  if (!cliente) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }

  const user = req.user!;
  const esPropioCliente = user.rol === "CLIENTE" && cliente.usuarioId === user.userId;
  if (!esPropioCliente && user.rol !== "COACH" && user.rol !== "ADMIN") {
    res.status(403).json({ error: "Sin permiso" });
    return;
  }

  const enriched = await enriquecerCliente(cliente);
  res.json(enriched);
});

// Actualizar: solo el propio cliente o admin
router.patch("/:id", authenticate, async (req: Request, res: Response) => {
  const cliente = await prisma.cliente.findUnique({ where: { id: req.params.id } });
  if (!cliente) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }

  const user = req.user!;
  const esPropioCliente = user.rol === "CLIENTE" && cliente.usuarioId === user.userId;
  if (!esPropioCliente && user.rol !== "ADMIN") {
    res.status(403).json({ error: "Sin permiso" });
    return;
  }

  // Admin usa schema extendido; cliente usa schema base
  const schema = user.rol === "ADMIN" ? UpdateClienteAdminSchema : UpdateClienteSchema;
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { nombre, email, password, genero, fechaNacimiento, ...clienteData } = parsed.data as any;

  // Verificar email único si el admin lo cambia
  if (email) {
    const existe = await prisma.usuario.findFirst({
      where: { email, NOT: { id: cliente.usuarioId } },
    });
    if (existe) {
      res.status(409).json({ error: "Email ya registrado" });
      return;
    }
  }

  await prisma.$transaction(async (tx) => {
    const usuarioData: Record<string, unknown> = {};
    if (nombre) usuarioData.nombre = nombre;
    if (email)  usuarioData.email  = email;
    if (password) usuarioData.passwordHash = await bcrypt.hash(password, 10);
    if (Object.keys(usuarioData).length > 0) {
      await tx.usuario.update({ where: { id: cliente.usuarioId }, data: usuarioData });
    }

    const clienteUpdate: Record<string, unknown> = { ...clienteData };
    if (genero) clienteUpdate.genero = genero;
    if (fechaNacimiento) clienteUpdate.fechaNacimiento = new Date(fechaNacimiento);
    if (Object.keys(clienteUpdate).length > 0) {
      await tx.cliente.update({ where: { id: req.params.id }, data: clienteUpdate });
    }
  });

  const actualizado = await prisma.cliente.findUnique({
    where: { id: req.params.id },
    include: { usuario: { select: { id: true, email: true, nombre: true } } },
  });

  res.json(actualizado);
});

export default router;
