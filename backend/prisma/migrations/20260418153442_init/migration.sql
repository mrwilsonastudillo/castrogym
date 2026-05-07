-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "fechaNacimiento" DATETIME NOT NULL,
    "genero" TEXT NOT NULL,
    "objetivo" TEXT NOT NULL,
    "limitacionesFisicas" TEXT,
    CONSTRAINT "Cliente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "especialidad" TEXT,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Coach_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HorarioCoach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "duracionCitaMinutos" INTEGER NOT NULL DEFAULT 30,
    CONSTRAINT "HorarioCoach_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "fechaInicio" DATETIME NOT NULL,
    "fechaFin" DATETIME NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'AGENDADA',
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cita_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Cita_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Medicion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "citaId" TEXT,
    "fechaMedicion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pesoKg" REAL NOT NULL,
    "estaturaCm" INTEGER NOT NULL,
    "imc" REAL NOT NULL,
    "toraxCm" INTEGER,
    "cinturaCm" INTEGER,
    "caderaCm" INTEGER,
    "bicepsCm" INTEGER,
    "musloCm" INTEGER,
    "pantorrillaCm" INTEGER,
    "notas" TEXT,
    CONSTRAINT "Medicion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Medicion_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Medicion_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_usuarioId_key" ON "Cliente"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Coach_usuarioId_key" ON "Coach"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "HorarioCoach_coachId_diaSemana_key" ON "HorarioCoach"("coachId", "diaSemana");

-- CreateIndex
CREATE UNIQUE INDEX "Medicion_citaId_key" ON "Medicion"("citaId");
