import { Router, Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { authenticate, requireRol } from "../middleware/auth";
import { guardarPDF, extraerTextoPDF, parsearSecciones } from "../services/planes";

const router = Router();

// ─── Preview: extraer y parsear texto de PDF sin guardar ──────────────────────
router.post(
  "/preview-pdf",
  authenticate,
  requireRol("COACH", "ADMIN"),
  async (req: Request, res: Response) => {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) {
      res.status(400).json({ error: "pdfBase64 requerido" });
      return;
    }
    const texto = await extraerTextoPDF(pdfBase64);
    if (!texto) {
      res.status(422).json({ error: "No se pudo extraer texto del PDF. Puede ser un PDF escaneado o estar protegido." });
      return;
    }
    const secciones = parsearSecciones(texto);
    res.json(secciones);
  }
);

// ─── Listar planes de un cliente ──────────────────────────────────────────────
router.get("/cliente/:clienteId", authenticate, async (req: Request, res: Response) => {
  const { clienteId } = req.params;
  const user = req.user!;

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }

  // Cliente solo puede ver sus propios planes; coach y admin ven todos
  const esPropioCliente = user.rol === "CLIENTE" && cliente.usuarioId === user.userId;
  if (!esPropioCliente && user.rol !== "COACH" && user.rol !== "ADMIN") {
    res.status(403).json({ error: "Sin permiso" });
    return;
  }

  // Clientes no VIP no pueden ver planes
  if (user.rol === "CLIENTE" && !cliente.esVIP) {
    res.status(403).json({ error: "Solo clientes VIP pueden acceder a planes" });
    return;
  }

  const planes = await prisma.planVIP.findMany({
    where: { clienteId },
    include: {
      coach: { include: { usuario: { select: { nombre: true } } } },
    },
    orderBy: [{ activo: "desc" }, { version: "desc" }],
  });

  res.json(planes);
});

// ─── Obtener un plan ──────────────────────────────────────────────────────────
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  const plan = await prisma.planVIP.findUnique({
    where: { id: req.params.id },
    include: {
      coach: { include: { usuario: { select: { nombre: true } } } },
      cliente: { include: { usuario: { select: { nombre: true } } } },
    },
  });
  if (!plan) {
    res.status(404).json({ error: "Plan no encontrado" });
    return;
  }

  const user = req.user!;
  const cliente = plan.cliente;
  const esPropioCliente = user.rol === "CLIENTE" && cliente.usuarioId === user.userId;
  if (!esPropioCliente && user.rol !== "COACH" && user.rol !== "ADMIN") {
    res.status(403).json({ error: "Sin permiso" });
    return;
  }
  if (esPropioCliente && !cliente.esVIP) {
    res.status(403).json({ error: "Solo clientes VIP pueden acceder a planes" });
    return;
  }

  res.json(plan);
});

