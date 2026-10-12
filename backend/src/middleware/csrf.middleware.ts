import "dotenv/config";
import type { RequestHandler } from "express";

const allowedOrigins = new Set(
  (process.env.APP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const protectedMethods = new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

export const requireTrustedOrigin: RequestHandler = (
  req,
  res,
  next
) => {
  if (!protectedMethods.has(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");

  if (!origin || !allowedOrigins.has(origin)) {
    res.status(403).json({
      success: false,
      message: "Untrusted request origin",
    });
    return;
  }

  next();
};