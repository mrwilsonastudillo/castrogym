#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# deploy.sh — Castro Gym VPS deployment script
# Uso: bash deploy.sh
# ─────────────────────────────────────────────────────────────────
set -e

APP_DIR="/home/castrogym/agendamedidas"
DB_PATH="$APP_DIR/backend/prisma/dev.db"

echo "──────────────────────────────────────────"
echo " Castro Gym — Deploy"
echo "──────────────────────────────────────────"

cd "$APP_DIR"

# 0. Backup de la base de datos antes de cualquier cambio
echo "[0/5] Respaldando base de datos..."
if [ -f "$DB_PATH" ]; then
  BACKUP="${DB_PATH}.bak-$(date +%Y%m%d%H%M%S)"
  cp "$DB_PATH" "$BACKUP"
  echo "  Backup creado: $BACKUP"
  # Conservar solo los últimos 5 backups
  ls -t "${DB_PATH}.bak-"* 2>/dev/null | tail -n +6 | xargs rm -f
  echo "  Backups disponibles: $(ls ${DB_PATH}.bak-* 2>/dev/null | wc -l)"
else
  echo "  ADVERTENCIA: No se encontró dev.db en $DB_PATH"
fi

# 1. Obtener última versión del código
echo "[1/5] Actualizando código desde GitHub..."
git pull origin main

# 2. Backend
echo "[2/5] Instalando dependencias del backend..."
cd "$APP_DIR/backend"
npm install  # incluye devDependencies (tsc, tsx, etc.) necesarias para compilar

echo "  Preparando Prisma (SQLite)..."
# DATABASE_URL con ruta absoluta: Prisma resuelve rutas relativas desde el
# directorio del schema (prisma/), por lo que "file:./prisma/dev.db" en .env
# apuntaría a prisma/prisma/dev.db — incorrecto. Usamos ruta absoluta aquí.
export DATABASE_URL="file:$DB_PATH"
npx prisma generate
npx prisma db push

echo "  Compilando TypeScript..."
npx tsc      # usar el tsc local del proyecto, no el global

# 3. Frontend
echo "[3/5] Instalando dependencias del frontend..."
cd "$APP_DIR/frontend"
npm install  # incluye devDependencias necesarias para el build de Next.js

echo "  Compilando Next.js..."
# Apache proxia /agendamedidas/api → backend y /agendamedidas → frontend
# Por eso la URL base es el prefijo completo con el subpath
NEXT_PUBLIC_API_URL=https://castrogym.com/agendamedidas NEXT_PUBLIC_BASE_PATH=/agendamedidas npm run build

# 4. Reiniciar procesos con PM2
echo "[4/5] Reiniciando servicios con PM2..."
cd "$APP_DIR"
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js
pm2 save

echo ""
echo "✓ Deploy completado exitosamente"
echo "  Frontend: https://castrogym.com/agendamedidas"
echo "  Backend:  https://castrogym.com/agendamedidas/api/health"
