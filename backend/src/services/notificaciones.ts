import { prisma } from "../utils/prisma";
import { env } from "../utils/env";
import {
  sendEmail,
  templateCitaConfirmada,
  templateRecordatorio,
  templateCitaCancelada,
  templateNuevaMedicion,
  templateMembresiaPorVencer,
  templateMembresiaVencida,
  templateMembresiaActivada,
} from "./email";

export type TipoNotificacion =
  | "CITA_CONFIRMADA"
  | "RECORDATORIO_24H"
  | "CITA_CANCELADA"
  | "NUEVA_MEDICION"
  | "MEMBRESIA_POR_VENCER"
  | "MEMBRESIA_VENCIDA"
  | "MEMBRESIA_ACTIVADA";

export async function encolarNotificacion(
  tipo: TipoNotificacion,
  destinatario: string,
  datos: Record<string, unknown>
) {
  await prisma.notificacionPendiente.create({
    data: {
      tipo,
      destinatario,
      datos: JSON.stringify(datos),
    },
  });
}

function renderTemplate(
  tipo: TipoNotificacion,
  datos: Record<string, unknown>
): { subject: string; html: string } {
  const datosConUrl = { ...datos, appUrl: env.APP_URL };

  switch (tipo) {
    case "CITA_CONFIRMADA":      return templateCitaConfirmada(datosConUrl);
    case "RECORDATORIO_24H":     return templateRecordatorio(datosConUrl);
    case "CITA_CANCELADA":       return templateCitaCancelada(datosConUrl);
    case "NUEVA_MEDICION":       return templateNuevaMedicion(datosConUrl);
    case "MEMBRESIA_POR_VENCER": return templateMembresiaPorVencer(datosConUrl);
    case "MEMBRESIA_VENCIDA":    return templateMembresiaVencida(datosConUrl);
    case "MEMBRESIA_ACTIVADA":   return templateMembresiaActivada(datosConUrl);
    default:
      return { subject: "Notificación – Castro Gym", html: `<p>${JSON.stringify(datos)}</p>` };
  }
}

export async function procesarNotificaciones() {
  if (!env.RESEND_API_KEY) return; // No configurado — skip silencioso

  const pendientes = await prisma.notificacionPendiente.findMany({
    where: { estado: "PENDIENTE", intentos: { lt: 3 } },
    take: 20,
    orderBy: { createdAt: "asc" },
  });

  for (const notif of pendientes) {
    const datos = JSON.parse(notif.datos) as Record<string, unknown>;
    const { subject, html } = renderTemplate(notif.tipo as TipoNotificacion, datos);

    try {
      await sendEmail(notif.destinatario, subject, html);
      await prisma.notificacionPendiente.update({
        where: { id: notif.id },
        data: { estado: "ENVIADA", fechaEnvio: new Date(), intentos: { increment: 1 } },
      });
    } catch {
      await prisma.notificacionPendiente.update({
        where: { id: notif.id },
        data: { intentos: { increment: 1 } },
      });
    }
  }
}
