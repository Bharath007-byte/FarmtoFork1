import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { env } from "../env.js";
import { prisma } from "../db.js";
import type { Role } from "@prisma/client";

export type AuthUser = {
  id: string;
  role: Role;
  email: string;
  name: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    env.jwtSecret,
    {
      expiresIn: "7d",
    }
  );
}

export async function auth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  const token = header?.startsWith("Bearer ")
    ? header.slice(7).trim()
    : "";

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
      code: 401,
    });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as {
      id?: string;
    };

    if (!payload.id) {
      return res.status(401).json({
        error: "Unauthorized",
        code: 401,
      });
    }

    /*
     * Important security rule:
     *
     * Never trust the role stored inside the JWT.
     * The database is the source of truth for the
     * user's current role and account state.
     */
    const user = await prisma.user.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        role: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        code: 401,
      });
    }

    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    };

    next();
  } catch {
    return res.status(401).json({
      error: "Unauthorized",
      code: 401,
    });
  }
}

export function requireRole(...roles: Role[]) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        code: 401,
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        code: 403,
      });
    }

    next();
  };
}
