import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { authenticate, requireRol } from "../middleware/auth";
import { encolarNotificacion } from "../services/notificaciones";

const router = Router();

const MembresiaSchema = z.object({
  clienteId: z.string().uuid(),
  tipo: z.enum(["MENSUAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL", "VIP"]),
  fechaInicio: z.string().datetime(),
  fechaFin: z.string().datetime(),
  precio: z.number().positive(),
  notas: z.string().optional(),
});

const UpdateMembresiaSchema = z.object({
  estado: z.enum(["ACTIVA", "VENCIDA", "CANCELADA"]).optional(),
  fechaFin: z.string().datetime().optional(),
  notas: z.string().optional(),
});

// Crear membresía (solo admin)
router.post("/", authenticate, requireRol("ADMIN"), async (req: Request, res: Response) => {
  const parsed = MembresiaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const data = parsed.data;

  const cliente = await prisma.cliente.findUnique({
    where: { id: data.clienteId },
    include: { usuario: { select: { email: true, nombre: true } } },
  });
  if (!cliente) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }

  // Cancelar membresías activas previas
  await prisma.membresia.updateMany({
    where: { clienteId: data.clienteId, estado: "ACTIVA" },
    data: { estado: "CANCELADA" },
  });

  const esVIP = data.tipo === "VIP";

  const membresia = await prisma.$transaction(async (tx) => {
    const m = await tx.membresia.create({
      data: {
        clienteId: data.clienteId,
        tipo: data.tipo,
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: new Date(data.fechaFin),
        precio: data.precio,
        estado: "ACTIVA",
        notas: data.notas,
      },
    });

    // Actualizar esVIP en el cliente
    await tx.cliente.update({
      where: { id: data.clienteId },
      data: { esVIP },
    });

    return m;
  });

  // Notificar al cliente
  await encolarNotificacion("MEMBRESIA_ACTIVADA" as any, cliente.usuario.email, {
    nombreCliente: cliente.usuario.nombre,
    tipo: data.tipo,
    fechaFin: new Date(data.fechaFin).toLocaleDateString("es-CL"),
  });

  res.status(201).json(membresia);
});

// Historial de membresías de un cliente
router.get("/cliente/:clienteId", authenticate, async (req: Request, res: Response) => {
  const { clienteId } = req.params;

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
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

  const membresias = await prisma.membresia.findMany({
    where: { clienteId },
    orderBy: { createdAt: "desc" },
  });

  // Agregar estado calculado derivado de fechaFin
  const ahora = new Date();
  const enriched = membresias.map((m) => ({
    ...m,
    estadoCalculado: calcularEstadoMembresia(m, ahora),
  }));

  res.json(enriched);
});

// Actualizar membresía (admin)
router.patch("/:id", authenticate, requireRol("ADMIN"), async (req: Request, res: Response) => {
  const parsed = UpdateMembresiaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const membresia = await prisma.membresia.findUnique({ where: { id: req.params.id } });
  if (!membresia) {
    res.status(404).json({ error: "Membresía no encontrada" });
    return;
  }

  const data = parsed.data;
  const updated = await prisma.membresia.update({
    where: { id: req.params.id },
    data: {
      estado: data.estado,
      fechaFin: data.fechaFin ? new Date(data.fechaFin) : undefined,
      notas: data.notas,
    },
  });

  // Si se cancela o vence, actualizar esVIP si era VIP
  if ((data.estado === "CANCELADA" || data.estado === "VENCIDA") && membresia.tipo === "VIP") {
    await prisma.cliente.update({
      where: { id: membresia.clienteId },
      data: { esVIP: false },
    });
  }

  res.json(updated);
});

export function calcularEstadoMembresia(
  m: { estado: string; fechaFin: Date },
  ahora: Date = new Date()
): "ACTIVO" | "INACTIVO" | "POR_VENCER" {
  if (m.estado !== "ACTIVA") return "INACTIVO";
  const diasRestantes = Math.ceil((m.fechaFin.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
  if (diasRestantes <= 0) return "INACTIVO";
  if (diasRestantes <= 7) return "POR_VENCER";
  return "ACTIVO";
}

export default router;
