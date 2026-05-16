#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# deploy.sh — Castro Gym VPS deployment script
# Uso: bash deploy.sh
# ─────────────────────────────────────────────────────────────────
set -e

APP_DIR="/var/www/castrogym"

echo "──────────────────────────────────────────"
echo " Castro Gym — Deploy"
echo "──────────────────────────────────────────"

cd "$APP_DIR"

# 1. Obtener última versión del código
echo "[1/5] Actualizando código desde GitHub..."
git pull origin main

# 2. Backend
echo "[2/5] Instalando dependencias del backend..."
cd "$APP_DIR/backend"
npm install --omit=dev

echo "  Preparando Prisma (SQLite)..."
npx prisma generate
npx prisma db push

echo "  Compilando TypeScript..."
npm run build

# 3. Frontend
echo "[3/5] Instalando dependencias del frontend..."
cd "$APP_DIR/frontend"
npm install --omit=dev

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
