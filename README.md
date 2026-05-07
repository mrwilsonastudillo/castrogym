# Castro Gym - MVP

Plataforma para digitalizar toma de medidas y agendamiento de citas en gimnasio.

## Stack

- **Backend:** Node.js + TypeScript + Express + Prisma + SQLite
- **Frontend:** Next.js 14 + TypeScript + Tailwind + shadcn/ui (Sprint 4)
- **Auth:** JWT 24h

## Inicio rápido (Backend)

```bash
cd backend
npm install
npm run prisma:migrate    # crea la base de datos
npm run prisma:seed       # carga datos de prueba
npm run dev               # http://localhost:3001
```

### Credenciales de prueba

| Rol     | Email                     | Contraseña  |
|---------|---------------------------|-------------|
| Admin   | admin@castrogym.com       | admin123    |
| Coach   | andres@castrogym.com      | coach123    |
| Cliente | martin@test.com           | cliente123  |

## Endpoints

### Auth
```
POST /api/auth/register   - Registro de clientes
POST /api/auth/login      - Login → JWT 24h
GET  /api/auth/me         - Perfil autenticado
```

### Clientes
```
GET    /api/clientes              - Lista (admin/coach)
GET    /api/clientes/:id          - Detalle
PATCH  /api/clientes/:id          - Actualizar
```

### Coaches
```
GET   /api/coaches                - Lista pública
POST  /api/coaches                - Crear (admin)
GET   /api/coaches/:id/horarios   - Ver horarios
POST  /api/coaches/:id/horarios   - Configurar horarios (coach/admin)
```

### Citas
```
GET  /api/citas/disponibilidad?coachId=X&fecha=YYYY-MM-DD  - Slots disponibles
POST /api/citas                   - Agendar (cliente)
GET  /api/citas                   - Listar propias
PATCH /api/citas/:id/cancelar     - Cancelar (mín 2h anticipación)
```

### Mediciones
```
POST /api/mediciones              - Registrar + auto-calcular IMC (coach)
GET  /api/mediciones/cliente/:id  - Historial
```

### Reportes
```
GET /api/reportes/cliente/:id     - Progreso + datos para gráficos
```

### Admin
```
GET /api/admin/stats              - Totales: clientes, coaches, citas
```

## Notas de implementación

- Todos los datetimes se manejan en **UTC**. El frontend convierte a la hora local del usuario.
- IMC se calcula automáticamente al registrar una medición: `peso / (estatura_m)²`
- Al registrar una medición con `citaId`, la cita pasa automáticamente a `COMPLETADA` (transacción)
- Los horarios del coach se almacenan como strings `"HH:mm"` en UTC

## Deploy

- Backend → Railway (`railway up`) o Render (free tier)
- Frontend → Vercel (`vercel deploy`)
- Cambiar `JWT_SECRET` y `CORS_ORIGIN` en las variables de entorno de producción
