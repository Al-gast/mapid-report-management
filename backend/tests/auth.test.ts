import request from "supertest";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  verifyCredentials: vi.fn(),
  createSession: vi.fn(),
  getSessionUser: vi.fn(),
  revokeSession: vi.fn(),
  createUser: vi.fn(),
  dbQuery: vi.fn(),
}));

vi.mock("../src/config/database.js", () => ({
  pool: {
    query: mocks.dbQuery,
  },
}));

vi.mock("../src/modules/auth/auth.service.js", () => ({
  verifyCredentials: mocks.verifyCredentials,
  createSession: mocks.createSession,
  getSessionUser: mocks.getSessionUser,
  revokeSession: mocks.revokeSession,
  SESSION_COOKIE_NAME: "mapid_session",
  SESSION_TTL_MS: 604800000,
}));

vi.mock("../src/modules/users/users.service.js", () => ({
  createUser: mocks.createUser,
}));

import app from "../src/app.js";

const ORIGIN = "http://localhost:8000";
const PASSWORD = "StrongTestPassword2026!";
const TOKEN = "a".repeat(64);

const admin = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Test Admin",
  email: "admin@example.com",
  role: "admin",
};

const pelapor = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Test Pelapor",
  email: "pelapor@example.com",
  role: "pelapor",
};

const users = [admin, pelapor];

const sessions = new Map<string, typeof admin>();

async function loginAs(
  email: string,
  client = request.agent(app)
) {
  const response = await client
    .post("/api/auth/login")
    .set("Origin", ORIGIN)
    .send({ email, password: PASSWORD });

  return { response, client };
}

beforeEach(() => {
  vi.resetAllMocks();
  sessions.clear();

  mocks.verifyCredentials.mockImplementation(
    async (email: string, password: string) => {
      if (password !== PASSWORD) return null;

      return users.find((u) => u.email === email) ?? null;
    }
  );

  mocks.createSession.mockImplementation(
    async (userId: string) => {
      const user = users.find((u) => u.id === userId);

      if (user) sessions.set(TOKEN, user);

      return TOKEN;
    }
  );

  mocks.getSessionUser.mockImplementation(
    async (token: string) => sessions.get(token) ?? null
  );

  mocks.revokeSession.mockImplementation(
    async (token: string) => {
      sessions.delete(token);
    }
  );

  mocks.dbQuery.mockResolvedValue({
    rows: [admin],
  });

  mocks.createUser.mockResolvedValue({
    ...pelapor,
    is_active: true,
    created_at: new Date(),
  });
});

describe("Authentication API", () => {
    it("should reject POST without Origin", async () => {
    const { client } = await loginAs(admin.email);

    const response = await client
        .post("/api/users")
        .send({
        name: "Test User",
        email: "test@example.com",
        password: PASSWORD,
        role: "pelapor",
        });

    expect(response.status).toBe(403);
    expect(mocks.createUser).not.toHaveBeenCalled();
    });

  it("should login, get profile, and logout", async () => {
    const { response, client } = await loginAs(
      admin.email
    );

    expect(response.status).toBe(200);
    expect(response.body.data.user.role).toBe("admin");

    expect(response.headers["set-cookie"][0])
      .toContain("HttpOnly");

    const me = await client.get("/api/auth/me");

    expect(me.status).toBe(200);
    expect(me.body.data.user.id).toBe(admin.id);

    const logout = await client
      .post("/api/auth/logout")
      .set("Origin", ORIGIN);

    expect(logout.status).toBe(200);

    const afterLogout = await client.get(
      "/api/auth/me"
    );

    expect(afterLogout.status).toBe(401);
  });

  it("should reject incorrect credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", ORIGIN)
      .send({
        email: admin.email,
        password: "WrongPassword123!",
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("should reject unauthenticated requests", async () => {
    const me = await request(app).get("/api/auth/me");
    const list = await request(app).get("/api/users");

    expect(me.status).toBe(401);
    expect(list.status).toBe(401);
  });

  it("should allow Admin to list users", async () => {
    const { client } = await loginAs(admin.email);

    const response = await client.get("/api/users");

    expect(response.status).toBe(200);
    expect(response.body.data.users).toHaveLength(1);
  });

  it("should forbid Pelapor from listing users", async () => {
    const { client } = await loginAs(pelapor.email);

    const response = await client.get("/api/users");

    expect(response.status).toBe(403);
  });

  it("should allow Admin to create Pelapor", async () => {
    const { client } = await loginAs(admin.email);

    const response = await client
      .post("/api/users")
      .set("Origin", ORIGIN)
      .send({
        name: "Test Pelapor",
        email: "PELAPOR@example.com",
        password: PASSWORD,
        role: "pelapor",
      });

    expect(response.status).toBe(201);

    expect(mocks.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "pelapor@example.com",
        role: "pelapor",
      })
    );
  });

  it("should reject creation of Admin through API", async () => {
    const { client } = await loginAs(admin.email);

    const response = await client
      .post("/api/users")
      .set("Origin", ORIGIN)
      .send({
        name: "New Admin",
        email: "newadmin@example.com",
        password: PASSWORD,
        role: "admin",
      });

    expect(response.status).toBe(400);
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it("should return 409 for duplicate email", async () => {
    const { client } = await loginAs(admin.email);

    mocks.createUser.mockRejectedValueOnce({
      code: "23505",
      constraint: "idx_users_email_unique",
    });

    const response = await client
      .post("/api/users")
      .set("Origin", ORIGIN)
      .send({
        name: "Duplicate User",
        email: "duplicate@example.com",
        password: PASSWORD,
        role: "pelapor",
      });

    expect(response.status).toBe(409);
  });

  it("should reject untrusted origin", async () => {
    const { client } = await loginAs(admin.email);

    const response = await client
      .post("/api/users")
      .set("Origin", "https://malicious.example")
      .send({
        name: "Unauthorized",
        email: "unauthorized@example.com",
        password: PASSWORD,
        role: "pelapor",
      });

    expect(response.status).toBe(403);
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
});