import { Router } from "express";

import { pool } from "../../config/database.js";
import {
  requireAuth,
  requireRole,
} from "../../middleware/auth.middleware.js";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole("admin"));

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