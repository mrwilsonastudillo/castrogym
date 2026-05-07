# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Castro Gym is a gym management platform for digitizing body measurements and appointment scheduling. It's a monorepo with two separate apps:

- `backend/` — Node.js + TypeScript + Express + Prisma + SQLite (port 3001)
- `frontend/` — Next.js 14 + TypeScript + Tailwind + shadcn/ui (port 3000)

## Commands

### Backend

```bash
cd backend
npm run dev              # Start dev server with hot reload (tsx watch)
npm run build            # Compile TypeScript to dist/
npm run prisma:migrate   # Run migrations (creates dev.db if missing)
npm run prisma:seed      # Seed test data
npm run prisma:studio    # Open Prisma Studio GUI
npm run prisma:generate  # Regenerate Prisma client after schema changes
```

### Frontend

```bash
cd frontend
npm run dev    # Start Next.js dev server
npm run build  # Production build
npm run lint   # ESLint
```

## Architecture

### Backend

All routes are mounted in `src/index.ts` under `/api/*`. Route files in `src/routes/` handle HTTP logic; business logic lives in `src/services/` (currently `notificaciones.ts`, `workers.ts`). Shared middleware in `src/middleware/`:

- `auth.ts` — `authenticate` (JWT Bearer) and `requireRol(...roles)` middleware
- `disponibilidad.ts`, `vip.ts` — slot calculation and VIP gating

**Background workers** (`src/services/workers.ts`): Two `setInterval` jobs run on startup — one for expiring memberships (every 24h) and one for 24h appointment reminders. A notification queue processor runs every 5 minutes and uses the Resend API (skips silently if `RESEND_API_KEY` is not set).

**Key business rules:**
- IMC auto-calculated on measurement creation: `peso / (estatura_m)²`
- Linking a `citaId` to a `Medicion` atomically marks the `Cita` as `COMPLETADA`
- Appointments can only be cancelled with ≥2h notice
- Pliegues Yuhasz body fat protocol is VIP-only (`esVIP` flag on `Cliente`)
- Coach schedules stored as `"HH:mm"` strings in UTC; `diaSemana` uses 0=Mon…6=Sun

### Frontend

Next.js App Router with all routes under `app/`. Every protected page wraps content in `<ProtectedPage roles={[...]}>` (from `components/layouts/`) which checks `AuthContext` and redirects to `/login` if unauthenticated or to `/dashboard` if the role doesn't match.

**Auth flow:** `AuthContext` (`contexts/AuthContext.tsx`) stores the JWT as `cg_token` in `localStorage`. All API calls go through the `api` helper in `lib/api.ts`, which reads the token and sets the `Authorization: Bearer` header automatically.

**All shared TypeScript types** (entities, API responses) are co-located in `lib/api.ts` — add new types there.

**Frontend env var:** `NEXT_PUBLIC_API_URL` — defaults to `http://localhost:3001`.

### Data Model (key relationships)

```
Usuario (1) ──── (0..1) Cliente ──── (*) Cita, Medicion, Membresia
Usuario (1) ──── (0..1) Coach  ──── (*) HorarioCoach, Cita, Medicion
Cita (1) ──── (0..1) Medicion   ← linking auto-completes the Cita
```

Roles: `"CLIENTE"`, `"COACH"`, `"ADMIN"` (stored as plain strings, not enums).

### Test Credentials

| Role    | Email                   | Password   |
|---------|-------------------------|------------|
| Admin   | admin@castrogym.com     | admin123   |
| Coach   | andres@castrogym.com    | coach123   |
| Cliente | martin@test.com         | cliente123 |

## Environment Variables

**Backend** (create `backend/.env`):
```
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="..."
PORT=3001
CORS_ORIGIN="http://localhost:3000"
RESEND_API_KEY="..."        # optional — notifications skip if missing
RESEND_FROM="Castro Gym <noreply@castrogym.com>"
```

**Frontend** (create `frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```
