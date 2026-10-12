import "dotenv/config";
import { hashPassword } from "../src/lib/password.js";
import { pool } from "../src/config/database.js";

type ExistingUser = {
  id: string;
  role: string;
};

async function seedAdmin() {
  const name =
    process.env.SEED_ADMIN_NAME?.trim() || "System Admin";

  const email =
    process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();

  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required"
    );
  }

  if (
    name.length > 150 ||
    email.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("Invalid admin name or email");
  }

  if (password.length < 12) {
    throw new Error(
      "Admin password must contain at least 12 characters"
    );
  }

  const existing = await pool.query<ExistingUser>(
    `SELECT id, role
     FROM app.users
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [email]
  );

  if (existing.rows.length > 0) {
    if (existing.rows[0].role !== "admin") {
      throw new Error(
        "Email already belongs to a non-admin account"
      );
    }

    console.log("Admin already exists. Skipping seed.");
    return;
  }

  const passwordHash = await hashPassword(password);

  const result = await pool.query<{ id: string }>(
    `INSERT INTO app.users (
       name,
       email,
       password_hash,
       role
     )
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [name, email, passwordHash, "admin"]
  );

  console.log("Admin created successfully.");
  console.log("Admin ID:", result.rows[0].id);
}

try {
  await seedAdmin();
} catch (error) {
  console.error("Admin seeding failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}