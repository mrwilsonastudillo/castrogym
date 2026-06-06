/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  // basePath solo en producción (Apache sirve bajo /agendamedidas)
  // En desarrollo el frontend corre en http://localhost:3000
  ...(isProd && {
    basePath: "/agendamedidas",
    assetPrefix: "/agendamedidas",
  }),
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  },
};

module.exports = nextConfig;
