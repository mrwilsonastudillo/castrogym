import { prisma } from "../utils/prisma";

export function clasificarIMC(imc: number): string {
  if (imc < 18.5) return "bajo_peso";
  if (imc < 25) return "normal";
  if (imc < 30) return "sobrepeso";
  if (imc < 35) return "obesidad_i";
  return "obesidad_ii";
}

const NICHOS_KEYWORDS: Record<string, string[]> = {
  lumbar:          ["lumbar", "espalda", "columna", "disco", "hernia"],
  rodilla:         ["rodilla", "menisco", "ligamento cruzado", "ligamento"],
  hombro:          ["hombro", "manguito", "rotador", "bursitis"],
  movilidad:       ["movilidad reducida", "rigidez", "articulación", "articulacion"],
  hipertension:    ["hipertensión", "hipertension", "presión alta", "presion alta"],
  obesidad:        ["obesidad", "obeso", "sobrepeso severo"],
  rehabilitacion:  ["rehabilitación", "rehabilitacion", "rehab", "postoperatorio", "cirugía"],
  adultos_mayores: ["adulto mayor", "adultos mayores", "tercera edad", "gerontología"],
};

export function detectarNichos(texto: string): string[] {
  if (!texto) return [];
  const t = texto.toLowerCase();
  return Object.entries(NICHOS_KEYWORDS)
    .filter(([, kws]) => kws.some((k) => t.includes(k)))
    .map(([k]) => k);
}

export interface FiltrosSegmentacion {
  genero?: string;
  edadMin?: number;
  edadMax?: number;
  objetivo?: string;
  esVIP?: boolean;
  coachId?: string;
  estadoMembresia?: string; // "ACTIVO" | "INACTIVO" | "POR_VENCER"
  nicho?: string;
}

export async function getMetricasAdmin() {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const en7Dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const hace90Dias = new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [
    totalClientes,
    clientesVIP,
    nuevosEsteMes,
    membresiasActivas,
    membresiasPorVencer,
    todasMembresiasEsteMes,
    clientesConMedicion,
    todasMedicionesRecientes,
    todosClientes,
  ] = await Promise.all([
    prisma.cliente.count(),
    prisma.cliente.count({ where: { esVIP: true } }),
    prisma.usuario.count({
      where: { rol: "CLIENTE", createdAt: { gte: inicioMes } },
    }),
    prisma.membresia.count({ where: { estado: "ACTIVA", fechaFin: { gte: ahora } } }),
    prisma.membresia.count({
      where: { estado: "ACTIVA", fechaFin: { gte: ahora, lte: en7Dias } },
    }),
    prisma.membresia.findMany({
      where: { createdAt: { gte: inicioMes } },
      select: { estado: true },
    }),
    prisma.medicion.groupBy({
      by: ["clienteId"],
      _avg: { imc: true },
      _max: { fechaMedicion: true },
    }),
    prisma.medicion.groupBy({
      by: ["clienteId"],
      where: { fechaMedicion: { gte: hace90Dias } },
      _count: { id: true },
    }),
    prisma.cliente.findMany({
      select: {
        id: true,
        genero: true,
        objetivo: true,
        limitacionesFisicas: true,
        esVIP: true,
        fechaNacimiento: true,
        membresias: {
          where: { estado: "ACTIVA", fechaFin: { gte: ahora } },
          take: 1,
          select: { id: true, fechaFin: true },
        },
      },
    }),
  ]);

  // Clientes activos/inactivos
  const clientesActivosIds = new Set(
    todosClientes
      .filter((c) => c.membresias.length > 0)
      .map((c) => c.id)
  );
  const clientesActivos = clientesActivosIds.size;
  const clientesInactivos = totalClientes - clientesActivos;
  const clientesEstandar = totalClientes - clientesVIP;

  // Renovaciones/cancelaciones este mes
  const renovacionesEsteMes = todasMembresiasEsteMes.filter((m) => m.estado === "ACTIVA").length;
  const cancelacionesEsteMes = todasMembresiasEsteMes.filter((m) => m.estado === "CANCELADA").length;

  // IMC distribution (usando última medición de cada cliente)
  const clientesConMedicionMap = new Map(
    clientesConMedicion.map((m) => [m.clienteId, m._avg.imc ?? 0])
  );
  const imcCounts = { bajo_peso: 0, normal: 0, sobrepeso: 0, obesidad_i: 0, obesidad_ii: 0 };
  clientesConMedicionMap.forEach((imc) => {
    const cat = clasificarIMC(imc) as keyof typeof imcCounts;
    imcCounts[cat]++;
  });
  const totalConMedicion = clientesConMedicionMap.size;
  const imc = Object.fromEntries(
    Object.entries(imcCounts).map(([k, count]) => [
      k,
      {
        count,
        porcentaje: totalConMedicion > 0 ? Math.round((count / totalConMedicion) * 100) : 0,
      },
    ])
  );

  // Objetivos distribution
  const objetivosCounts: Record<string, number> = {};
  todosClientes.forEach((c) => {
    objetivosCounts[c.objetivo] = (objetivosCounts[c.objetivo] ?? 0) + 1;
  });

  // Limitaciones y nichos
  const clientesConLimitaciones = todosClientes.filter((c) => c.limitacionesFisicas).length;
  const nichosCounts: Record<string, number> = {};
  todosClientes.forEach((c) => {
    if (!c.limitacionesFisicas) return;
    detectarNichos(c.limitacionesFisicas).forEach((n) => {
      nichosCounts[n] = (nichosCounts[n] ?? 0) + 1;
    });
  });

  // Alertas
  const clientesConMedicionRecienteIds = new Set(todasMedicionesRecientes.map((m) => m.clienteId));
  const sinMedicionReciente = totalClientes - clientesConMedicionRecienteIds.size;

  // Genero distribution
  const generoCounts: Record<string, number> = {};
  todosClientes.forEach((c) => {
    generoCounts[c.genero] = (generoCounts[c.genero] ?? 0) + 1;
  });

  return {
    clientes: {
      total: totalClientes,
      activos: clientesActivos,
      inactivos: clientesInactivos,
      vip: clientesVIP,
      estandar: clientesEstandar,
      nuevosEsteMes,
      renovacionesEsteMes,
      cancelacionesEsteMes,
    },
    membresias: {
      activas: membresiasActivas,
      porVencer: membresiasPorVencer,
    },
    imc,
    objetivos: objetivosCounts,
    genero: generoCounts,
    limitaciones: {
      totalConLimitaciones: clientesConLimitaciones,
      porcentaje: totalClientes > 0 ? Math.round((clientesConLimitaciones / totalClientes) * 100) : 0,
      nichos: nichosCounts,
    },
    alertas: {
      sinMedicionReciente,
      membresiasPorVencer,
    },
  };
}

