import { prisma } from "../utils/prisma";

type TipoNotificacion =
  | "CITA_CONFIRMADA"
  | "RECORDATORIO_24H"
  | "CITA_CANCELADA"
  | "NUEVA_MEDICION"
  | "MEMBRESIA_POR_VENCER"
  | "MEMBRESIA_VENCIDA";

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

function renderTemplate(tipo: TipoNotificacion, datos: Record<string, unknown>): { subject: string; html: string } {
  const gym = "Castro Gym";

  switch (tipo) {
    case "CITA_CONFIRMADA":
      return {
        subject: `✅ Cita confirmada – ${gym}`,
        html: `<p>Hola <b>${datos.nombreCliente}</b>,</p>
<p>Tu cita ha sido confirmada para el <b>${datos.fecha}</b> a las <b>${datos.hora}</b> con el coach <b>${datos.nombreCoach}</b>.</p>
<p>¡Te esperamos en ${gym}!</p>`,
      };
    case "RECORDATORIO_24H":
      return {
        subject: `⏰ Recordatorio: tu cita es mañana – ${gym}`,
        html: `<p>Hola <b>${datos.nombreCliente}</b>,</p>
<p>Te recordamos que mañana tienes cita a las <b>${datos.hora}</b> con el coach <b>${datos.nombreCoach}</b>.</p>
<p>Si necesitas cancelar, hazlo con al menos 2 horas de anticipación.</p>`,
      };
    case "CITA_CANCELADA":
      return {
        subject: `❌ Cita cancelada – ${gym}`,
        html: `<p>Hola <b>${datos.nombreCliente}</b>,</p>
<p>Tu cita del <b>${datos.fecha}</b> a las <b>${datos.hora}</b> ha sido cancelada.</p>
<p>Puedes agendar una nueva desde la app.</p>`,
      };
    case "NUEVA_MEDICION":
      return {
        subject: `📊 Nuevo reporte de medición disponible – ${gym}`,
        html: `<p>Hola <b>${datos.nombreCliente}</b>,</p>
<p>Tu coach ha registrado una nueva medición el <b>${datos.fecha}</b>.</p>
<p>Tu IMC actual es <b>${datos.imc}</b>. Ingresa a la app para ver tu reporte completo.</p>`,
      };
    case "MEMBRESIA_POR_VENCER":
      return {
        subject: `⚠️ Tu membresía vence pronto – ${gym}`,
        html: `<p>Hola <b>${datos.nombreCliente}</b>,</p>
<p>Tu membresía <b>${datos.tipo}</b> vence el <b>${datos.fechaFin}</b>.</p>
<p>Renueva pronto para seguir disfrutando de todos los beneficios de ${gym}.</p>`,
      };
    case "MEMBRESIA_VENCIDA":
      return {
        subject: `🔴 Tu membresía ha vencido – ${gym}`,
        html: `<p>Hola <b>${datos.nombreCliente}</b>,</p>
<p>Tu membresía ha vencido. Para agendar citas nuevamente, por favor renueva tu membresía.</p>
<p>Contáctanos en ${gym} para renovar.</p>`,
      };
    default:
      return { subject: `Notificación de ${gym}`, html: `<p>${JSON.stringify(datos)}</p>` };
  }
}

export async function procesarNotificaciones() {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return; // No configurado

  const pendientes = await prisma.notificacionPendiente.findMany({
    where: { estado: "PENDIENTE", intentos: { lt: 3 } },
    take: 20,
    orderBy: { createdAt: "asc" },
  });

  for (const notif of pendientes) {
    const datos = JSON.parse(notif.datos) as Record<string, unknown>;
    const { subject, html } = renderTemplate(notif.tipo as TipoNotificacion, datos);

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM ?? "Castro Gym <noreply@castrogym.com>",
          to: [notif.destinatario],
          subject,
          html,
        }),
      });

      if (res.ok) {
        await prisma.notificacionPendiente.update({
          where: { id: notif.id },
          data: { estado: "ENVIADA", fechaEnvio: new Date(), intentos: { increment: 1 } },
        });
      } else {
        await prisma.notificacionPendiente.update({
          where: { id: notif.id },
          data: { intentos: { increment: 1 } },
        });
      }
    } catch {
      await prisma.notificacionPendiente.update({
        where: { id: notif.id },
        data: { intentos: { increment: 1 } },
      });
    }
  }
}