// ─── Crear plan ───────────────────────────────────────────────────────────────
router.post("/", authenticate, requireRol("COACH", "ADMIN"), async (req: Request, res: Response) => {
  const {
    clienteId, titulo, objetivo, fechaInicio, fechaFin,
    dieta, habitos, restricciones, suplementacion,
    observaciones, metaFisica, recomendaciones,
    pdfBase64,
  } = req.body;

  if (!clienteId || !titulo || !fechaInicio) {
    res.status(400).json({ error: "clienteId, titulo y fechaInicio son requeridos" });
    return;
  }

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }
  if (!cliente.esVIP) {
    res.status(400).json({ error: "Solo se pueden crear planes para clientes VIP" });
    return;
  }

  // Obtener el coachId del usuario actual
  let coachId: string;
  if (req.user!.rol === "COACH") {
    const coach = await prisma.coach.findUnique({ where: { usuarioId: req.user!.userId } });
    if (!coach) {
      res.status(400).json({ error: "Coach no encontrado" });
      return;
    }
    coachId = coach.id;
  } else {
    // ADMIN puede especificar coachId o usar el primero disponible
    coachId = req.body.coachId;
    if (!coachId) {
      const primerCoach = await prisma.coach.findFirst({ where: { activo: true } });
      if (!primerCoach) {
        res.status(400).json({ error: "No hay coaches disponibles" });
        return;
      }
      coachId = primerCoach.id;
    }
  }

  // Obtener versión siguiente
  const ultimaVersion = await prisma.planVIP.findFirst({
    where: { clienteId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (ultimaVersion?.version ?? 0) + 1;

  // Desactivar plan anterior
  await prisma.planVIP.updateMany({
    where: { clienteId, activo: true },
    data: { activo: false },
  });

  // Manejar PDF: extraer y parsear secciones
  let archivoOriginal: string | undefined;
  let textoExtraido: string | undefined;
  let seccionesDelPDF: Record<string, string> = {};

  if (pdfBase64) {
    archivoOriginal = guardarPDF(pdfBase64, clienteId);
    const texto = await extraerTextoPDF(pdfBase64);
    if (texto) {
      textoExtraido = texto;
      const parsed = parsearSecciones(texto);
      if (parsed.seccionesDetectadas) {
        // Solo auto-rellenar secciones que el coach NO haya escrito manualmente
        seccionesDelPDF = {
          dieta:          parsed.dieta          ?? "",
          habitos:        parsed.habitos         ?? "",
          restricciones:  parsed.restricciones   ?? "",
          suplementacion: parsed.suplementacion  ?? "",
          metaFisica:     parsed.metaFisica      ?? "",
          recomendaciones:parsed.recomendaciones ?? "",
          observaciones:  parsed.observaciones   ?? "",
        };
      }
    }
  }

  // Las secciones manuales tienen prioridad sobre las auto-detectadas
  const seccionFinal = (campo: string, manual: string | undefined) =>
    manual || seccionesDelPDF[campo] || undefined;

  const plan = await prisma.planVIP.create({
    data: {
      clienteId,
      coachId,
      titulo,
      objetivo,
      fechaInicio: new Date(fechaInicio),
      fechaFin: fechaFin ? new Date(fechaFin) : undefined,
      dieta:           seccionFinal("dieta",           dieta),
      habitos:         seccionFinal("habitos",         habitos),
      restricciones:   seccionFinal("restricciones",   restricciones),
      suplementacion:  seccionFinal("suplementacion",  suplementacion),
      metaFisica:      seccionFinal("metaFisica",      metaFisica),
      recomendaciones: seccionFinal("recomendaciones", recomendaciones),
      observaciones:   seccionFinal("observaciones",   observaciones),
      archivoOriginal,
      textoExtraido,
      version,
      activo: true,
    },
    include: {
      coach: { include: { usuario: { select: { nombre: true } } } },
    },
  });

  res.status(201).json(plan);
});

// ─── Actualizar plan ──────────────────────────────────────────────────────────
router.patch("/:id", authenticate, requireRol("COACH", "ADMIN"), async (req: Request, res: Response) => {
  const plan = await prisma.planVIP.findUnique({ where: { id: req.params.id } });
  if (!plan) {
    res.status(404).json({ error: "Plan no encontrado" });
    return;
  }

  const {
    titulo, objetivo, fechaFin,
    dieta, habitos, restricciones, suplementacion,
    observaciones, metaFisica, recomendaciones,
    textoExtraido,
  } = req.body;

  const updated = await prisma.planVIP.update({
    where: { id: req.params.id },
    data: {
      ...(titulo !== undefined && { titulo }),
      ...(objetivo !== undefined && { objetivo }),
      ...(fechaFin !== undefined && { fechaFin: fechaFin ? new Date(fechaFin) : null }),
      ...(dieta !== undefined && { dieta }),
      ...(habitos !== undefined && { habitos }),
      ...(restricciones !== undefined && { restricciones }),
      ...(suplementacion !== undefined && { suplementacion }),
      ...(observaciones !== undefined && { observaciones }),
      ...(metaFisica !== undefined && { metaFisica }),
      ...(recomendaciones !== undefined && { recomendaciones }),
      ...(textoExtraido !== undefined && { textoExtraido }),
    },
    include: {
      coach: { include: { usuario: { select: { nombre: true } } } },
    },
  });

  res.json(updated);
});

// ─── Eliminar plan (soft: desactivar) ─────────────────────────────────────────
router.delete("/:id", authenticate, requireRol("ADMIN"), async (req: Request, res: Response) => {
  await prisma.planVIP.update({
    where: { id: req.params.id },
    data: { activo: false },
  });
  res.json({ ok: true });
});

export default router;
