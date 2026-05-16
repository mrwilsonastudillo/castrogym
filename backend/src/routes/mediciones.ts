import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { authenticate, requireRol } from "../middleware/auth";
import { encolarNotificacion } from "../services/notificaciones";

const router = Router();

const MedicionSchema = z.object({
  clienteId: z.string().uuid(),
  citaId: z.string().uuid().optional(),
  pesoKg: z.number().positive(),
  estaturaCm: z.number().int().positive(),
  toraxCm: z.number().int().positive().optional(),
  cinturaCm: z.number().int().positive().optional(),
  caderaCm: z.number().int().positive().optional(),
  bicepsCm: z.number().int().positive().optional(),
  musloCm: z.number().int().positive().optional(),
  pantorrillaCm: z.number().int().positive().optional(),
  porcentajeGrasa: z.number().positive().optional(),
  masaMuscular: z.number().positive().optional(),
  densidadOsea: z.number().positive().optional(),
  // Pliegues Yuhasz (solo para clientes VIP)
  pliegueTricepe: z.number().positive().optional(),
  pliegueSubescapular: z.number().positive().optional(),
  pliegueSupraespinal: z.number().positive().optional(),
  pliegueAbdominal: z.number().positive().optional(),
  pliegueMusloAnt: z.number().positive().optional(),
  plieguePantorrilla: z.number().positive().optional(),
  notas: z.string().optional(),
});

// Clasificar ICC según género
function calcularICC(cintura: number, cadera: number, genero: string): { icc: number; clasificacion: string } {
  const icc = parseFloat((cintura / cadera).toFixed(3));
  let clasificacion: string;
  if (genero === "M") {
    if (icc < 0.90) clasificacion = "BAJO";
    else if (icc < 1.00) clasificacion = "MODERADO";
    else clasificacion = "ALTO";
  } else {
    if (icc < 0.80) clasificacion = "BAJO";
    else if (icc < 0.85) clasificacion = "MODERADO";
    else clasificacion = "ALTO";
  }
  return { icc, clasificacion };
}

// Fórmula Deurenberg: %Grasa = 1.2×IMC + 0.23×edad − 10.8×sexo − 5.4  (sexo: H=1, M=0)
function calcularGrasaEstimada(imc: number, fechaNacimiento: Date, genero: string): number {
  const hoy = new Date();
  const edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const sexo = genero === "M" ? 1 : 0;
  const grasa = 1.2 * imc + 0.23 * edad - 10.8 * sexo - 5.4;
  return parseFloat(Math.max(0, grasa).toFixed(1));
}

