import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("../src/config/database.js", () => ({
  pool: {
    query: mocks.query,
  },
}));

import {
  createReport,
  getReportById,
  listReports,
  updateReport,
} from "../src/modules/reports/reports.service.js";

import {
  createReportSchema,
  updateReportSchema,
} from "../src/modules/reports/reports.schema.js";

import type {
  AuthUser,
} from "../src/modules/auth/auth.service.js";

const pelapor: AuthUser = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Demo Pelapor",
  email: "pelapor@example.com",
  role: "pelapor",
};

const admin: AuthUser = {
  ...pelapor,
  role: "admin",
};

beforeEach(() => {
  mocks.query.mockReset();
});

describe("Report Management", () => {
  it("should reject status in create payload", () => {
    const result = createReportSchema.safeParse({
      name: "Test Report",
      description: "Test description",
      status: "approved",
    });

    expect(result.success).toBe(false);
  });

  it("should reject empty update payload", () => {
    const result = updateReportSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("should assign reporter from authenticated user", async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [{ id: "report-1", status: "pending" }],
    });

    await createReport(
      {
        name: "Test Report",
        description: "Test description",
      },
      pelapor.id
    );

    const params = mocks.query.mock.calls[0][1];

    expect(params[0]).toBe(pelapor.id);
  });

  it("should scope Pelapor list by reporter_id", async () => {
    mocks.query
      .mockResolvedValueOnce({
        rows: [{ total: "0" }],
      })
      .mockResolvedValueOnce({
        rows: [],
      });

    await listReports(pelapor, {
      page: 1,
      limit: 10,
      sort: "desc",
    });

    const sql = mocks.query.mock.calls[1][0];
    const params = mocks.query.mock.calls[1][1];

    expect(sql).toContain("r.reporter_id = $1");
    expect(params[0]).toBe(pelapor.id);
  });

  it("should allow Admin to list all reports", async () => {
    mocks.query
      .mockResolvedValueOnce({
        rows: [{ total: "0" }],
      })
      .mockResolvedValueOnce({
        rows: [],
      });

    await listReports(admin, {
      page: 1,
      limit: 10,
      sort: "desc",
    });

    const sql = mocks.query.mock.calls[1][0];

    expect(sql).not.toContain("r.reporter_id =");
  });

  it("should scope detail query by ownership", async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [],
    });

    const result = await getReportById(
      "22222222-2222-4222-8222-222222222222",
      pelapor
    );

    expect(result).toBeNull();

    const sql = mocks.query.mock.calls[0][0];
    const params = mocks.query.mock.calls[0][1];

    expect(sql).toContain("reporter_id = $2");
    expect(params[1]).toBe(pelapor.id);
  });

  it("should reject editing non-pending report", async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ status: "approved" }],
      });

    const result = await updateReport(
      "22222222-2222-4222-8222-222222222222",
      pelapor.id,
      { name: "Updated Report" }
    );

    expect(result.kind).toBe("not_pending");

    const sql = mocks.query.mock.calls[0][0];

    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain("reporter_id = $4");
  });
});