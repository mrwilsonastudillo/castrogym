import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../utils/env";

export interface AuthPayload {
  userId: string;
  email: string;
  rol: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token requerido" });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function requireRol(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      res.status(403).json({ error: "Sin permiso" });
      return;
    }
    next();
  };
}
