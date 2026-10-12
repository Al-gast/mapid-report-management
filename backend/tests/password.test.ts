import { describe, expect, it } from "vitest";

import {
  hashPassword,
  verifyPassword,
} from "../src/lib/password.js";

describe("Password Security", () => {
  const password = "StrongTestPassword2026!";

  it("should hash password using Argon2id", async () => {
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("should verify correct password", async () => {
    const hash = await hashPassword(password);

    const valid = await verifyPassword(
      hash,
      password
    );

    expect(valid).toBe(true);
  });

  it("should reject incorrect password", async () => {
    const hash = await hashPassword(password);

    const valid = await verifyPassword(
      hash,
      "IncorrectPassword"
    );

    expect(valid).toBe(false);
  });
});