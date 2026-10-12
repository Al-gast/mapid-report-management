import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  poolQuery: vi.fn(),
  clientQuery: vi.fn(),
  release: vi.fn(),
}));

vi.mock("../src/config/database.js", () => ({
  pool: {
    connect: mocks.connect,
    query: mocks.poolQuery,
  },
}));

import {
  changeReportStatus,
  getApprovalHistory,
} from "../src/modules/reports/approvals.service.js";

import type {
  AuthUser,
} from "../src/modules/auth/auth.service.js";

const reportId =
  "11111111-1111-4111-8111-111111111111";

const approverId =
  "22222222-2222-4222-8222-222222222222";

const pelapor: AuthUser = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Test Pelapor",
  email: "pelapor@example.com",
  role: "pelapor",
};

beforeEach(() => {
  vi.resetAllMocks();

  mocks.connect.mockResolvedValue({
    query: mocks.clientQuery,
    release: mocks.release,
  });
});

describe("Approval Workflow", () => {
  it("should update status and insert history in one transaction", async () => {
    mocks.clientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: reportId, status: "pending" }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: reportId, status: "approved" }],
      })
      .mockResolvedValueOnce({
        rows: [{
          report_id: reportId,
          approver_id: approverId,
          previous_status: "pending",
          new_status: "approved",
        }],
      })
      .mockResolvedValueOnce({}); // COMMIT

    const result = await changeReportStatus(
      reportId,
      approverId,
      "approved",
        "Approved for testing"
    );

    expect(result.kind).toBe("updated");

    const commands = mocks.clientQuery.mock.calls
      .map((call) => String(call[0]));

    expect(commands[0]).toBe("BEGIN");
    expect(commands[1]).toContain("FOR UPDATE");
    expect(commands[2]).toContain("UPDATE app.reports");
    expect(commands[3]).toContain(
      "INSERT INTO app.report_approval_history"
    );
    expect(commands[4]).toBe("COMMIT");

    expect(mocks.release).toHaveBeenCalledOnce();
  });

  it("should reject unchanged status", async () => {
    mocks.clientQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ id: reportId, status: "approved" }],
      })
      .mockResolvedValueOnce({});

    const result = await changeReportStatus(
      reportId,
      approverId,
      "approved",
      "Attempting to approve again"
    );

    expect(result.kind).toBe("unchanged");
    expect(mocks.clientQuery).toHaveBeenCalledTimes(3);
    expect(mocks.clientQuery).toHaveBeenLastCalledWith(
      "ROLLBACK"
    );
  });

  it("should return not_found for unknown report", async () => {
    mocks.clientQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({});

    const result = await changeReportStatus(
      reportId,
      approverId,
      "rejected",
        "Attempting to reject a non-existent report"
    );

    expect(result.kind).toBe("not_found");
    expect(mocks.clientQuery).toHaveBeenLastCalledWith(
      "ROLLBACK"
    );
  });

  it("should rollback when history insert fails", async () => {
    mocks.clientQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ id: reportId, status: "pending" }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: reportId, status: "approved" }],
      })
      .mockRejectedValueOnce(
        new Error("History insert failed")
      )
      .mockResolvedValueOnce({});

    await expect(
      changeReportStatus(
        reportId,
        approverId,
        "approved",
        "Attempting to approve with failing history insert"
      )
    ).rejects.toThrow("History insert failed");

    expect(mocks.clientQuery).toHaveBeenLastCalledWith(
      "ROLLBACK"
    );

    expect(mocks.release).toHaveBeenCalledOnce();
  });

  it("should prevent access to another Pelapor's history", async () => {
    mocks.poolQuery.mockResolvedValueOnce({
      rows: [],
    });

    const result = await getApprovalHistory(
      reportId,
      pelapor,
      { page: 1, limit: 20 }
    );

    expect(result).toBeNull();
    expect(mocks.poolQuery).toHaveBeenCalledTimes(1);

    const sql = String(mocks.poolQuery.mock.calls[0][0]);
    const params = mocks.poolQuery.mock.calls[0][1];

    expect(sql).toContain("reporter_id = $2");
    expect(params).toEqual([reportId, pelapor.id]);
  });
});