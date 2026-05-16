import { Resend } from "resend";
import { env } from "../utils/env";

let resend: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(env.RESEND_API_KEY);
  return resend;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn(`[email] RESEND_API_KEY no configurado. Para: ${to} | Asunto: ${subject}`);
    return;
  }
  try {
    const { error } = await client.emails.send({
      from: env.RESEND_FROM,
      to: [to],
      subject,
      html,
    });
    if (error) throw error;
    console.log(`[email] Enviado a ${to} | Asunto: ${subject}`);
  } catch (err) {
    console.error(`[email] Error al enviar a ${to}:`, err);
  }
}

// ─── Layout base ──────────────────────────────────────────────────────────────

function layout(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:1px;">CASTRO GYM</p>
              <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Centro de Fitness</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">© 2025 Castro Gym · Todos los derechos reservados</p>
              <p style="margin:6px 0 0;font-size:11px;color:#cbd5e1;">Si no solicitaste este correo, puedes ignorarlo.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;margin-top:20px;">${label}</a>`;
}

function greeting(nombre: unknown): string {
  return `<p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Hola, <strong>${nombre}</strong> 👋</p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />`;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function templateBienvenida(datos: Record<string, unknown>): { subject: string; html: string } {
  const content = `
    ${greeting(datos.nombreCliente)}
    <p style="margin:0 0 16px;color:#475569;line-height:1.6;">
      ¡Bienvenido a <strong>Castro Gym</strong>! Tu cuenta ha sido creada exitosamente.
      Estamos emocionados de acompañarte en tu camino hacia tus metas de fitness.
    </p>
    <table width="100%" cellpadding="12" style="background:#f0f9ff;border-radius:8px;border-left:4px solid #0ea5e9;margin:16px 0;">
      <tr><td>
        <p style="margin:0;font-size:14px;color:#0369a1;">Accede a tu cuenta para ver tu perfil, agendar citas y registrar tus mediciones.</p>
      </td></tr>
    </table>
    ${btn(`${datos.appUrl ?? "http://localhost:3000"}/dashboard`, "Ir a mi cuenta")}
    ${divider()}
    <p style="margin:0;font-size:13px;color:#94a3b8;">¿Necesitas ayuda? Contáctanos directamente en el gimnasio.</p>
  `;
  return {
    subject: "¡Bienvenido a Castro Gym! 🏋️",
    html: layout(content, "Bienvenido a Castro Gym"),
  };
}

export function templateCitaConfirmada(datos: Record<string, unknown>): { subject: string; html: string } {
  const content = `
    ${greeting(datos.nombreCliente)}
    <p style="margin:0 0 20px;color:#475569;line-height:1.6;">Tu cita ha sido confirmada. Aquí están los detalles:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;overflow:hidden;margin-bottom:8px;">
      <tr style="background:#0f172a;">
        <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Detalle</td>
        <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Info</td>
      </tr>
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:12px 16px;font-size:14px;color:#64748b;">📅 Fecha</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#1e293b;">${datos.fecha}</td>
      </tr>
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:12px 16px;font-size:14px;color:#64748b;">🕐 Hora</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#1e293b;">${datos.hora}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:14px;color:#64748b;">👤 Coach</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#1e293b;">${datos.nombreCoach}</td>
      </tr>
    </table>
    <table width="100%" cellpadding="12" style="background:#fef9c3;border-radius:8px;border-left:4px solid #eab308;margin:16px 0;">
      <tr><td>
        <p style="margin:0;font-size:13px;color:#854d0e;">Si necesitas cancelar, hazlo con al menos <strong>2 horas de anticipación</strong>.</p>
      </td></tr>
    </table>
  `;
  return {
    subject: "✅ Cita confirmada – Castro Gym",
    html: layout(content, "Cita Confirmada"),
  };
}

export function templateRecordatorio(datos: Record<string, unknown>): { subject: string; html: string } {
  const content = `
    ${greeting(datos.nombreCliente)}
    <p style="margin:0 0 16px;color:#475569;line-height:1.6;">Te recordamos que <strong>mañana tienes una cita</strong> en Castro Gym:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e;margin-bottom:16px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#166534;">🕐 ${datos.hora} con ${datos.nombreCoach}</p>
          <p style="margin:0;font-size:13px;color:#4ade80;color:#15803d;">¡Recuerda llegar con 10 minutos de anticipación!</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#64748b;">Si necesitas cancelar, hazlo con al menos <strong>2 horas de anticipación</strong> desde la app.</p>
  `;
  return {
    subject: "⏰ Recordatorio: tu cita es mañana – Castro Gym",
    html: layout(content, "Recordatorio de Cita"),
  };
}

export function templateCitaCancelada(datos: Record<string, unknown>): { subject: string; html: string } {
  const content = `
    ${greeting(datos.nombreCliente)}
    <p style="margin:0 0 16px;color:#475569;line-height:1.6;">Tu cita ha sido <strong>cancelada</strong>. Aquí están los detalles:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:8px;border-left:4px solid #ef4444;margin-bottom:16px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:14px;color:#64748b;">📅 Fecha cancelada</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#991b1b;">${datos.fecha} a las ${datos.hora}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;color:#475569;">Puedes agendar una nueva cita cuando quieras desde la app.</p>
    ${btn(`${datos.appUrl ?? "http://localhost:3000"}/dashboard`, "Agendar nueva cita")}
  `;
  return {
    subject: "❌ Cita cancelada – Castro Gym",
    html: layout(content, "Cita Cancelada"),
  };
}

export function templateNuevaMedicion(datos: Record<string, unknown>): { subject: string; html: string } {
  const content = `
    ${greeting(datos.nombreCliente)}
    <p style="margin:0 0 16px;color:#475569;line-height:1.6;">Tu coach ha registrado una <strong>nueva medición</strong> el <strong>${datos.fecha}</strong>.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:8px;border-left:4px solid #0ea5e9;margin-bottom:16px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:13px;color:#0369a1;">Índice de Masa Corporal (IMC)</p>
          <p style="margin:0;font-size:28px;font-weight:700;color:#0f172a;">${datos.imc}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;color:#475569;">Ingresa a la app para ver tu reporte completo y seguimiento de progreso.</p>
    ${btn(`${datos.appUrl ?? "http://localhost:3000"}/dashboard`, "Ver mi reporte")}
  `;
  return {
    subject: "📊 Nueva medición registrada – Castro Gym",
    html: layout(content, "Nueva Medición"),
  };
}

export function templateMembresiaPorVencer(datos: Record<string, unknown>): { subject: string; html: string } {
  const content = `
    ${greeting(datos.nombreCliente)}
    <p style="margin:0 0 16px;color:#475569;line-height:1.6;">Tu membresía está próxima a vencer. Renueva pronto para no perder el acceso.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border-radius:8px;border-left:4px solid #f59e0b;margin-bottom:16px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:13px;color:#92400e;">Membresía</p>
          <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#1e293b;">${datos.tipo}</p>
          <p style="margin:0 0 4px;font-size:13px;color:#92400e;">Vence el</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#b45309;">${datos.fechaFin}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;color:#475569;">Acércate al gimnasio o contacta al administrador para renovar tu membresía.</p>
  `;
  return {
    subject: "⚠️ Tu membresía vence pronto – Castro Gym",
    html: layout(content, "Membresía por Vencer"),
  };
}

export function templateMembresiaVencida(datos: Record<string, unknown>): { subject: string; html: string } {
  const content = `
    ${greeting(datos.nombreCliente)}
    <table width="100%" cellpadding="12" style="background:#fef2f2;border-radius:8px;border-left:4px solid #ef4444;margin-bottom:16px;">
      <tr><td>
        <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600;">Tu membresía ha vencido.</p>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;color:#475569;line-height:1.6;">
      Para continuar disfrutando de los beneficios de <strong>Castro Gym</strong> y poder agendar citas,
      necesitas renovar tu membresía.
    </p>
    <p style="margin:0;font-size:13px;color:#64748b;">Visítanos o contáctanos para renovar y retomar tu entrenamiento.</p>
  `;
  return {
    subject: "🔴 Tu membresía ha vencido – Castro Gym",
    html: layout(content, "Membresía Vencida"),
  };
}

export function templateMembresiaActivada(datos: Record<string, unknown>): { subject: string; html: string } {
  const content = `
    ${greeting(datos.nombreCliente)}
    <p style="margin:0 0 16px;color:#475569;line-height:1.6;">Tu membresía ha sido <strong>activada exitosamente</strong>. ¡Ya puedes disfrutar de todos los beneficios!</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e;margin-bottom:16px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:13px;color:#166534;">Plan activado</p>
          <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#1e293b;">${datos.tipo}</p>
          <p style="margin:0 0 4px;font-size:13px;color:#166534;">Válida hasta</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#15803d;">${datos.fechaFin}</p>
        </td>
      </tr>
    </table>
    ${btn(`${datos.appUrl ?? "http://localhost:3000"}/dashboard`, "Ver mi cuenta")}
  `;
  return {
    subject: "🎉 ¡Tu membresía está activa! – Castro Gym",
    html: layout(content, "Membresía Activada"),
  };
}

export function templateRecuperarContrasena(datos: Record<string, unknown>): { subject: string; html: string } {
  const content = `
    ${greeting(datos.nombreCliente)}
    <p style="margin:0 0 16px;color:#475569;line-height:1.6;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Castro Gym</strong>.
    </p>
    <p style="margin:0 0 20px;color:#475569;">Haz clic en el botón para crear una nueva contraseña. Este enlace es válido por <strong>1 hora</strong>.</p>
    ${btn(datos.resetUrl as string, "Restablecer contraseña")}
    ${divider()}
    <p style="margin:0;font-size:13px;color:#94a3b8;">Si no solicitaste este cambio, puedes ignorar este mensaje. Tu contraseña no cambiará.</p>
  `;
  return {
    subject: "🔑 Restablecer contraseña – Castro Gym",
    html: layout(content, "Restablecer Contraseña"),
  };
}
