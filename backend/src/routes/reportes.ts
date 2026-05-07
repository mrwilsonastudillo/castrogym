import { Router, Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { authenticate } from "../middleware/auth";
import { canViewICC } from "../services/vip";

const router = Router();

function clasificarIMC(imc: number): string {
  if (imc < 18.5) return "bajo_peso";
  if (imc < 25) return "normal";
  if (imc < 30) return "sobrepeso";
  if (imc < 35) return "obesidad_i";
  return "obesidad_ii";
}

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