export async function getClientesSegmentados(filtros: FiltrosSegmentacion) {
  const ahora = new Date();

  const where: Record<string, unknown> = {};
  if (filtros.genero) where.genero = filtros.genero;
  if (filtros.objetivo) where.objetivo = filtros.objetivo;
  if (filtros.esVIP !== undefined) where.esVIP = filtros.esVIP;

  if (filtros.edadMin !== undefined || filtros.edadMax !== undefined) {
    const fechaNacimiento: Record<string, Date> = {};
    if (filtros.edadMax !== undefined) {
      const d = new Date();
      d.setFullYear(d.getFullYear() - filtros.edadMax);
      fechaNacimiento.gte = d;
    }
    if (filtros.edadMin !== undefined) {
      const d = new Date();
      d.setFullYear(d.getFullYear() - filtros.edadMin);
      fechaNacimiento.lte = d;
    }
    where.fechaNacimiento = fechaNacimiento;
  }

  if (filtros.coachId) {
    where.citas = { some: { coachId: filtros.coachId } };
  }

  if (filtros.estadoMembresia === "ACTIVO") {
    where.membresias = { some: { estado: "ACTIVA", fechaFin: { gte: ahora } } };
  } else if (filtros.estadoMembresia === "INACTIVO") {
    where.membresias = { none: { estado: "ACTIVA", fechaFin: { gte: ahora } } };
  }

  const clientes = await prisma.cliente.findMany({
    where,
    include: {
      usuario: { select: { nombre: true, email: true, activo: true } },
      membresias: {
        where: { estado: "ACTIVA", fechaFin: { gte: ahora } },
        take: 1,
        orderBy: { fechaFin: "desc" },
      },
      mediciones: {
        orderBy: { fechaMedicion: "desc" },
        take: 1,
        select: { imc: true, pesoKg: true, fechaMedicion: true },
      },
    },
    orderBy: { usuario: { nombre: "asc" } },
  });

  // Filtrar por nicho si se especifica
  const result = filtros.nicho
    ? clientes.filter(
        (c) => c.limitacionesFisicas && detectarNichos(c.limitacionesFisicas).includes(filtros.nicho!)
      )
    : clientes;

  return result.map((c) => {
    const ultimaMedicion = c.mediciones[0];
    const membresiaActiva = c.membresias[0];
    const edad = Math.floor(
      (ahora.getTime() - new Date(c.fechaNacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    return {
      id: c.id,
      nombre: c.usuario.nombre,
      email: c.usuario.email,
      genero: c.genero,
      edad,
      objetivo: c.objetivo,
      esVIP: c.esVIP,
      limitacionesFisicas: c.limitacionesFisicas,
      nichos: detectarNichos(c.limitacionesFisicas ?? ""),
      estadoMembresia: membresiaActiva ? "ACTIVO" : "INACTIVO",
      imc: ultimaMedicion?.imc ?? null,
      clasificacionIMC: ultimaMedicion ? clasificarIMC(ultimaMedicion.imc) : null,
      ultimaMedicion: ultimaMedicion?.fechaMedicion ?? null,
    };
  });
}
