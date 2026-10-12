
import { useEffect, useState } from "react";

import { useAuth } from "../features/auth/useAuth";
import {
  reportsApi,
  type ReportListData,
  type ReportStatus,
} from "../features/reports/reports.api";

type LoadState = "loading" | "success" | "error";

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

export default function ReportsPage() {
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<
    ReportStatus | "all"
  >("all");
  const [sort, setSort] = useState<"asc" | "desc">("desc");

  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<ReportListData | null>(
    null
  );
  const [loadState, setLoadState] =
    useState<LoadState>("loading");

  useEffect(() => {
    let active = true;

    reportsApi
      .list({
        page,
        limit: 10,
        sort,
        status: status === "all" ? undefined : status,
      })
      .then((result) => {
        if (!active) return;

        setData(result);
        setLoadState("success");
      })
      .catch(() => {
        if (!active) return;

        setLoadState("error");
      });

    return () => {
      active = false;
    };
  }, [page, status, sort, reloadKey]);

  function changeStatus(value: ReportStatus | "all") {
    setLoadState("loading");
    setPage(1);
    setStatus(value);
  }

  function changeSort(value: "asc" | "desc") {
    setLoadState("loading");
    setPage(1);
    setSort(value);
  }

  function changePage(value: number) {
    setLoadState("loading");
    setPage(value);
  }

  function retry() {
    setLoadState("loading");
    setReloadKey((current) => current + 1);
  }

  const title =
    user?.role === "pelapor"
      ? "Laporan Saya"
      : "Semua Laporan";

  return (
    <section className="reports-page">
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p className="muted">
            Daftar laporan lapangan dan status persetujuan.
          </p>
        </div>
      </div>

      <div className="content-card">
        <div className="report-toolbar">
          <label>
            Status
            <select
              value={status}
              onChange={(event) =>
                changeStatus(
                  event.target.value as ReportStatus | "all"
                )
              }
            >
              <option value="all">Semua status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <label>
            Urutan
            <select
              value={sort}
              onChange={(event) =>
                changeSort(event.target.value as "asc" | "desc")
              }
            >
              <option value="desc">Terbaru</option>
              <option value="asc">Terlama</option>
            </select>
          </label>
        </div>

        {loadState === "loading" && (
          <p className="table-message" role="status">
            Memuat laporan...
          </p>
        )}

        {loadState === "error" && (
          <div className="table-message" role="alert">
            <p>Gagal memuat laporan.</p>
            <button
              className="secondary-button"
              onClick={retry}
            >
              Coba lagi
            </button>
          </div>
        )}

        {loadState === "success" && data && (
          <>
            {data.reports.length === 0 ? (
              <p className="table-message">
                Belum ada laporan yang sesuai.
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Nama laporan</th>
                      <th>Status</th>
                      <th>Dibuat</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.reports.map((report) => (
                      <tr key={report.id}>
                        <td>
                          <strong>{report.name}</strong>
                          <span className="report-description">
                            {report.description}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`status-badge status-${report.status}`}
                          >
                            {statusLabels[report.status]}
                          </span>
                        </td>

                        <td>{formatDate(report.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="table-pagination">
              <span>
                Total {data.pagination.total} laporan
              </span>

              <div className="pagination-controls">
                <button
                  className="secondary-button"
                  disabled={page <= 1}
                  onClick={() => changePage(page - 1)}
                >
                  Sebelumnya
                </button>

                <span>
                  {page} / {Math.max(1, data.pagination.totalPages)}
                </span>

                <button
                  className="secondary-button"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => changePage(page + 1)}
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
