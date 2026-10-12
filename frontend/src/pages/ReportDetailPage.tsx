
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import { useAuth } from "../features/auth/useAuth";

import ApprovalActions from "../features/reports/ApprovalActions";
import ApprovalHistory from "../features/reports/ApprovalHistory";

import {
  reportsApi,
  type Report,
  type ReportStatus,
} from "../features/reports/reports.api";

import { ApiError } from "../lib/api";

type DetailResult =
  | {
      key: string;
      kind: "success";
      report: Report;
    }
  | {
      key: string;
      kind: "error";
      message: string;
    };

const statusLabels: Record<ReportStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ReportDetailPage() {
  const { id } = useParams<"id">();
  const { user } = useAuth();

  const [result, setResult] =
    useState<DetailResult | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const [historyVersion, setHistoryVersion] = useState(0);

  const requestKey = `${id ?? ""}:${reloadKey}`;

  useEffect(() => {
    if (!id) return;

    let active = true;

    reportsApi
      .detail(id)
      .then((report) => {
        if (!active) return;

        setResult({
          key: requestKey,
          kind: "success",
          report,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;

        const message =
          error instanceof ApiError && error.status === 404
            ? "Laporan tidak ditemukan atau tidak dapat diakses."
            : "Gagal mengambil detail laporan.";

        setResult({
          key: requestKey,
          kind: "error",
          message,
        });
      });

    return () => {
      active = false;
    };
  }, [id, reloadKey, requestKey]);

  function handleRefresh() {
    setReloadKey((previous) => previous + 1);
    setHistoryVersion((previous) => previous + 1);
  }

  function handleStatusChanged(updatedReport: Report) {
    setResult({
      key: requestKey,
      kind: "success",
      report: updatedReport,
    });

    // Refresh approval history setelah keputusan berhasil
    setHistoryVersion((previous) => previous + 1);
  }

  if (!id) {
    return <p>ID laporan tidak valid.</p>;
  }

  const current =
    result?.key === requestKey ? result : null;

  if (!current) {
    return (
      <p role="status">
        Memuat detail laporan...
      </p>
    );
  }

  if (current.kind === "error") {
    return (
      <section className="content-card report-detail">
        <p className="error-message" role="alert">
          {current.message}
        </p>

        <button
          type="button"
          className="secondary-button"
          onClick={handleRefresh}
        >
          Coba Lagi
        </button>

        <p>
          <Link to="/dashboard/reports">
            Kembali ke daftar laporan
          </Link>
        </p>
      </section>
    );
  }

  const { report } = current;

  const canEdit =
    user?.role === "pelapor" &&
    user.id === report.reporter_id &&
    report.status === "pending";

  return (
    <section className="report-detail-page">
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

          <div className="report-heading-buttons">
            <button
              type="button"
              className="secondary-button"
              onClick={handleRefresh}
            >
              Muat Ulang
            </button>

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
      </div>

      <div className="content-card report-detail">
        <h2>Informasi Laporan</h2>

        <dl className="report-fields">
          <div>
            <dt>ID Laporan</dt>
            <dd className="report-id">
              {report.id}
            </dd>
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

      {user?.role === "approver" && (
        <ApprovalActions
          report={report}
          onStatusChanged={handleStatusChanged}
          onRefresh={handleRefresh}
        />
      )}

      <ApprovalHistory
        key={`${report.id}:${historyVersion}`}
        reportId={report.id}
      />
    </section>
  );
}
