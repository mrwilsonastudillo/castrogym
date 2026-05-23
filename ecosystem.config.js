module.exports = {
  apps: [
    {
      name: "castrogym-backend",
      cwd: "/home/castrogym/agendamedidas/backend",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        // Ruta absoluta — evita que un cambio de CWD apunte a la DB equivocada
        DATABASE_URL: "file:/home/castrogym/agendamedidas/backend/prisma/dev.db",
      },
    },
    {
      name: "castrogym-frontend",
      cwd: "/home/castrogym/agendamedidas/frontend",
      script: "node_modules/.bin/next",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        // Nota: NEXT_PUBLIC_* se hornea en el build, no en runtime.
        // Este valor es referencia — lo que importa es pasarlo en npm run build (ver deploy.sh).
        NEXT_PUBLIC_API_URL: "https://castrogym.com/agendamedidas",
      },
    },
  ],
};
