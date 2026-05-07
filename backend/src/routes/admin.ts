import { Router, Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { authenticate, requireRol } from "../middleware/auth";

const router = Router();

// Estadísticas del dashboard admin
router.get("/stats", authenticate, requireRol("ADMIN"), async (_req: Request, res: Response) => {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const en7Dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const hoyInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const hoyFin = new Date(hoyInicio.getTime() + 24 * 60 * 60 * 1000 - 1);

  const [
    totalClientes,
    totalCoaches,
    citasMes,
    citasHoy,
    citasHoyDetalle,
    membresiasActivas,
    membresiasPorVencer,
    clientesVIP,
  ] = await Promise.all([
    prisma.cliente.count(),
    prisma.coach.count({ where: { activo: true } }),
    prisma.cita.count({ where: { fechaInicio: { gte: inicioMes } } }),
    prisma.cita.count({
      where: { fechaInicio: { gte: hoyInicio, lte: hoyFin }, estado: "AGENDADA" },
    }),
    prisma.cita.findMany({
      where: { fechaInicio: { gte: hoyInicio, lte: hoyFin } },
      include: {
        cliente: { include: { usuario: { select: { nombre: true } } } },
        coach:   { include: { usuario: { select: { nombre: true } } } },
      },
      orderBy: { fechaInicio: "asc" },
    }),
    prisma.membresia.count({ where: { estado: "ACTIVA", fechaFin: { gte: ahora } } }),
    prisma.membresia.count({
      where: { estado: "ACTIVA", fechaFin: { gte: ahora, lte: en7Dias } },
    }),
    prisma.cliente.count({ where: { esVIP: true } }),
  ]);

  // Clientes inactivos = sin membresía activa
  const clientesActivos = await prisma.cliente.count({
    where: {
      membresias: {
        some: { estado: "ACTIVA", fechaFin: { gte: ahora } },
      },
    },
  });
  const clientesInactivos = totalClientes - clientesActivos;

  const citasHoyResumen = citasHoyDetalle.map((c) => ({
    id: c.id,
    clienteNombre: c.cliente.usuario.nombre,
    coachNombre: c.coach.usuario.nombre,
    coachId: c.coachId,
    fechaInicio: c.fechaInicio.toISOString(),
    estado: c.estado,
  }));

  res.json({
    totalClientes,
    totalCoaches,
    citasMes,
    citasHoy,
    citasHoyDetalle: citasHoyResumen,
    membresiasActivas,
    membresiasPorVencer,
    clientesVIP,
    clientesActivos,
    clientesInactivos,
  });
});

export default router;
