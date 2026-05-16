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
<body style="margin:0;padding:0;background:#f0f0f0;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:#000000;padding:28px 32px 24px;text-align:center;border-radius:12px 12px 0 0;">
              <p style="margin:0;font-size:26px;font-weight:900;color:#feda1f;letter-spacing:3px;text-transform:uppercase;">CASTRO GYM</p>
              <p style="margin:8px 0 0;font-size:11px;color:#aaaaaa;letter-spacing:0.5px;line-height:1.5;">Seguimiento de medidas, agendamiento y control de progreso en un solo lugar</p>
            </td>
          </tr>

          <!-- Accent bar -->
          <tr>
            <td style="background:#feda1f;height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#111111;padding:20px 32px;text-align:center;border-radius:0 0 12px 12px;">
              <p style="margin:0;font-size:12px;color:#888888;">© 2026 Castro Gym · Todos los derechos reservados</p>
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
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr>
      <td align="center">
        <a href="${href}" style="display:inline-block;background:#feda1f;color:#000000;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;min-height:44px;line-height:1.2;text-align:center;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function greeting(nombre: unknown): string {
  return `<p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#000000;">Hola, ${nombre} 👋</p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:2px solid #feda1f;margin:28px 0;" />`;
}

function infoBox(content: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-left:4px solid #feda1f;border-radius:0 8px 8px 0;margin:16px 0;">
    <tr><td style="padding:14px 18px;">${content}</td></tr>
  </table>`;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function templateBienvenida(datos: Record<string, unknown>): { subject: string; html: string } {
  const content = `
    ${greeting(datos.nombreCliente)}
    <p style="margin:0 0 16px;color:#333333;line-height:1.7;font-size:15px;">
      ¡Tu cuenta en <strong>Castro Gym</strong> ha sido creada exitosamente!
      Estamos aquí para acompañarte en cada paso de tu camino hacia tus metas.
    </p>
    ${infoBox(`<p style="margin:0;font-size:14px;color:#555555;">Accede a tu cuenta para <strong>agendar citas</strong>, registrar tus <strong>mediciones</strong> y hacer seguimiento de tu progreso.</p>`)}
    ${btn(`${datos.appUrl ?? "http://localhost:3000"}/dashboard`, "Ir a mi cuenta")}
    ${divider()}
    <p style="margin:0;font-size:12px;color:#999999;text-align:center;">¿Necesitas ayuda? Contáctanos en <a href="mailto:soporte@castrogym.com" style="color:#000000;font-weight:600;">soporte@castrogym.com</a></p>
  `;
  return {
    subject: "¡Bienvenido a Castro Gym! 🏋️",
    html: layout(content, "Bienvenido a Castro Gym"),
  };
}

export function templateCitaConfirmada(datos: Record<string, unknown>): { subject: string; html: string } {
  const content = `
    ${greeting(datos.nombreCliente)}
    <p style="margin:0 0 20px;color:#333333;line-height:1.7;font-size:15px;">¡Tu cita ha sido confirmada! Aquí están los detalles:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eeeeee;border-radius:8px;overflow:hidden;margin-bottom:16px;">
      <tr style="background:#000000;">
        <td style="padding:10px 16px;font-size:11px;font-weight:700;color:#feda1f;text-transform:uppercase;letter-spacing:1.5px;width:40%;">Detalle</td>
        <td style="padding:10px 16px;font-size:11px;font-weight:700;color:#feda1f;text-transform:uppercase;letter-spacing:1.5px;">Info</td>
      </tr>
      <tr style="border-bottom:1px solid #eeeeee;">
        <td style="padding:13px 16px;font-size:13px;color:#888888;">📅 Fecha</td>
        <td style="padding:13px 16px;font-size:14px;font-weight:700;color:#000000;">${datos.fecha}</td>
      </tr>
      <tr style="border-bottom:1px solid #eeeeee;">
        <td style="padding:13px 16px;font-size:13px;color:#888888;">🕐 Hora</td>
        <td style="padding:13px 16px;font-size:14px;font-weight:700;color:#000000;">${datos.hora}</td>
      </tr>
      <tr>
        <td style="padding:13px 16px;font-size:13px;color:#888888;">👤 Coach</td>
        <td style="padding:13px 16px;font-size:14px;font-weight:700;color:#000000;">${datos.nombreCoach}</td>
      </tr>
    </table>
    ${infoBox(`<p style="margin:0;font-size:13px;color:#555555;">⚠️ Si necesitas cancelar, hazlo con al menos <strong>2 horas de anticipación</strong> desde la app.</p>`)}
  `;
  return {
    subject: "✅ Cita confirmada – Castro Gym",
    html: layout(content, "Cita Confirmada"),
  };
}

export function templateRecordatorio(datos: Record<string, unknown>): { subject: string; html: string } {
  const content = `
    ${greeting(datos.nombreCliente)}
    <p style="margin:0 0 16px;color:#333333;line-height:1.7;font-size:15px;">Te recordamos que <strong>mañana tienes una cita</strong> en Castro Gym. ¡Prepárate!</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;border-radius:8px;margin-bottom:16px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:12px;color:#feda1f;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Tu cita es mañana</p>
          <p style="margin:0 0 8px;font-size:20px;font-weight:900;color:#ffffff;">🕐 ${datos.hora}</p>
          <p style="margin:0;font-size:14px;color:#aaaaaa;">Coach: <strong style="color:#ffffff;">${datos.nombreCoach}</strong></p>
        </td>
      </tr>
    </table>
    ${infoBox(`<p style="margin:0;font-size:13px;color:#555555;">Recuerda llegar con <strong>10 minutos de anticipación</strong>. Si necesitas cancelar, hazlo con al menos <strong>2 horas de anticipación</strong>.</p>`)}
  `;
  return {
    subject: "⏰ Recordatorio: tu cita es mañana – Castro Gym",
    html: layout(content, "Recordatorio de Cita"),
  };
}

export function templateCitaCancelada(datos: Record<string, unknown>): { subject: string; html: string } {
  const content = `
    ${greeting(datos.nombreCliente)}
    <p style="margin:0 0 16px;color:#333333;line-height:1.7;font-size:15px;">Tu cita ha sido <strong>cancelada</strong>. Lamentamos el inconveniente.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eeeeee;border-radius:8px;overflow:hidden;margin-bottom:16px;">
      <tr style="background:#000000;">
        <td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;color:#feda1f;text-transform:uppercase;letter-spacing:1.5px;">Cita cancelada</td>
      </tr>
      <tr style="border-bottom:1px solid #eeeeee;">
        <td style="padding:13px 16px;font-size:13px;color:#888888;">📅 Fecha</td>
        <td style="padding:13px 16px;font-size:14px;font-weight:700;color:#000000;">${datos.fecha}</td>
      </tr>
      <tr>
        <td style="padding:13px 16px;font-size:13px;color:#888888;">🕐 Hora</td>
        <td style="padding:13px 16px;font-size:14px;font-weight:700;color:#000000;">${datos.hora}</td>
      </tr>
    </table>
    <p style="margin:0 0 4px;color:#333333;font-size:14px;">Puedes agendar una nueva cita cuando quieras.</p>
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
    <p style="margin:0 0 16px;color:#333333;line-height:1.7;font-size:15px;">Tu coach registró una <strong>nueva medición</strong> el <strong>${datos.fecha}</strong>. ¡Sigue así!</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;border-radius:8px;margin-bottom:16px;">
      <tr>
        <td style="padding:20px 24px;text-align:center;">
          <p style="margin:0 0 6px;font-size:12px;color:#feda1f;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Índice de Masa Corporal (IMC)</p>
          <p style="margin:0;font-size:40px;font-weight:900;color:#ffffff;">${datos.imc}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 4px;color:#333333;font-size:14px;">Ingresa a tu cuenta para ver el reporte completo y tu evolución.</p>
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
    <p style="margin:0 0 16px;color:#333333;line-height:1.7;font-size:15px;">Tu membresía está próxima a vencer. Renueva a tiempo para seguir entrenando sin interrupciones.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eeeeee;border-radius:8px;overflow:hidden;margin-bottom:16px;">
      <tr style="background:#000000;">
        <td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;color:#feda1f;text-transform:uppercase;letter-spacing:1.5px;">Detalles de membresía</td>
      </tr>
      <tr style="border-bottom:1px solid #eeeeee;">
        <td style="padding:13px 16px;font-size:13px;color:#888888;">Plan</td>
        <td style="padding:13px 16px;font-size:14px;font-weight:700;color:#000000;">${datos.tipo}</td>
      </tr>
      <tr>
        <td style="padding:13px 16px;font-size:13px;color:#888888;">⚠️ Vence el</td>
        <td style="padding:13px 16px;font-size:14px;font-weight:700;color:#000000;">${datos.fechaFin}</td>
      </tr>
    </table>
    ${infoBox(`<p style="margin:0;font-size:13px;color:#555555;">Acércate al gimnasio o contacta al administrador para renovar y no perder tus beneficios.</p>`)}
  `;
  return {
    subject: "⚠️ Tu membresía vence pronto – Castro Gym",
    html: layout(content, "Membresía por Vencer"),
  };
}

export function templateMembresiaVencida(datos: Record<string, unknown>): { subject: string; html: string } {
  const content = `
    ${greeting(datos.nombreCliente)}
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;border-radius:8px;margin-bottom:20px;">
      <tr>
        <td style="padding:20px 24px;text-align:center;">
          <p style="margin:0 0 6px;font-size:13px;color:#feda1f;font-weight:700;">Tu membresía ha vencido</p>
          <p style="margin:0;font-size:14px;color:#aaaaaa;">Renueva para volver a entrenar con nosotros</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px;color:#333333;line-height:1.7;font-size:15px;">
      Para continuar disfrutando de los beneficios de <strong>Castro Gym</strong> y poder agendar citas,
      necesitas renovar tu membresía.
    </p>
    ${infoBox(`<p style="margin:0;font-size:13px;color:#555555;">Visítanos en el gimnasio o escríbenos para renovar y retomar tu entrenamiento.</p>`)}
  `;
  return {
    subject: "🔴 Tu membresía ha vencido – Castro Gym",
    html: layout(content, "Membresía Vencida"),
  };
}

export function templateMembresiaActivada(datos: Record<string, unknown>): { subject: string; html: string } {
  const content = `
    ${greeting(datos.nombreCliente)}
    <p style="margin:0 0 16px;color:#333333;line-height:1.7;font-size:15px;">¡Tu membresía ha sido <strong>activada exitosamente</strong>! Ya puedes disfrutar de todos los beneficios de Castro Gym.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eeeeee;border-radius:8px;overflow:hidden;margin-bottom:16px;">
      <tr style="background:#000000;">
        <td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;color:#feda1f;text-transform:uppercase;letter-spacing:1.5px;">Tu membresía activa</td>
      </tr>
      <tr style="border-bottom:1px solid #eeeeee;">
        <td style="padding:13px 16px;font-size:13px;color:#888888;">Plan</td>
        <td style="padding:13px 16px;font-size:14px;font-weight:700;color:#000000;">${datos.tipo}</td>
      </tr>
      <tr>
        <td style="padding:13px 16px;font-size:13px;color:#888888;">✅ Válida hasta</td>
        <td style="padding:13px 16px;font-size:14px;font-weight:700;color:#000000;">${datos.fechaFin}</td>
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
    <p style="margin:0 0 16px;color:#333333;line-height:1.7;font-size:15px;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Castro Gym</strong>.
      Haz clic en el botón para crear una nueva contraseña.
    </p>
    ${infoBox(`<p style="margin:0;font-size:13px;color:#555555;">🔒 Este enlace es válido por <strong>1 hora</strong> y solo puede usarse una vez.</p>`)}
    ${btn(datos.resetUrl as string, "Restablecer contraseña ahora")}
    <p style="margin:16px 0 0;font-size:13px;color:#888888;text-align:center;font-style:italic;">Sigue entrenando, nosotros cuidamos tu acceso.</p>
    ${divider()}
    <p style="margin:0 0 8px;font-size:12px;color:#999999;">🛡️ <strong>Nunca te pediremos tu contraseña por este medio.</strong></p>
    <p style="margin:0 0 8px;font-size:12px;color:#999999;">Si no solicitaste este cambio, ignora este correo. Tu cuenta seguirá segura.</p>
    <p style="margin:0;font-size:12px;color:#999999;">¿Problemas? Contáctanos en <a href="mailto:soporte@castrogym.com" style="color:#000000;font-weight:600;">soporte@castrogym.com</a></p>
  `;
  return {
    subject: "🔑 Restablecer contraseña – Castro Gym",
    html: layout(content, "Restablecer Contraseña"),
  };
}
