-- RedefineTables: make passwordHash optional, add provider/providerId
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT,
    "providerId" TEXT
);
INSERT INTO "new_Usuario" ("activo", "createdAt", "email", "id", "nombre", "passwordHash", "rol")
SELECT "activo", "createdAt", "email", "id", "nombre", "passwordHash", "rol" FROM "Usuario";
DROP TABLE "Usuario";
ALTER TABLE "new_Usuario" RENAME TO "Usuario";
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
