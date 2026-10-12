import { pool } from "../../config/database.js";

import type { AuthUser } from "../auth/auth.service.js";
import type { Report, ReportStatus } from "./reports.service.js";

import { getReportById } from "./reports.service.js";

import type {
  ApprovalDecision,
  ApprovalHistoryQuery,
} from "./approvals.schema.js";

export type ApprovalHistory = {
  id: string;
  report_id: string;
  approver_id: string;
  previous_status: ReportStatus;
  new_status: ApprovalDecision;
  decided_at: Date;
  reason: string | null;
};

export type ChangeStatusResult =
  | {
      kind: "updated";
      report: Report;
      approval: ApprovalHistory;
    }
  | { kind: "not_found" }
  | { kind: "unchanged" };

export async function changeReportStatus(
  reportId: string,
  approverId: string,
  newStatus: ApprovalDecision,
  reason: string | null
): Promise<ChangeStatusResult> {
  const client = await pool.connect();

  let inTransaction = false;
  let discardClient = false;

  try {
    await client.query("BEGIN");
    inTransaction = true;

    // Lock laporan selama proses approval
    const current = await client.query<{
      id: string;
      status: ReportStatus;
    }>(
      `SELECT id, status
       FROM app.reports
       WHERE id = $1
       FOR UPDATE`,
      [reportId]
    );

    const report = current.rows[0];

    if (!report) {
      await client.query("ROLLBACK");
      inTransaction = false;

      return { kind: "not_found" };
    }

    if (report.status === newStatus) {
      await client.query("ROLLBACK");
      inTransaction = false;

      return { kind: "unchanged" };
    }

    // Update current status
    const updatedResult = await client.query<Report>(
      `UPDATE app.reports
       SET
         status = $1,
         updated_at = NOW()
       WHERE id = $2
       RETURNING
         id,
         reporter_id,
         name,
         description,
         status,
         created_at,
         updated_at`,
      [newStatus, reportId]
    );

    // Simpan keputusan sebagai history baru
    const historyResult =
  await client.query<ApprovalHistory>(
    `INSERT INTO app.report_approval_history (
       report_id,
       approver_id,
       previous_status,
       new_status,
       reason
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING
       id,
       report_id,
       approver_id,
       previous_status,
       new_status,
       reason,
       decided_at`,
    [
      reportId,
      approverId,
      report.status,
      newStatus,
      reason,
    ]
  );

    await client.query("COMMIT");
    inTransaction = false;

    return {
      kind: "updated",
      report: updatedResult.rows[0]!,
      approval: historyResult.rows[0]!,
    };
  } catch (error) {
    if (inTransaction) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        discardClient = true;
        console.error("Rollback failed:", rollbackError);
      }
    }

    throw error;
  } finally {
    client.release(discardClient);
  }
}

export async function getApprovalHistory(
  reportId: string,
  actor: AuthUser,
  filters: ApprovalHistoryQuery
) {
  // Verifikasi akses laporan terlebih dahulu
  const report = await getReportById(reportId, actor);

  if (!report) {
    return null;
  }

  const { page, limit } = filters;
  const offset = (page - 1) * limit;

  const countResult = await pool.query<{
    total: string;
  }>(
    `SELECT COUNT(*) AS total
     FROM app.report_approval_history
     WHERE report_id = $1`,
    [reportId]
  );

  const historyResult = await pool.query<
    ApprovalHistory & { approver_name: string }
  >(
    `SELECT
       h.id,
       h.report_id,
       h.approver_id,
       u.name AS approver_name,
       h.previous_status,
       h.new_status,
       h.decided_at,
       h.reason
     FROM app.report_approval_history h
     JOIN app.users u
       ON u.id = h.approver_id
     WHERE h.report_id = $1
     ORDER BY h.decided_at DESC, h.id DESC
     LIMIT $2 OFFSET $3`,
    [reportId, limit, offset]
  );

  const total = Number(
    countResult.rows[0]?.total ?? 0
  );

  return {
    history: historyResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}