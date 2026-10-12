import { z } from "zod";

export const createUserSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(150, "Name is too long"),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email().max(255)),

  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password is too long"),

  role: z.enum(["pelapor", "approver"]),
});

export type CreateUserInput = z.infer<
  typeof createUserSchema
>;