// Registrar medición: solo coach o admin
router.post("/", authenticate, requireRol("COACH", "ADMIN"), async (req: Request, res: Response) => {
  const parsed = MedicionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const data = parsed.data;

  // Obtener coachId del usuario autenticado
  let coachId: string;
  if (req.user!.rol === "COACH") {
    const coach = await prisma.coach.findUnique({ where: { usuarioId: req.user!.userId } });
    if (!coach) {
      res.status(404).json({ error: "Perfil de coach no encontrado" });
      return;
    }
    coachId = coach.id;
  } else {
    if (!data.citaId) {
      res.status(400).json({ error: "Admin debe proveer citaId" });
      return;
    }
    const cita = await prisma.cita.findUnique({ where: { id: data.citaId } });
    if (!cita) {
      res.status(404).json({ error: "Cita no encontrada" });
      return;
    }
    coachId = cita.coachId;
  }

  // Obtener cliente para calcular ICC y grasa
  const cliente = await prisma.cliente.findUnique({
    where: { id: data.clienteId },
    include: { usuario: { select: { email: true, nombre: true } } },
  });
  if (!cliente) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }

  // Verificar que cita existe y pertenece al cliente
  if (data.citaId) {
    const cita = await prisma.cita.findUnique({ where: { id: data.citaId } });
    if (!cita) {
      res.status(404).json({ error: "Cita no encontrada" });
      return;
    }
    if (cita.clienteId !== data.clienteId) {
      res.status(400).json({ error: "La cita no pertenece al cliente indicado" });
      return;
    }
  }

  // Calcular IMC
  const estaturaM = data.estaturaCm / 100;
  const imc = parseFloat((data.pesoKg / (estaturaM * estaturaM)).toFixed(2));

  // Calcular ICC si hay cintura y cadera
  let icc: number | undefined;
  let iccClasificacion: string | undefined;
  if (data.cinturaCm && data.caderaCm) {
    const result = calcularICC(data.cinturaCm, data.caderaCm, cliente.genero);
    icc = result.icc;
    iccClasificacion = result.clasificacion;
  }

  // Calcular %grasa estimada si no se captura manualmente
  let porcentajeGrasa = data.porcentajeGrasa;
  let grasaEstimada = false;
  if (!porcentajeGrasa) {
    porcentajeGrasa = calcularGrasaEstimada(imc, cliente.fechaNacimiento, cliente.genero);
    grasaEstimada = true;
  }

  // Calcular Yuhasz si se tienen los 6 pliegues (solo VIP)
  let sumaPliegues: number | undefined;
  let grasaYuhasz: number | undefined;
  const { pliegueTricepe, pliegueSubescapular, pliegueSupraespinal, pliegueAbdominal, pliegueMusloAnt, plieguePantorrilla } = data;
  if (pliegueTricepe && pliegueSubescapular && pliegueSupraespinal && pliegueAbdominal && pliegueMusloAnt && plieguePantorrilla) {
    sumaPliegues = parseFloat((pliegueTricepe + pliegueSubescapular + pliegueSupraespinal + pliegueAbdominal + pliegueMusloAnt + plieguePantorrilla).toFixed(2));
    grasaYuhasz = cliente.genero === "M"
      ? parseFloat(((sumaPliegues * 0.097) + 3.64).toFixed(1))
      : parseFloat(((sumaPliegues * 0.125) + 3.39).toFixed(1));
  }

  // Transacción: crear medición + completar cita
  const [medicion] = await prisma.$transaction(async (tx) => {
    const m = await tx.medicion.create({
      data: {
        clienteId: data.clienteId,
        coachId,
        citaId: data.citaId,
        pesoKg: data.pesoKg,
        estaturaCm: data.estaturaCm,
        imc,
        icc,
        iccClasificacion,
        toraxCm: data.toraxCm,
        cinturaCm: data.cinturaCm,
        caderaCm: data.caderaCm,
        bicepsCm: data.bicepsCm,
        musloCm: data.musloCm,
        pantorrillaCm: data.pantorrillaCm,
        porcentajeGrasa,
        masaMuscular: data.masaMuscular,
        densidadOsea: data.densidadOsea,
        grasaEstimada,
        pliegueTricepe: data.pliegueTricepe,
        pliegueSubescapular: data.pliegueSubescapular,
        pliegueSupraespinal: data.pliegueSupraespinal,
        pliegueAbdominal: data.pliegueAbdominal,
        pliegueMusloAnt: data.pliegueMusloAnt,
        plieguePantorrilla: data.plieguePantorrilla,
        sumaPliegues,
        grasaYuhasz,
        notas: data.notas,
      },
    });

    if (data.citaId) {
      await tx.cita.update({
        where: { id: data.citaId },
        data: { estado: "COMPLETADA" },
      });
    }

    return [m];
  });

  // Notificar al cliente que hay nueva medición
  if (cliente.usuario.email) {
    await encolarNotificacion("NUEVA_MEDICION", cliente.usuario.email, {
      nombreCliente: cliente.usuario.nombre,
      fecha: new Date().toLocaleDateString("es-CL"),
      imc: imc.toFixed(1),
    });
  }

  res.status(201).json(medicion);
});

