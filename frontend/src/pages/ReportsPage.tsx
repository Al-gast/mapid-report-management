
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { useAuth } from "../features/auth/useAuth";

import {
  reportsApi,
  type ReportListData,
  type ReportStatus,
} from "../features/reports/reports.api";

import { ApiError } from "../lib/api";

type LoadResult =
  | {
      key: string;
      kind: "success";
      data: ReportListData;
    }
  | {
      key: string;
      kind: "error";
      message: string;
    };

const PAGE_SIZE = 10;

const statusLabels: Record<ReportStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function parsePage(value: string | null): number {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    return 1;
  }

  const parsed = Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed > 100000
  ) {
    return 1;
  }

  return parsed;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ReportsPage() {
  const { user } = useAuth();

  const [searchParams, setSearchParams] =
    useSearchParams();

  const rawStatus = searchParams.get("status");

  const status: ReportStatus | "all" =
    rawStatus === "pending" ||
    rawStatus === "approved" ||
    rawStatus === "rejected"
      ? rawStatus
      : "all";

  const sort: "asc" | "desc" =
    searchParams.get("sort") === "asc"
      ? "asc"
      : "desc";

  const page = parsePage(searchParams.get("page"));

  const [retryKey, setRetryKey] = useState(0);
  const [result, setResult] =
    useState<LoadResult | null>(null);

  const requestKey =
    `${page}:${status}:${sort}:${retryKey}`;

  // Teruskan konteks filter ketika membuka detail
  const queryString = searchParams.toString();

  const querySuffix = queryString
    ? `?${queryString}`
    : "";

  useEffect(() => {
    let active = true;

    reportsApi
      .list({
        page,
        limit: PAGE_SIZE,
        status: status === "all" ? undefined : status,
        sort,
      })
      .then((data) => {
        if (!active) return;

        setResult({
          key: requestKey,
          kind: "success",
          data,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;

        const message =
          error instanceof ApiError &&
          error.status === 401
            ? "Session tidak valid. Silakan login kembali."
            : "Gagal memuat laporan.";

        setResult({
          key: requestKey,
          kind: "error",
          message,
        });
      });

    return () => {
      active = false;
    };
  }, [page, status, sort, requestKey]);

  function changeStatus(value: string) {
    const next = new URLSearchParams(searchParams);

    if (
      value === "pending" ||
      value === "approved" ||
      value === "rejected"
    ) {
      next.set("status", value);
    } else {
      next.delete("status");
    }

    // Filter baru selalu mulai dari halaman pertama
    next.delete("page");

    setSearchParams(next);
  }

  function changeSort(value: string) {
    const next = new URLSearchParams(searchParams);

    if (value === "asc") {
      next.set("sort", "asc");
    } else {
      next.delete("sort");
    }

    next.delete("page");

    setSearchParams(next);
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);

    if (nextPage <= 1) {
      next.delete("page");
    } else {
      next.set("page", String(nextPage));
    }

    setSearchParams(next);
  }

  function resetFilters() {
    setSearchParams(new URLSearchParams());
  }

  function retry() {
    setRetryKey((previous) => previous + 1);
  }

  const current =
    result?.key === requestKey ? result : null;

  const hasActiveFilters =
    status !== "all" ||
    sort !== "desc" ||
    page !== 1;

  const title =
    user?.role === "pelapor"
      ? "Laporan Saya"
      : "Semua Laporan";

  return (
    <section className="reports-page">
      <div className="page-heading page-heading-actions">
        <div>
          <h1>{title}</h1>

          <p className="muted">
            Kelola dan pantau laporan lapangan.
          </p>
        </div>

        {user?.role === "pelapor" && (
          <Link
            to={`/dashboard/reports/new${querySuffix}`}
            className="primary-link"
          >
            + Tambah Laporan
          </Link>
        )}
      </div>

      <div className="content-card">
        <div className="report-toolbar">
          <label htmlFor="status-filter">
            Status
            <select
              id="status-filter"
              value={status}
              onChange={(event) =>
                changeStatus(event.target.value)
              }
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <label htmlFor="sort-filter">
            Urutan
            <select
              id="sort-filter"
              value={sort}
              onChange={(event) =>
                changeSort(event.target.value)
              }
            >
              <option value="desc">Terbaru</option>
              <option value="asc">Terlama</option>
            </select>
          </label>

          <div className="report-filter-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              Reset Filter
            </button>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="active-filter-summary">
            Filter aktif:
            {" "}
            <strong>
              {status === "all"
                ? "Semua Status"
                : statusLabels[status]}
            </strong>
            {" · "}
            {sort === "desc" ? "Terbaru" : "Terlama"}
            {" · "}
            Halaman {page}
          </div>
        )}

        {!current && (
          <p className="table-message" role="status">
            Memuat laporan...
          </p>
        )}

        {current?.kind === "error" && (
          <div className="table-message" role="alert">
            <p>{current.message}</p>

            <button
              type="button"
              className="secondary-button"
              onClick={retry}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {current?.kind === "success" && (
          <>
            {current.data.reports.length === 0 ? (
              <div className="table-message">
                <p>
                  Tidak ada laporan yang sesuai.
                </p>

                {page > 1 && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => changePage(1)}
                  >
                    Kembali ke Halaman 1
                  </button>
                )}
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Nama Laporan</th>
                      <th>Status</th>
                      <th>Dibuat</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {current.data.reports.map((report) => (
                      <tr key={report.id}>
                        <td>
                          <strong>{report.name}</strong>

                          <span className="report-description">
                            {report.description}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              `status-badge status-${report.status}`
                            }
                          >
                            {statusLabels[report.status]}
                          </span>
                        </td>

                        <td>
                          {formatDate(report.created_at)}
                        </td>

                        <td>
                          <Link
                            className="report-detail-link"
                            to={
                              `/dashboard/reports/${report.id}${querySuffix}`
                            }
                            aria-label={
                              `Lihat detail laporan ${report.name}`
                            }
                          >
                            Lihat Detail →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="table-pagination">
              <span>
                Total {current.data.pagination.total} laporan
              </span>

              <div className="pagination-controls">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={page <= 1}
                  onClick={() => changePage(page - 1)}
                >
                  ← Sebelumnya
                </button>

                <span>
                  {page} /{" "}
                  {Math.max(
                    1,
                    current.data.pagination.totalPages
                  )}
                </span>

                <button
                  type="button"
                  className="secondary-button"
                  disabled={
                    page >= current.data.pagination.totalPages
                  }
                  onClick={() => changePage(page + 1)}
                >
                  Berikutnya →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
