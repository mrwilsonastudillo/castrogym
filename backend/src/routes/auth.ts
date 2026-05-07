import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { env } from "../utils/env";
import { authenticate } from "../middleware/auth";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyRecaptcha(token: string): Promise<boolean> {
  if (!env.RECAPTCHA_SECRET_KEY) return true; // Skip if not configured
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(env.RECAPTCHA_SECRET_KEY)}&response=${encodeURIComponent(token)}`,
    });
    const data = (await res.json()) as { success: boolean; score: number };
    return data.success && data.score >= 0.5;
  } catch {
    return false;
  }
}

async function getGoogleUser(
  accessToken: string
): Promise<{ id: string; email: string; name: string } | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { sub?: string; email?: string; name?: string };
    if (!data.sub || !data.email) return null;
    return { id: data.sub, email: data.email, name: data.name ?? "" };
  } catch {
    return null;
  }
}

async function getFacebookUser(
  accessToken: string
): Promise<{ id: string; email: string; name: string } | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      id?: string;
      name?: string;
      email?: string;
      error?: unknown;
    };
    if (data.error || !data.id) return null;

    // Verify the token belongs to our app
    const debugRes = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(`${env.FACEBOOK_APP_ID}|${env.FACEBOOK_APP_SECRET}`)}`
    );
    if (!debugRes.ok) return null;
    const debug = (await debugRes.json()) as {
      data?: { app_id?: string; is_valid?: boolean };
    };
    if (!debug.data?.is_valid || debug.data.app_id !== env.FACEBOOK_APP_ID) return null;

    return { id: data.id, email: data.email ?? "", name: data.name ?? "" };
  } catch {
    return null;
  }
}

function buildJwtResponse(usuario: {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  cliente?: { id: string } | null;
  coach?: { id: string } | null;
}) {
  const token = jwt.sign(
    { userId: usuario.id, email: usuario.email, rol: usuario.rol },
    env.JWT_SECRET,
    { expiresIn: "24h" }
  );
  return {
    token,
    usuario: {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      clienteId: usuario.cliente?.id ?? null,
      coachId: usuario.coach?.id ?? null,
    },
  };
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nombre: z.string().min(2),
  telefono: z.string().min(8),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  genero: z.enum(["M", "F"]),
  objetivo: z.enum(["PERDIDA_PESO", "GANANCIA_MUSCULAR", "TONIFICACION", "OTRO"]),
  limitacionesFisicas: z.string().optional(),
  aceptoTratamientoDatos: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar el tratamiento de datos personales" }),
  }),
  recaptchaToken: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  recaptchaToken: z.string().optional(),
});

const SocialSchema = z.object({
  provider: z.enum(["google", "facebook"]),
  token: z.string().min(1),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post("/register", async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const data = parsed.data;

  if (data.recaptchaToken) {
    const valid = await verifyRecaptcha(data.recaptchaToken);
    if (!valid) {
      res.status(400).json({ error: "Verificación de seguridad fallida. Intenta de nuevo." });
      return;
    }
  }

  const existe = await prisma.usuario.findUnique({ where: { email: data.email } });
  if (existe) {
    res.status(409).json({ error: "Email ya registrado" });
    return;
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const usuario = await prisma.usuario.create({
    data: {
      email: data.email,
      passwordHash,
      nombre: data.nombre,
      rol: "CLIENTE",
      cliente: {
        create: {
          telefono: data.telefono,
          fechaNacimiento: new Date(data.fechaNacimiento),
          genero: data.genero,
          objetivo: data.objetivo,
          limitacionesFisicas: data.limitacionesFisicas,
          aceptoTratamientoDatos: true,
          fechaAceptacion: new Date(),
        },
      },
    },
    include: { cliente: true, coach: true },
  });

  res.status(201).json(buildJwtResponse(usuario));
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  if (parsed.data.recaptchaToken) {
    const valid = await verifyRecaptcha(parsed.data.recaptchaToken);
    if (!valid) {
      res.status(400).json({ error: "Verificación de seguridad fallida. Intenta de nuevo." });
      return;
    }
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: parsed.data.email },
    include: { cliente: true, coach: true },
  });

  if (!usuario || !usuario.activo) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  if (!usuario.passwordHash) {
    res.status(401).json({ error: "Esta cuenta usa inicio de sesión con red social" });
    return;
  }

  const ok = await bcrypt.compare(parsed.data.password, usuario.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  res.json(buildJwtResponse(usuario));
});

router.post("/social", async (req: Request, res: Response) => {
  const parsed = SocialSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { provider, token } = parsed.data;

  const socialUser =
    provider === "google"
      ? await getGoogleUser(token)
      : await getFacebookUser(token);

  if (!socialUser) {
    res.status(401).json({ error: "Token de red social inválido" });
    return;
  }

  // Find user by provider+id or by email
  let usuario = await prisma.usuario.findFirst({
    where: {
      OR: [
        { providerId: socialUser.id, provider },
        ...(socialUser.email ? [{ email: socialUser.email }] : []),
      ],
    },
    include: { cliente: true, coach: true },
  });

  if (!usuario) {
    // Create new user with minimal profile (can be completed later)
    const email =
      socialUser.email || `${provider}_${socialUser.id}@castrogym.social`;
    usuario = await prisma.usuario.create({
      data: {
        email,
        nombre: socialUser.name || `Usuario ${provider}`,
        rol: "CLIENTE",
        provider,
        providerId: socialUser.id,
        cliente: {
          create: {
            telefono: "0000000000",
            fechaNacimiento: new Date("2000-01-01"),
            genero: "M",
            objetivo: "OTRO",
            aceptoTratamientoDatos: true,
            fechaAceptacion: new Date(),
          },
        },
      },
      include: { cliente: true, coach: true },
    });
  } else if (!usuario.provider) {
    // Existing local user — link social provider
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { provider, providerId: socialUser.id },
    });
  }

  if (!usuario.activo) {
    res.status(401).json({ error: "Cuenta desactivada" });
    return;
  }

  res.json(buildJwtResponse(usuario));
});

router.get("/me", authenticate, async (req: Request, res: Response) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.user!.userId },
    include: { cliente: true, coach: true },
  });

  if (!usuario) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  res.json({
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    activo: usuario.activo,
    createdAt: usuario.createdAt,
    clienteId: usuario.cliente?.id ?? null,
    coachId: usuario.coach?.id ?? null,
    esVIP: usuario.cliente?.esVIP ?? false,
    avatarPersonaje: usuario.cliente?.avatarPersonaje ?? null,
  });
});

export default router;
