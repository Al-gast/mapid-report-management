import { hashPassword } from "../../lib/password.js";

import { pool } from "../../config/database.js";

import type {
  CreateUserInput,
} from "./users.schema.js";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "pelapor" | "approver";
  is_active: boolean;
  created_at: Date;
};

export async function createUser(
  input: CreateUserInput
): Promise<PublicUser> {
  const passwordHash = await hashPassword(
    input.password
  );

  const result = await pool.query<PublicUser>(
    `INSERT INTO app.users (
       name,
       email,
       password_hash,
       role
     )
     VALUES ($1, $2, $3, $4)
     RETURNING
       id,
       name,
       email,
       role,
       is_active,
       created_at`,
    [
      input.name,
      input.email,
      passwordHash,
      input.role,
    ]
  );

  return result.rows[0]!;
}