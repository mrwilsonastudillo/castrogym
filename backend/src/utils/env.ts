import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=").replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db",
  JWT_SECRET: process.env.JWT_SECRET ?? "fallback-secret-change-in-prod",
  PORT: parseInt(process.env.PORT ?? "3001", 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID ?? "",
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET ?? "",
  RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY ?? "",
  // Mailgun SMTP
  SMTP_HOST: process.env.SMTP_HOST ?? "smtp.mailgun.org",
  SMTP_PORT: parseInt(process.env.SMTP_PORT ?? "587", 10),
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASS: process.env.SMTP_PASS ?? "",
  SMTP_FROM: process.env.SMTP_FROM ?? "Castro Gym <noreply@castrogym.com>",
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:3000",
};
