import { Router, type Request } from "express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";

import {
  verifyCredentials,
  createSession,
  getSessionUser,
  revokeSession,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
} from "./auth.service.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(255)
    .transform((value) => value.toLowerCase()),

  password: z.string().min(1).max(1024),
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many login attempts. Try again later.",
  },
});

function getCookieToken(req: Request): string | undefined {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  return typeof token === "string" ? token : undefined;
}

// POST /api/auth/login
authRouter.post("/login", loginLimiter, async (req, res) => {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid login input",
    });
  }

  const { email, password } = validation.data;

  const user = await verifyCredentials(email, password);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const previousToken = getCookieToken(req);

  if (previousToken) {
    await revokeSession(previousToken);
  }

  const token = await createSession(user.id);

  res.cookie(SESSION_COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: SESSION_TTL_MS,
  });

  return res.status(200).json({
    success: true,
    message: "Login successful",
    data: { user },
  });
});

// GET /api/auth/me
authRouter.get("/me", async (req, res) => {
  const token = getCookieToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthenticated",
    });
  }

  const user = await getSessionUser(token);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session",
    });
  }

  return res.status(200).json({
    success: true,
    data: { user },
  });
});

// POST /api/auth/logout
authRouter.post("/logout", async (req, res) => {
  const token = getCookieToken(req);

  if (token) {
    await revokeSession(token);
  }

  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});