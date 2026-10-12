import { Router } from "express";

import { pool } from "../../config/database.js";

import {
  requireAuth,
  requireRole,
} from "../../middleware/auth.middleware.js";

import { createUserSchema } from "./users.schema.js";
import { createUser } from "./users.service.js";

export const usersRouter = Router();

// Semua endpoint memerlukan role Admin
usersRouter.use(requireAuth, requireRole("admin"));

// GET /api/users
usersRouter.get("/", async (_req, res) => {
  const result = await pool.query(
    `SELECT
       id,
       name,
       email,
       role,
       is_active,
       created_at
     FROM app.users
     ORDER BY created_at DESC, id DESC
     LIMIT 50`
  );

  res.status(200).json({
    success: true,
    data: {
      users: result.rows,
    },
  });
});

// POST /api/users
usersRouter.post("/", async (req, res) => {
  const validation = createUserSchema.safeParse(
    req.body
  );

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const user = await createUser(validation.data);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: { user },
    });
  } catch (error) {
    const pgError = error as {
      code?: string;
      constraint?: string;
    };

    if (
      pgError?.code === "23505" &&
      pgError.constraint === "idx_users_email_unique"
    ) {
      res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
      return;
    }

    throw error;
  }
});