// Editar medición: solo admin (corrección de errores de ingreso)
router.patch("/:id", authenticate, requireRol("ADMIN"), async (req: Request, res: Response) => {
  const medicion = await prisma.medicion.findUnique({
    where: { id: req.params.id },
    include: { cliente: true },
  });
  if (!medicion) {
    res.status(404).json({ error: "Medición no encontrada" });
    return;
  }

  const EditSchema = z.object({
    pesoKg:           z.number().positive().optional(),
    estaturaCm:       z.number().int().min(50).max(250).optional(),
    toraxCm:          z.number().int().positive().optional().nullable(),
    cinturaCm:        z.number().int().positive().optional().nullable(),
    caderaCm:         z.number().int().positive().optional().nullable(),
    bicepsCm:         z.number().int().positive().optional().nullable(),
    musloCm:          z.number().int().positive().optional().nullable(),
    pantorrillaCm:    z.number().int().positive().optional().nullable(),
    porcentajeGrasa:  z.number().positive().optional().nullable(),
    masaMuscular:     z.number().positive().optional().nullable(),
    densidadOsea:     z.number().positive().optional().nullable(),
    notas:            z.string().optional().nullable(),
  });

  const parsed = EditSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const data = parsed.data;

  // Usar valores actualizados o los existentes para recalcular
  const pesoKg     = data.pesoKg     ?? medicion.pesoKg;
  const estaturaCm = data.estaturaCm ?? medicion.estaturaCm;
  const cinturaCm  = data.cinturaCm  !== undefined ? data.cinturaCm  : medicion.cinturaCm;
  const caderaCm   = data.caderaCm   !== undefined ? data.caderaCm   : medicion.caderaCm;

  // Recalcular IMC
  const estaturaM = estaturaCm / 100;
  const imc = parseFloat((pesoKg / (estaturaM * estaturaM)).toFixed(2));

  // Recalcular ICC si hay cintura y cadera
  let icc: number | null = medicion.icc;
  let iccClasificacion: string | null = medicion.iccClasificacion;
  if (cinturaCm && caderaCm) {
    const r = calcularICC(cinturaCm, caderaCm, medicion.cliente.genero);
    icc = r.icc;
    iccClasificacion = r.clasificacion;
  } else if (cinturaCm === null || caderaCm === null) {
    icc = null;
    iccClasificacion = null;
  }

  // Recalcular grasa estimada solo si era estimada y no se provee manual
  let porcentajeGrasa = data.porcentajeGrasa !== undefined ? data.porcentajeGrasa : medicion.porcentajeGrasa;
  let grasaEstimada = medicion.grasaEstimada;
  if (data.porcentajeGrasa === undefined && medicion.grasaEstimada) {
    porcentajeGrasa = calcularGrasaEstimada(imc, medicion.cliente.fechaNacimiento, medicion.cliente.genero);
  }
  if (data.porcentajeGrasa !== undefined && data.porcentajeGrasa !== null) {
    grasaEstimada = false; // pasó a ser manual
  }

  const actualizada = await prisma.medicion.update({
    where: { id: req.params.id },
    data: {
      pesoKg,
      estaturaCm,
      imc,
      icc,
      iccClasificacion,
      toraxCm:         data.toraxCm         !== undefined ? data.toraxCm         : medicion.toraxCm,
      cinturaCm,
      caderaCm,
      bicepsCm:        data.bicepsCm        !== undefined ? data.bicepsCm        : medicion.bicepsCm,
      musloCm:         data.musloCm         !== undefined ? data.musloCm         : medicion.musloCm,
      pantorrillaCm:   data.pantorrillaCm   !== undefined ? data.pantorrillaCm   : medicion.pantorrillaCm,
      porcentajeGrasa,
      masaMuscular:    data.masaMuscular    !== undefined ? data.masaMuscular    : medicion.masaMuscular,
      densidadOsea:    data.densidadOsea    !== undefined ? data.densidadOsea    : medicion.densidadOsea,
      grasaEstimada,
      notas:           data.notas           !== undefined ? data.notas           : medicion.notas,
    },
  });

  res.json(actualizada);
});

// Historial de mediciones de un cliente
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

  const mediciones = await prisma.medicion.findMany({
    where: { clienteId },
    include: {
      coach: { include: { usuario: { select: { nombre: true } } } },
    },
    orderBy: { fechaMedicion: "asc" },
  });

  res.json(mediciones);
});

export default router;
