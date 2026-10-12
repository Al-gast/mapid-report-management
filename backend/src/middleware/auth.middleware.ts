import type { RequestHandler } from "express";

import {
  getSessionUser,
  SESSION_COOKIE_NAME,
  type UserRole,
} from "../modules/auth/auth.service.js";

export const requireAuth: RequestHandler = async (
  req,
  res,
  next
) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (typeof token !== "string") {
    res.status(401).json({
      success: false,
      message: "Unauthenticated",
    });
    return;
  }

  const user = await getSessionUser(token);

  if (!user) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired session",
    });
    return;
  }

  req.authUser = user;

  next();
};

export const requireRole = (
  ...allowedRoles: UserRole[]
): RequestHandler => {
  return (req, res, next) => {
    const user = req.authUser;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Unauthenticated",
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: "Forbidden",
      });
      return;
    }

    next();
  };
};