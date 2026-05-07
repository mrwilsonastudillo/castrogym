import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { authenticate, requireRol } from "../middleware/auth";

const router = Router();

const CONTENIDOS_INICIALES = [
  {
    clave: "politicas_generales",
    titulo: "Reglamento del Gimnasio",
    contenido: `# Reglamento General de Castro Gym

## Normas de convivencia
- Respetar a todos los miembros y al personal en todo momento.
- Mantener el orden y la limpieza en todas las áreas del gimnasio.
- Limpiar los equipos después de cada uso con los implementos disponibles.

## Uso de equipos
- Los equipos son de uso compartido. Ceder el turno si alguien espera.
- No dejar las barras y mancuernas en el suelo al terminar.
- Reportar cualquier daño o falla de equipos al personal.

## Seguridad
- Usar calzado deportivo adecuado en todo momento.
- No realizar ejercicios sin el conocimiento técnico adecuado. Solicitar orientación al coach.
- El gimnasio no se responsabiliza por lesiones derivadas del uso incorrecto de equipos.`,
  },
  {
    clave: "politicas_cancelacion",
    titulo: "Política de Cancelación de Citas",
    contenido: `# Política de Cancelación

## Tiempo mínimo de cancelación
Las citas deben cancelarse con un mínimo de **2 horas de anticipación** a través de la app.

## Consecuencias de no presentarse
- Primera inasistencia sin aviso: advertencia.
- Segunda inasistencia sin aviso: suspensión temporal de 7 días para agendar.
- Tercera inasistencia sin aviso: revisión de membresía por la administración.

## Reprogramación
Las citas canceladas en tiempo pueden reprogramarse libremente según disponibilidad del coach.`,
  },
  {
    clave: "politicas_membresia",
    titulo: "Política de Membresías",
    contenido: `# Política de Membresías

## Tipos de membresía
- **Mensual**: vigencia de 30 días desde la fecha de inicio.
- **Trimestral**: vigencia de 90 días con descuento especial.
- **Semestral**: vigencia de 180 días.
- **Anual**: vigencia de 365 días, mejor precio por día.
- **VIP**: acceso prioritario a slots y agendamiento extendido a 60 días.

## Renovación
Las membresías no se renuevan automáticamente. El cliente debe solicitar la renovación a la administración.

## Suspensión de servicios
Un cliente con membresía vencida no puede agendar citas hasta renovar. Las citas ya agendadas se mantienen.

## Reembolsos
No se realizan reembolsos por membresías ya iniciadas.`,
  },
  {
    clave: "tratamiento_datos",
    titulo: "Política de Tratamiento de Datos Personales",
    contenido: `# Política de Tratamiento de Datos Personales

**Responsable:** Castro Gym
**Fecha de vigencia:** Enero 2025

## 1. Bases legales
En cumplimiento de la **Ley 1581 de 2012** y el Decreto 1377 de 2013 de la República de Colombia, Castro Gym informa a sus usuarios sobre el tratamiento de sus datos personales.

## 2. Datos que recopilamos
- Datos de identificación: nombre, email, teléfono, fecha de nacimiento, género.
- Datos de salud: medidas corporales, peso, estatura, objetivos de entrenamiento.
- Datos de uso: citas agendadas, historial de mediciones.

## 3. Finalidad del tratamiento
- Gestión de la relación cliente-gimnasio.
- Seguimiento del progreso físico del cliente.
- Comunicaciones relacionadas con citas y membresías.
- Mejora de los servicios ofrecidos.

## 4. Derechos ARCO
El titular de los datos tiene derecho a **Acceder, Rectificar, Cancelar y Oponerse** al tratamiento de sus datos. Para ejercer estos derechos, ingrese a la sección "Mis datos" en la app.

## 5. Conservación de datos
Los datos se conservarán por el período de la relación contractual y por los 5 años adicionales requeridos por normativa fiscal colombiana.

## 6. Seguridad
Los datos se almacenan de forma segura con acceso restringido al personal autorizado.`,
  },
];

// Obtener todos los contenidos (público)
router.get("/", async (_req: Request, res: Response) => {
  // Inicializar contenidos si no existen
  for (const c of CONTENIDOS_INICIALES) {
    await prisma.contenidoEstatico.upsert({
      where: { clave: c.clave },
      create: c,
      update: {},
    });
  }

  const contenidos = await prisma.contenidoEstatico.findMany({
    orderBy: { clave: "asc" },
  });
  res.json(contenidos);
});

// Obtener un contenido por clave (público)
router.get("/:clave", async (req: Request, res: Response) => {
  const contenido = await prisma.contenidoEstatico.findUnique({
    where: { clave: req.params.clave },
  });
  if (!contenido) {
    res.status(404).json({ error: "Contenido no encontrado" });
    return;
  }
  res.json(contenido);
});

const UpdateContenidoSchema = z.object({
  titulo: z.string().min(2).optional(),
  contenido: z.string().min(1),
});

// Actualizar contenido (solo admin)
router.patch("/:clave", authenticate, requireRol("ADMIN"), async (req: Request, res: Response) => {
  const parsed = UpdateContenidoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const updated = await prisma.contenidoEstatico.upsert({
    where: { clave: req.params.clave },
    create: {
      clave: req.params.clave,
      titulo: parsed.data.titulo ?? req.params.clave,
      contenido: parsed.data.contenido,
    },
    update: {
      titulo: parsed.data.titulo,
      contenido: parsed.data.contenido,
    },
  });

  res.json(updated);
});

export default router;
