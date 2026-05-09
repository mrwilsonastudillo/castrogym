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

echo "  Preparando Prisma para PostgreSQL..."
# Cambia provider a postgresql para producción (el schema en git usa sqlite)
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
npx prisma generate
npx prisma db push

echo "  Compilando TypeScript..."
npm run build

# 3. Frontend
echo "[3/5] Instalando dependencias del frontend..."
cd "$APP_DIR/frontend"
npm install --omit=dev

echo "  Compilando Next.js..."
npm run build

# 4. Reiniciar procesos con PM2
echo "[4/5] Reiniciando servicios con PM2..."
cd "$APP_DIR"
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js
pm2 save

# 5. Restaurar schema para dev (opcional: comenta si no usas dev en el VPS)
echo "[5/5] Restaurando schema sqlite para desarrollo local..."
cd "$APP_DIR/backend"
sed -i 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma

echo ""
echo "✓ Deploy completado exitosamente"
echo "  Frontend: https://castrogym.com"
echo "  Backend:  https://castrogym.com/api/health"
