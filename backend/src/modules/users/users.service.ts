import argon2 from "argon2";

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
  const passwordHash = await argon2.hash(
    input.password,
    {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    }
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