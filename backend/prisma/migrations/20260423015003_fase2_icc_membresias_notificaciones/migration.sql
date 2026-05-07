-- CreateTable
CREATE TABLE "Membresia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fechaInicio" DATETIME NOT NULL,
    "fechaFin" DATETIME NOT NULL,
    "precio" REAL NOT NULL,
    "estado" TEXT NOT NULL,
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membresia_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContenidoEstatico" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clave" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "fechaActualizacion" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NotificacionPendiente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "datos" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "fechaEnvio" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "fechaNacimiento" DATETIME NOT NULL,
    "genero" TEXT NOT NULL,
    "objetivo" TEXT NOT NULL,
    "limitacionesFisicas" TEXT,
    "aceptoTratamientoDatos" BOOLEAN NOT NULL DEFAULT false,
    "fechaAceptacion" DATETIME,
    "esVIP" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Cliente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Cliente" ("fechaNacimiento", "genero", "id", "limitacionesFisicas", "objetivo", "telefono", "usuarioId") SELECT "fechaNacimiento", "genero", "id", "limitacionesFisicas", "objetivo", "telefono", "usuarioId" FROM "Cliente";
DROP TABLE "Cliente";
ALTER TABLE "new_Cliente" RENAME TO "Cliente";
CREATE UNIQUE INDEX "Cliente_usuarioId_key" ON "Cliente"("usuarioId");
CREATE TABLE "new_Medicion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "citaId" TEXT,
    "fechaMedicion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pesoKg" REAL NOT NULL,
    "estaturaCm" INTEGER NOT NULL,
    "imc" REAL NOT NULL,
    "icc" REAL,
    "iccClasificacion" TEXT,
    "toraxCm" INTEGER,
    "cinturaCm" INTEGER,
    "caderaCm" INTEGER,
    "bicepsCm" INTEGER,
    "musloCm" INTEGER,
    "pantorrillaCm" INTEGER,
    "porcentajeGrasa" REAL,
    "masaMuscular" REAL,
    "densidadOsea" REAL,
    "grasaEstimada" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    CONSTRAINT "Medicion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Medicion_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Medicion_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Medicion" ("bicepsCm", "caderaCm", "cinturaCm", "citaId", "clienteId", "coachId", "estaturaCm", "fechaMedicion", "id", "imc", "musloCm", "notas", "pantorrillaCm", "pesoKg", "toraxCm") SELECT "bicepsCm", "caderaCm", "cinturaCm", "citaId", "clienteId", "coachId", "estaturaCm", "fechaMedicion", "id", "imc", "musloCm", "notas", "pantorrillaCm", "pesoKg", "toraxCm" FROM "Medicion";
DROP TABLE "Medicion";
ALTER TABLE "new_Medicion" RENAME TO "Medicion";
CREATE UNIQUE INDEX "Medicion_citaId_key" ON "Medicion"("citaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ContenidoEstatico_clave_key" ON "ContenidoEstatico"("clave");
