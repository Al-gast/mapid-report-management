
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import { useAuth } from "../features/auth/useAuth";
import {
  reportsApi,
  type Report,
  type ReportStatus,
} from "../features/reports/reports.api";

import { ApiError } from "../lib/api";

type DetailState =
  | { kind: "loading" }
  | { kind: "success"; report: Report }
  | { kind: "error"; message: string };

const statusLabels: Record<ReportStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ReportDetailPage() {
  const { id } = useParams<"id">();
  const { user } = useAuth();

  const [result, setResult] = useState<{
    id: string;
    state: DetailState;
  } | null>(null);

  useEffect(() => {
    if (!id) return;

    let active = true;

    reportsApi
      .detail(id)
      .then((report) => {
        if (!active) return;

        setResult({
          id,
          state: { kind: "success", report },
        });
      })
      .catch((error: unknown) => {
        if (!active) return;

        const message =
          error instanceof ApiError && error.status === 404
            ? "Laporan tidak ditemukan atau tidak dapat diakses."
            : "Gagal mengambil detail laporan.";

        setResult({
          id,
          state: { kind: "error", message },
        });
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (!id) {
    return <p>ID laporan tidak valid.</p>;
  }

  const state: DetailState =
    result?.id === id
      ? result.state
      : { kind: "loading" };

  if (state.kind === "loading") {
    return <p role="status">Memuat detail laporan...</p>;
  }

  if (state.kind === "error") {
    return (
      <section className="content-card report-detail">
        <p role="alert" className="error-message">
          {state.message}
        </p>

        <Link to="/dashboard/reports">
          Kembali ke daftar laporan
        </Link>
      </section>
    );
  }

  const { report } = state;

  const canEdit =
    user?.role === "pelapor" &&
    user.id === report.reporter_id &&
    report.status === "pending";

  return (
    <section>
      <div className="page-heading">
        <Link to="/dashboard/reports">
          ← Kembali ke laporan
        </Link>

        <div className="page-heading-actions">
          <div>
            <h1>{report.name}</h1>
            <span
              className={`status-badge status-${report.status}`}
            >
              {statusLabels[report.status]}
            </span>
          </div>

          {canEdit && (
            <Link
              to={`/dashboard/reports/${report.id}/edit`}
              className="primary-link"
            >
              Edit Laporan
            </Link>
          )}
        </div>
      </div>

      <div className="content-card report-detail">
        <h2>Informasi Laporan</h2>

        <dl className="report-fields">
          <div>
            <dt>ID Laporan</dt>
            <dd className="report-id">{report.id}</dd>
          </div>

          <div>
            <dt>Deskripsi</dt>
            <dd className="report-text">
              {report.description}
            </dd>
          </div>

          <div>
            <dt>Dibuat pada</dt>
            <dd>{formatDate(report.created_at)}</dd>
          </div>

          <div>
            <dt>Terakhir diperbarui</dt>
            <dd>{formatDate(report.updated_at)}</dd>
          </div>
        </dl>

        {user?.role === "pelapor" &&
          report.status !== "pending" && (
            <p className="info-message">
              Laporan tidak dapat diedit karena sudah
              memiliki keputusan persetujuan.
            </p>
          )}
      </div>
    </section>
  );
}
