import { pool } from "../../config/database.js";

import type { AuthUser } from "../auth/auth.service.js";

import type {
  CreateReportInput,
  UpdateReportInput,
  ListReportsInput,
} from "./reports.schema.js";

export type ReportStatus =
  | "pending"
  | "approved"
  | "rejected";

export type Report = {
  id: string;
  reporter_id: string;
  name: string;
  description: string;
  status: ReportStatus;
  created_at: Date;
  updated_at: Date;
};

export async function createReport(
  input: CreateReportInput,
  reporterId: string
): Promise<Report> {
  const result = await pool.query<Report>(
    `INSERT INTO app.reports (
       reporter_id,
       name,
       description
     )
     VALUES ($1, $2, $3)
     RETURNING
       id,
       reporter_id,
       name,
       description,
       status,
       created_at,
       updated_at`,
    [
      reporterId,
      input.name,
      input.description,
    ]
  );

  return result.rows[0]!;
}

export async function listReports(
  actor: AuthUser,
  filters: ListReportsInput
) {
  const { page, limit, status, sort } = filters;

  const conditions: string[] = [];
  const params: Array<string | number> = [];

  // Pelapor hanya melihat laporan miliknya
  if (actor.role === "pelapor") {
    params.push(actor.id);

    conditions.push(
      `r.reporter_id = $${params.length}`
    );
  }

  // Optional status filtering
  if (status) {
    params.push(status);

    conditions.push(
      `r.status = $${params.length}`
    );
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  // Sort direction berasal dari enum tervalidasi
  const direction = sort === "asc" ? "ASC" : "DESC";

  const offset = (page - 1) * limit;

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM app.reports r
     ${whereClause}`,
    params
  );

  const listResult = await pool.query<Report>(
    `SELECT
       r.id,
       r.reporter_id,
       r.name,
       r.description,
       r.status,
       r.created_at,
       r.updated_at
     FROM app.reports r
     ${whereClause}
     ORDER BY
       r.created_at ${direction},
       r.id ${direction}
     LIMIT $${params.length + 1}
     OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const total = Number(countResult.rows[0]?.total ?? 0);

  return {
    reports: listResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getReportById(
  reportId: string,
  actor: AuthUser
): Promise<Report | null> {
  const isPelapor = actor.role === "pelapor";

  const ownershipCondition = isPelapor
    ? "AND reporter_id = $2"
    : "";

  const params = isPelapor
    ? [reportId, actor.id]
    : [reportId];

  const result = await pool.query<Report>(
    `SELECT
       id,
       reporter_id,
       name,
       description,
       status,
       created_at,
       updated_at
     FROM app.reports
     WHERE id = $1
     ${ownershipCondition}
     LIMIT 1`,
    params
  );

  return result.rows[0] ?? null;
}

export type UpdateReportResult =
  | { kind: "updated"; report: Report }
  | { kind: "not_found" }
  | { kind: "not_pending" };

export async function updateReport(
  reportId: string,
  reporterId: string,
  input: UpdateReportInput
): Promise<UpdateReportResult> {
  const result = await pool.query<Report>(
    `UPDATE app.reports
     SET
       name = COALESCE($1::VARCHAR, name),
       description = COALESCE($2::TEXT, description),
       updated_at = NOW()
     WHERE id = $3
       AND reporter_id = $4
       AND status = 'pending'
     RETURNING
       id,
       reporter_id,
       name,
       description,
       status,
       created_at,
       updated_at`,
    [
      input.name ?? null,
      input.description ?? null,
      reportId,
      reporterId,
    ]
  );

  if (result.rows[0]) {
    return {
      kind: "updated",
      report: result.rows[0],
    };
  }

  // Pemeriksaan lanjutan hanya dalam ownership Pelapor
  const existing = await pool.query<{ status: ReportStatus }>(
    `SELECT status
     FROM app.reports
     WHERE id = $1
       AND reporter_id = $2
     LIMIT 1`,
    [reportId, reporterId]
  );

  if (!existing.rows[0]) {
    return { kind: "not_found" };
  }

  return { kind: "not_pending" };
}