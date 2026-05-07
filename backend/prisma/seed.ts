import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function calcICC(cintura: number, cadera: number, genero: string) {
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

function calcGrasaDeurenberg(imc: number, fechaNac: Date, genero: string) {
  const edad = new Date().getFullYear() - fechaNac.getFullYear();
  const sexo = genero === "M" ? 1 : 0;
  return parseFloat(Math.max(0, 1.2 * imc + 0.23 * edad - 10.8 * sexo - 5.4).toFixed(1));
}

async function main() {
  console.log("🌱 Seeding database...");

  // ── Admin ─────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 10);
  await prisma.usuario.upsert({
    where: { email: "admin@castrogym.com" },
    update: {},
    create: {
      email: "admin@castrogym.com",
      passwordHash: adminHash,
      nombre: "Admin Castro Gym",
      rol: "ADMIN",
    },
  });

  // ── Coach Andrés ──────────────────────────────────────────────────────────
  const coachHash = await bcrypt.hash("coach123", 10);
  const coachUsuario = await prisma.usuario.upsert({
    where: { email: "andres@castrogym.com" },
    update: {},
    create: {
      email: "andres@castrogym.com",
      passwordHash: coachHash,
      nombre: "Andrés Castro",
      rol: "COACH",
    },
  });

  const coach = await prisma.coach.upsert({
    where: { usuarioId: coachUsuario.id },
    update: {},
    create: {
      usuarioId: coachUsuario.id,
      especialidad: "Musculación y pérdida de peso",
      telefono: "+57312345678",
    },
  });

  // Horarios coach: Lun-Vie 06:00-20:00, Sáb 08:00-14:00
  const horarios = [
    { dia: 0, inicio: "06:00", fin: "20:00" },
    { dia: 1, inicio: "06:00", fin: "20:00" },
    { dia: 2, inicio: "06:00", fin: "20:00" },
    { dia: 3, inicio: "06:00", fin: "20:00" },
    { dia: 4, inicio: "06:00", fin: "20:00" },
    { dia: 5, inicio: "08:00", fin: "14:00" },
  ];

  for (const h of horarios) {
    await prisma.horarioCoach.upsert({
      where: { coachId_diaSemana: { coachId: coach.id, diaSemana: h.dia } },
      update: {},
      create: {
        coachId: coach.id,
        diaSemana: h.dia,
        horaInicio: h.inicio,
        horaFin: h.fin,
        duracionCitaMinutos: 30,
      },
    });
  }

  // ── Cliente Regular: Martín ───────────────────────────────────────────────
  const clienteHash = await bcrypt.hash("cliente123", 10);
  const clienteUsuario = await prisma.usuario.upsert({
    where: { email: "martin@test.com" },
    update: {},
    create: {
      email: "martin@test.com",
      passwordHash: clienteHash,
      nombre: "Martín González",
      rol: "CLIENTE",
    },
  });

  const clienteFechaNac = new Date("1995-03-15");
  const cliente = await prisma.cliente.upsert({
    where: { usuarioId: clienteUsuario.id },
    update: { aceptoTratamientoDatos: true, fechaAceptacion: new Date("2026-01-01") },
    create: {
      usuarioId: clienteUsuario.id,
      telefono: "+57312345678",
      fechaNacimiento: clienteFechaNac,
      genero: "M",
      objetivo: "PERDIDA_PESO",
      aceptoTratamientoDatos: true,
      fechaAceptacion: new Date("2026-01-01"),
    },
  });

  // Medición inicial con ICC calculado
  const medicionExistente = await prisma.medicion.findFirst({ where: { clienteId: cliente.id } });
  if (!medicionExistente) {
    const estatura = 175;
    const peso = 85;
    const imc = parseFloat((peso / Math.pow(estatura / 100, 2)).toFixed(2));
    const cintura = 92;
    const cadera = 98;
    const { icc, clasificacion } = calcICC(cintura, cadera, "M");
    const grasaEstimada = calcGrasaDeurenberg(imc, clienteFechaNac, "M");

    await prisma.medicion.create({
      data: {
        clienteId: cliente.id,
        coachId: coach.id,
        fechaMedicion: new Date("2026-01-10"),
        pesoKg: peso,
        estaturaCm: estatura,
        imc,
        icc,
        iccClasificacion: clasificacion,
        cinturaCm: cintura,
        caderaCm: cadera,
        toraxCm: 100,
        bicepsCm: 35,
        musloCm: 58,
        pantorrillaCm: 38,
        porcentajeGrasa: grasaEstimada,
        grasaEstimada: true,
        notas: "Medición inicial",
      },
    });
  }

  // Membresía MENSUAL activa para Martín
  const membresiaExistente = await prisma.membresia.findFirst({ where: { clienteId: cliente.id } });
  if (!membresiaExistente) {
    const hoy = new Date();
    const fin = new Date(hoy.getTime() + 25 * 24 * 60 * 60 * 1000); // vence en 25 días
    await prisma.membresia.create({
      data: {
        clienteId: cliente.id,
        tipo: "MENSUAL",
        fechaInicio: new Date("2026-04-01"),
        fechaFin: fin,
        precio: 80000,
        estado: "ACTIVA",
        notas: "Membresía de prueba seeded",
      },
    });
  }

  // ── Cliente VIP: Valentina ────────────────────────────────────────────────
  const vipHash = await bcrypt.hash("cliente123", 10);
  const vipUsuario = await prisma.usuario.upsert({
    where: { email: "valentina@test.com" },
    update: {},
    create: {
      email: "valentina@test.com",
      passwordHash: vipHash,
      nombre: "Valentina Ríos",
      rol: "CLIENTE",
    },
  });

  const vipFechaNac = new Date("1992-07-20");
  const clienteVIP = await prisma.cliente.upsert({
    where: { usuarioId: vipUsuario.id },
    update: { esVIP: true, aceptoTratamientoDatos: true, fechaAceptacion: new Date("2026-01-01") },
    create: {
      usuarioId: vipUsuario.id,
      telefono: "+57323456789",
      fechaNacimiento: vipFechaNac,
      genero: "F",
      objetivo: "TONIFICACION",
      esVIP: true,
      aceptoTratamientoDatos: true,
      fechaAceptacion: new Date("2026-01-01"),
    },
  });

  // Medición inicial de Valentina
  const vipMedicion = await prisma.medicion.findFirst({ where: { clienteId: clienteVIP.id } });
  if (!vipMedicion) {
    const estatura = 163;
    const peso = 62;
    const imc = parseFloat((peso / Math.pow(estatura / 100, 2)).toFixed(2));
    const cintura = 68;
    const cadera = 95;
    const { icc, clasificacion } = calcICC(cintura, cadera, "F");
    const grasaEstimada = calcGrasaDeurenberg(imc, vipFechaNac, "F");

    await prisma.medicion.create({
      data: {
        clienteId: clienteVIP.id,
        coachId: coach.id,
        fechaMedicion: new Date("2026-01-15"),
        pesoKg: peso,
        estaturaCm: estatura,
        imc,
        icc,
        iccClasificacion: clasificacion,
        cinturaCm: cintura,
        caderaCm: cadera,
        toraxCm: 88,
        bicepsCm: 28,
        musloCm: 55,
        pantorrillaCm: 35,
        porcentajeGrasa: grasaEstimada,
        grasaEstimada: true,
        notas: "Medición inicial VIP",
      },
    });
  }

  // Membresía VIP activa para Valentina
  const vipMembresiaExistente = await prisma.membresia.findFirst({ where: { clienteId: clienteVIP.id } });
  if (!vipMembresiaExistente) {
    const hoy = new Date();
    const fin = new Date(hoy.getTime() + 28 * 24 * 60 * 60 * 1000);
    await prisma.membresia.create({
      data: {
        clienteId: clienteVIP.id,
        tipo: "VIP",
        fechaInicio: new Date("2026-04-01"),
        fechaFin: fin,
        precio: 200000,
        estado: "ACTIVA",
        notas: "Membresía VIP seeded",
      },
    });
  }

  // ── Contenido estático ─────────────────────────────────────────────────────
  const contenidos = [
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
El titular de los datos tiene derecho a **Acceder, Rectificar, Cancelar y Oponerse** al tratamiento de sus datos. Para ejercer estos derechos, ingrese a la sección **Mis datos** en la app.

## 5. Conservación de datos
Los datos se conservarán por el período de la relación contractual y por los 5 años adicionales requeridos por normativa fiscal colombiana.

## 6. Seguridad
Los datos se almacenan de forma segura con acceso restringido al personal autorizado.`,
    },
  ];

  for (const c of contenidos) {
    await prisma.contenidoEstatico.upsert({
      where: { clave: c.clave },
      update: {},
      create: c,
    });
  }

  console.log("✅ Seed completado:");
  console.log("   Admin:          admin@castrogym.com  / admin123");
  console.log("   Coach:          andres@castrogym.com / coach123");
  console.log("   Cliente regular: martin@test.com      / cliente123  (membresía MENSUAL activa)");
  console.log("   Cliente VIP:    valentina@test.com   / cliente123  (membresía VIP activa)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
