/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/agendamedidas",
  assetPrefix: "/agendamedidas",
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  },
};

module.exports = nextConfig;
