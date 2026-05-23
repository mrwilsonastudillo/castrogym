const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cg_token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...init, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error desconocido");
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: "CLIENTE" | "COACH" | "ADMIN";
  activo: boolean;
  clienteId: string | null;
  coachId: string | null;
  esVIP?: boolean;
  avatarPersonaje?: string | null;
  fotoPerfil?: string | null;
}

export interface Coach {
  id: string;
  usuarioId: string;
  especialidad: string | null;
  telefono: string | null;
  activo: boolean;
  fotoPerfil: string | null;
  usuario: { id: string; nombre: string; email: string };
  horarios: Horario[];
}

export interface Horario {
  id: string;
  coachId: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  duracionCitaMinutos: number;
}

export interface Slot {
  horaInicio: string;
  horaFin: string;
  disponible: boolean;
  razon?: string;
}

export interface Cita {
  id: string;
  clienteId: string;
  coachId: string;
  fechaInicio: string;
  fechaFin: string;
  estado: "AGENDADA" | "COMPLETADA" | "CANCELADA";
  notas: string | null;
  createdAt: string;
  coach: { id: string; usuario: { nombre: string } };
  cliente: { id: string; esVIP?: boolean; usuario: { nombre: string } };
  medicion?: Medicion;
}

export interface Medicion {
  id: string;
  clienteId: string;
  coachId: string;
  citaId: string | null;
  fechaMedicion: string;
  pesoKg: number;
  estaturaCm: number;
  imc: number;
  icc: number | null;
  iccClasificacion: "BAJO" | "MODERADO" | "ALTO" | null;
  toraxCm: number | null;
  cinturaCm: number | null;
  caderaCm: number | null;
  bicepsCm: number | null;
  musloCm: number | null;
  pantorrillaCm: number | null;
  porcentajeGrasa: number | null;
  masaMuscular: number | null;
  densidadOsea: number | null;
  grasaEstimada: boolean;
  pliegueTricepe: number | null;
  pliegueSubescapular: number | null;
  pliegueSupraespinal: number | null;
  pliegueAbdominal: number | null;
  pliegueMusloAnt: number | null;
  plieguePantorrilla: number | null;
  sumaPliegues: number | null;
  grasaYuhasz: number | null;
  notas: string | null;
  coach?: { usuario: { nombre: string } };
}

export interface Reporte {
  cliente: {
    id: string;
    genero: string;
    usuario: { nombre: string; email: string };
    objetivo: string;
  };
  actual: (Medicion & { clasificacionIMC: string }) | null;
  progreso: {
    pesoCambio: number;
    imcCambio: number;
    cinturaCambio: number | null;
    iccCambio: number | null;
    fechaPrimera: string;
    fechaUltima: string;
    totalMediciones: number;
  } | null;
  historico: {
    fecha: string;
    pesoKg: number;
    imc: number;
    icc: number | null;
    iccClasificacion: string | null;
    cinturaCm: number | null;
    caderaCm: number | null;
    toraxCm: number | null;
    bicepsCm: number | null;
    musloCm: number | null;
    pantorrillaCm: number | null;
    porcentajeGrasa: number | null;
    masaMuscular: number | null;
    densidadOsea: number | null;
    grasaEstimada: boolean;
    sumaPliegues: number | null;
    grasaYuhasz: number | null;
  }[];
  puedeVerICC: boolean;
  puedeVerYuhasz: boolean;
}

export interface CitaHoyDetalle {
  id: string;
  clienteNombre: string;
  coachNombre: string;
  coachId: string;
  fechaInicio: string;
  estado: "AGENDADA" | "COMPLETADA" | "CANCELADA";
}

export interface AdminStats {
  totalClientes: number;
  totalCoaches: number;
  citasMes: number;
  citasHoy: number;
  citasHoyDetalle: CitaHoyDetalle[];
  membresiasActivas: number;
  membresiasPorVencer: number;
  clientesVIP: number;
  clientesActivos: number;
  clientesInactivos: number;
}

export interface Cliente {
  id: string;
  usuarioId: string;
  telefono: string;
  fechaNacimiento: string;
  genero: string;
  objetivo: string;
  limitacionesFisicas: string | null;
  esVIP: boolean;
  aceptoTratamientoDatos: boolean;
  usuario: { id: string; email: string; nombre: string; activo: boolean };
  estadoMembresia?: "ACTIVO" | "INACTIVO" | "POR_VENCER";
  membresiaActual?: Membresia | null;
  nivelAvatar?: { nivel: number; nombre: string };
  totalMediciones?: number;
}

export interface Membresia {
  id: string;
  clienteId: string;
  tipo: "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL" | "VIP";
  fechaInicio: string;
  fechaFin: string;
  precio: number;
  estado: "ACTIVA" | "VENCIDA" | "CANCELADA";
  notas: string | null;
  createdAt: string;
  estadoCalculado?: "ACTIVO" | "INACTIVO" | "POR_VENCER";
}

export interface ContenidoEstatico {
  id: string;
  clave: string;
  titulo: string;
  contenido: string;
  fechaActualizacion: string;
}

export interface PlanVIP {
  id: string;
  clienteId: string;
  coachId: string;
  titulo: string;
  objetivo: string | null;
  archivoOriginal: string | null;
  textoExtraido: string | null;
  activo: boolean;
  version: number;
  fechaInicio: string;
  fechaFin: string | null;
  dieta: string | null;
  habitos: string | null;
  restricciones: string | null;
  suplementacion: string | null;
  observaciones: string | null;
  metaFisica: string | null;
  recomendaciones: string | null;
  resumenIA: string | null;
  insightsIA: string | null;
  riesgosIA: string | null;
  recomendacionesIA: string | null;
  createdAt: string;
  coach?: { usuario: { nombre: string } };
  cliente?: { usuario: { nombre: string } };
}

export interface MetricasAdmin {
  clientes: {
    total: number;
    activos: number;
    inactivos: number;
    vip: number;
    estandar: number;
    nuevosEsteMes: number;
    renovacionesEsteMes: number;
    cancelacionesEsteMes: number;
  };
  membresias: { activas: number; porVencer: number };
  imc: Record<string, { count: number; porcentaje: number }>;
  objetivos: Record<string, number>;
  genero: Record<string, number>;
  limitaciones: {
    totalConLimitaciones: number;
    porcentaje: number;
    nichos: Record<string, number>;
  };
  alertas: { sinMedicionReciente: number; membresiasPorVencer: number };
}

export interface ClienteSegmentado {
  id: string;
  nombre: string;
  email: string;
  genero: string;
  edad: number;
  objetivo: string;
  esVIP: boolean;
  limitacionesFisicas: string | null;
  nichos: string[];
  estadoMembresia: "ACTIVO" | "INACTIVO";
  imc: number | null;
  clasificacionIMC: string | null;
  ultimaMedicion: string | null;
}
