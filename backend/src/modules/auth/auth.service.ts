import argon2 from "argon2";
import { randomBytes, createHash } from "node:crypto";
import { pool } from "../../config/database.js";

export type UserRole = "admin" | "pelapor" | "approver";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type UserWithPassword = AuthUser & {
  password_hash: string;
};

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-mapid_session"
    : "mapid_session";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const result = await pool.query<UserWithPassword>(
    `SELECT id, name, email, role, password_hash
     FROM app.users
     WHERE LOWER(email) = $1
       AND is_active = TRUE
     LIMIT 1`,
    [email]
  );

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  const validPassword = await argon2.verify(
    user.password_hash,
    password
  );

  if (!validPassword) {
    return null;
  }

  const { password_hash: _passwordHash, ...authUser } = user;

  return authUser;
}

export async function createSession(
  userId: string
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  const expiresAt = new Date(
    Date.now() + SESSION_TTL_MS
  );

  await pool.query(
    `INSERT INTO app.sessions (
       user_id,
       token_hash,
       expires_at
     )
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  return token;
}

export async function getSessionUser(
  token: string
): Promise<AuthUser | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) {
    return null;
  }

  const result = await pool.query<AuthUser>(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.role
     FROM app.sessions s
     JOIN app.users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > NOW()
       AND u.is_active = TRUE
     LIMIT 1`,
    [hashToken(token)]
  );

  return result.rows[0] ?? null;
}

export async function revokeSession(
  token: string
): Promise<void> {
  if (!/^[0-9a-f]{64}$/.test(token)) {
    return;
  }

  await pool.query(
    `DELETE FROM app.sessions
     WHERE token_hash = $1`,
    [hashToken(token)]
  );
}