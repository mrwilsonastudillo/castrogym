import { Router, Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { authenticate, requireRol } from "../middleware/auth";
import { canViewICC } from "../services/vip";
import { clasificarIMC, getMetricasAdmin, getClientesSegmentados } from "../services/reportes";

const router = Router();

// ─── Admin: métricas agregadas ─────────────────────────────────────────────────

router.get(
  "/admin/metricas",
  authenticate,
  requireRol("ADMIN", "COACH"),
  async (_req: Request, res: Response) => {
    const data = await getMetricasAdmin();
    res.json(data);
  }
);

// ─── Admin: segmentación dinámica ─────────────────────────────────────────────

router.get(
  "/admin/segmentacion",
  authenticate,
  requireRol("ADMIN", "COACH"),
  async (req: Request, res: Response) => {
    const { genero, edadMin, edadMax, objetivo, esVIP, coachId, estadoMembresia, nicho } = req.query;
    const clientes = await getClientesSegmentados({
      genero: genero as string | undefined,
      edadMin: edadMin ? Number(edadMin) : undefined,
      edadMax: edadMax ? Number(edadMax) : undefined,
      objetivo: objetivo as string | undefined,
      esVIP: esVIP === "true" ? true : esVIP === "false" ? false : undefined,
      coachId: coachId as string | undefined,
      estadoMembresia: estadoMembresia as string | undefined,
      nicho: nicho as string | undefined,
    });
    res.json(clientes);
  }
);

// ─── Admin: alertas de gestión ────────────────────────────────────────────────

router.get(
  "/admin/alertas",
  authenticate,
  requireRol("ADMIN", "COACH"),
  async (_req: Request, res: Response) => {
    const ahora = new Date();
    const hace90Dias = new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000);
    const en7Dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Clientes VIP sin plan activo
    const [vipSinPlan, membresiasPorVencer, clientesSinMedicion] = await Promise.all([
      prisma.cliente.findMany({
        where: {
          esVIP: true,
          planes: { none: { activo: true } },
        },
        include: { usuario: { select: { nombre: true, email: true } } },
        take: 20,
      }),
      prisma.membresia.findMany({
        where: { estado: "ACTIVA", fechaFin: { gte: ahora, lte: en7Dias } },
        include: {
          cliente: { include: { usuario: { select: { nombre: true, email: true } } } },
        },
        orderBy: { fechaFin: "asc" },
        take: 20,
      }),
      prisma.cliente.findMany({
        where: {
          mediciones: { none: { fechaMedicion: { gte: hace90Dias } } },
          membresias: { some: { estado: "ACTIVA", fechaFin: { gte: ahora } } },
        },
        include: { usuario: { select: { nombre: true, email: true } } },
        take: 20,
      }),
    ]);

    res.json({
      vipSinPlan: vipSinPlan.map((c) => ({ id: c.id, nombre: c.usuario.nombre })),
      membresiasPorVencer: membresiasPorVencer.map((m) => ({
        membresiaId: m.id,
        clienteId: m.clienteId,
        nombre: m.cliente.usuario.nombre,
        fechaFin: m.fechaFin,
        tipo: m.tipo,
      })),
      sinMedicionReciente: clientesSinMedicion.map((c) => ({
        id: c.id,
        nombre: c.usuario.nombre,
        email: c.usuario.email,
      })),
    });
  }
);

router.get("/cliente/:clienteId", authenticate, async (req: Request, res: Response) => {
  const { clienteId } = req.params;

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: { usuario: { select: { nombre: true, email: true } } },
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

  const mediciones = await prisma.medicion.findMany({
    where: { clienteId },
    orderBy: { fechaMedicion: "asc" },
  });

  // Determinar si puede ver ICC: coaches y admins siempre sí; clientes solo si son VIP
  const puedeVerICC = user.rol !== "CLIENTE" || canViewICC(cliente);

  if (mediciones.length === 0) {
    res.json({ cliente, actual: null, progreso: null, historico: [], puedeVerICC });
    return;
  }

  const primera = mediciones[0];
  const ultima = mediciones[mediciones.length - 1];

  const actual = {
    ...ultima,
    clasificacionIMC: clasificarIMC(ultima.imc),
    icc: puedeVerICC ? ultima.icc : null,
    iccClasificacion: puedeVerICC ? ultima.iccClasificacion : null,
    pliegueTricepe: puedeVerICC ? ultima.pliegueTricepe : null,
    pliegueSubescapular: puedeVerICC ? ultima.pliegueSubescapular : null,
    pliegueSupraespinal: puedeVerICC ? ultima.pliegueSupraespinal : null,
    pliegueAbdominal: puedeVerICC ? ultima.pliegueAbdominal : null,
    pliegueMusloAnt: puedeVerICC ? ultima.pliegueMusloAnt : null,
    plieguePantorrilla: puedeVerICC ? ultima.plieguePantorrilla : null,
    sumaPliegues: puedeVerICC ? ultima.sumaPliegues : null,
    grasaYuhasz: puedeVerICC ? ultima.grasaYuhasz : null,
  };

  const progreso =
    mediciones.length > 1
      ? {
          pesoCambio: parseFloat((ultima.pesoKg - primera.pesoKg).toFixed(2)),
          imcCambio: parseFloat((ultima.imc - primera.imc).toFixed(2)),
          cinturaCambio:
            ultima.cinturaCm && primera.cinturaCm ? ultima.cinturaCm - primera.cinturaCm : null,
          iccCambio: puedeVerICC && ultima.icc && primera.icc
            ? parseFloat((ultima.icc - primera.icc).toFixed(3))
            : null,
          fechaPrimera: primera.fechaMedicion,
          fechaUltima: ultima.fechaMedicion,
          totalMediciones: mediciones.length,
        }
      : null;

  const historico = mediciones.map((m) => ({
    fecha: m.fechaMedicion,
    pesoKg: m.pesoKg,
    imc: m.imc,
    icc: puedeVerICC ? m.icc : null,
    iccClasificacion: puedeVerICC ? m.iccClasificacion : null,
    cinturaCm: m.cinturaCm,
    caderaCm: m.caderaCm,
    toraxCm: m.toraxCm,
    bicepsCm: m.bicepsCm,
    musloCm: m.musloCm,
    pantorrillaCm: m.pantorrillaCm,
    porcentajeGrasa: m.porcentajeGrasa,
    masaMuscular: m.masaMuscular,
    densidadOsea: m.densidadOsea,
    grasaEstimada: m.grasaEstimada,
    sumaPliegues: puedeVerICC ? m.sumaPliegues : null,
    grasaYuhasz: puedeVerICC ? m.grasaYuhasz : null,
  }));

  res.json({ cliente, actual, progreso, historico, puedeVerICC, puedeVerYuhasz: puedeVerICC });
});

export default router;
