import { prisma } from "../utils/prisma";
import { encolarNotificacion, procesarNotificaciones } from "./notificaciones";

// Actualiza membresías vencidas y detecta las por vencer
async function jobMembresias() {
  const ahora = new Date();

  // Marcar como VENCIDA las que caducaron
  const vencidas = await prisma.membresia.findMany({
    where: { estado: "ACTIVA", fechaFin: { lt: ahora }, cliente: { usuario: { activo: true } } },
    include: {
      cliente: { include: { usuario: { select: { email: true, nombre: true } } } },
    },
  });

  for (const m of vencidas) {
    await prisma.membresia.update({ where: { id: m.id }, data: { estado: "VENCIDA" } });

    // Actualizar esVIP si corresponde
    if (m.tipo === "VIP") {
      await prisma.cliente.update({ where: { id: m.clienteId }, data: { esVIP: false } });
    }

    // Notificar cliente
    await encolarNotificacion("MEMBRESIA_VENCIDA", m.cliente.usuario.email, {
      nombreCliente: m.cliente.usuario.nombre,
      tipo: m.tipo,
    });

    // Notificar admin(s)
    const admins = await prisma.usuario.findMany({ where: { rol: "ADMIN", activo: true } });
    for (const admin of admins) {
      await encolarNotificacion("MEMBRESIA_VENCIDA", admin.email, {
        nombreCliente: m.cliente.usuario.nombre,
        tipo: m.tipo,
        clienteId: m.clienteId,
      });
    }
  }

  // Detectar membresías que vencen en 7 días (sin haberlas notificado aún hoy)
  const en7Dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const porVencer = await prisma.membresia.findMany({
    where: {
      estado: "ACTIVA",
      fechaFin: { gte: ahora, lte: en7Dias },
      cliente: { usuario: { activo: true } },
    },
    include: {
      cliente: { include: { usuario: { select: { email: true, nombre: true } } } },
    },
  });

  for (const m of porVencer) {
    // Verificar si ya se notificó hoy para no duplicar
    const yaNotificado = await prisma.notificacionPendiente.findFirst({
      where: {
        tipo: "MEMBRESIA_POR_VENCER",
        destinatario: m.cliente.usuario.email,
        createdAt: { gte: new Date(ahora.setHours(0, 0, 0, 0)) },
      },
    });
    if (!yaNotificado) {
      await encolarNotificacion("MEMBRESIA_POR_VENCER", m.cliente.usuario.email, {
        nombreCliente: m.cliente.usuario.nombre,
        tipo: m.tipo,
        fechaFin: m.fechaFin.toLocaleDateString("es-CL"),
      });
    }
  }

  console.log(`[worker:membresias] Vencidas: ${vencidas.length}, Por vencer: ${porVencer.length}`);
}

// Enviar recordatorios de citas 24h antes
async function jobRecordatorios() {
  const ahora = new Date();
  const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
  const en25h = new Date(ahora.getTime() + 25 * 60 * 60 * 1000);

  const citas = await prisma.cita.findMany({
    where: {
      estado: "AGENDADA",
      fechaInicio: { gte: en24h, lt: en25h },
    },
    include: {
      cliente: { include: { usuario: { select: { email: true, nombre: true } } } },
      coach: { include: { usuario: { select: { nombre: true } } } },
    },
  });

  for (const c of citas) {
    const yaNotificado = await prisma.notificacionPendiente.findFirst({
      where: {
        tipo: "RECORDATORIO_24H",
        destinatario: c.cliente.usuario.email,
        createdAt: { gte: new Date(ahora.setHours(0, 0, 0, 0)) },
      },
    });
    if (!yaNotificado) {
      await encolarNotificacion("RECORDATORIO_24H", c.cliente.usuario.email, {
        nombreCliente: c.cliente.usuario.nombre,
        nombreCoach: c.coach.usuario.nombre,
        fecha: c.fechaInicio.toLocaleDateString("es-CL"),
        hora: c.fechaInicio.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
      });
    }
  }

  console.log(`[worker:recordatorios] Citas mañana notificadas: ${citas.length}`);
}

// Enviar felicitaciones de cumpleaños
async function jobCumpleanos() {
  const ahora = new Date();
  const mes = ahora.getMonth() + 1; // 1-12
  const dia = ahora.getDate();

  // Buscar clientes activos cuyo mes y día de nacimiento coinciden con hoy
  const clientes = await prisma.cliente.findMany({
    where: { usuario: { activo: true } },
    include: { usuario: { select: { email: true, nombre: true } } },
  });

  let notificados = 0;
  for (const c of clientes) {
    if (!c.fechaNacimiento) continue;
    const fn = new Date(c.fechaNacimiento);
    if (fn.getMonth() + 1 !== mes || fn.getDate() !== dia) continue;

    // No duplicar si ya se envió hoy
    const yaNotificado = await prisma.notificacionPendiente.findFirst({
      where: {
        tipo: "CUMPLEANOS",
        destinatario: c.usuario.email,
        createdAt: { gte: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()) },
      },
    });
    if (yaNotificado) continue;

    await encolarNotificacion("CUMPLEANOS", c.usuario.email, {
      nombreCliente: c.usuario.nombre,
    });
    notificados++;
  }

  console.log(`[worker:cumpleanos] Felicitaciones enviadas: ${notificados}`);
}

export function startWorkers() {
  // Job diario: membresías (cada 24h, primero a los 5 segundos de arranque)
  setTimeout(async () => {
    await jobMembresias();
    setInterval(jobMembresias, 24 * 60 * 60 * 1000);
  }, 5000);

  // Job diario: recordatorios 24h (cada 24h)
  setTimeout(async () => {
    await jobRecordatorios();
    setInterval(jobRecordatorios, 24 * 60 * 60 * 1000);
  }, 10000);

  // Job diario: cumpleaños (cada 24h)
  setTimeout(async () => {
    await jobCumpleanos();
    setInterval(jobCumpleanos, 24 * 60 * 60 * 1000);
  }, 15000);

  // Worker de cola de notificaciones: cada 5 minutos
  setInterval(procesarNotificaciones, 5 * 60 * 1000);

  console.log("✅ Workers iniciados");
}
