import express from "express";
import { pool } from "./config/database.js";
import cookieParser from "cookie-parser";

import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import {
  reportsRouter,
} from "./modules/reports/reports.routes.js";

import { errorHandler } from "./middleware/error.middleware.js";
import {
  requireTrustedOrigin,
} from "./middleware/csrf.middleware.js";

const app = express();

app.disable("x-powered-by");
// Global Middleware
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

// CSRF Protection Middleware
app.use(requireTrustedOrigin);

app.use(express.json());

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Health-check routes
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "MAPID API is running",
  });
});

app.get("/api/health/db", async (_req, res) => {
  try {
    await pool.query("SELECT 1 FROM app.users LIMIT 1");

    res.status(200).json({
      success: true,
      message: "Database connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      success: false,
      message: "Database unavailable",
    });
  }
});

// Authentication routes
app.use("/api/auth", authRouter);

// Protected user management routes
app.use("/api/users", usersRouter);

// Protected report management routes
app.use("/api/reports", reportsRouter);

// Error handler
app.use(errorHandler);

export default app;

