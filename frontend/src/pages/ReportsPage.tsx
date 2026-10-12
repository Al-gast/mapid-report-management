
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { useAuth } from "../features/auth/useAuth";
import {
  reportsApi,
  type ReportListData,
  type ReportStatus,
} from "../features/reports/reports.api";
import { ApiError } from "../lib/api";

import "../styles/targeted-polish.css";

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
  approved: "Disetujui",
  rejected: "Ditolak",
};

function parsePage(value: string | null): number {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    return 1;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed > 100000) {
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
        status:
          status === "all" ? undefined : status,
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

        let message = "Gagal memuat laporan.";

        if (error instanceof ApiError) {
          if (error.status === 401) {
            message =
              "Sesi telah berakhir. Silakan masuk kembali.";
          } else if (error.status === 403) {
            message =
              "Anda tidak memiliki akses ke laporan.";
          } else {
            message = error.message;
          }
        }

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

  const current =
    result?.key === requestKey ? result : null;

  const hasActiveFilters =
    status !== "all" ||
    sort !== "desc" ||
    page !== 1;

  const title =
    user?.role === "pelapor"
      ? "Laporan Saya"
      : "Daftar Laporan";

  return (
    <section className="mapid-reports-page">
      <div className="mapid-reports-header">
        <h1>{title}</h1>

        {user?.role === "pelapor" && (
          <Link
            to={`/dashboard/reports/new${querySuffix}`}
            className="mapid-reports-primary"
          >
            + Tambah Laporan
          </Link>
        )}
      </div>

      <div className="content-card mapid-reports-card">
        <div className="mapid-reports-toolbar">
          <div className="mapid-filter-field">
            <label htmlFor="status-filter">
              Status
            </label>

            <div className="mapid-filter-select">
              <select
                id="status-filter"
                value={status}
                onChange={(event) =>
                  changeStatus(event.target.value)
                }
              >
                <option value="all">Semua status</option>
                <option value="pending">Pending</option>
                <option value="approved">Disetujui</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
          </div>

          <div className="mapid-filter-field">
            <label htmlFor="sort-filter">
              Urutan
            </label>

            <div className="mapid-filter-select">
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
            </div>
          </div>

          <button
            type="button"
            className="mapid-reports-secondary mapid-reset-button"
            disabled={!hasActiveFilters}
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>

        {hasActiveFilters && (
          <div className="mapid-active-filters">
            {status === "all"
              ? "Semua status"
              : statusLabels[status]}
            <span aria-hidden="true">·</span>
            {sort === "desc" ? "Terbaru" : "Terlama"}
            <span aria-hidden="true">·</span>
            Halaman {page}
          </div>
        )}

        {!current && (
          <div
            className="mapid-reports-message"
            role="status"
          >
            Memuat laporan...
          </div>
        )}

        {current?.kind === "error" && (
          <div
            className="mapid-reports-message"
            role="alert"
          >
            <p>{current.message}</p>

            <button
              type="button"
              className="mapid-reports-secondary"
              onClick={() =>
                setRetryKey((previous) => previous + 1)
              }
            >
              Coba Lagi
            </button>
          </div>
        )}

        {current?.kind === "success" && (
          <>
            {current.data.reports.length === 0 ? (
              <div className="mapid-reports-message">
                <p>Tidak ada laporan ditemukan.</p>

                {page > 1 && (
                  <button
                    type="button"
                    className="mapid-reports-secondary"
                    onClick={() => changePage(1)}
                  >
                    Ke Halaman 1
                  </button>
                )}
              </div>
            ) : (
              <div className="mapid-reports-scroll">
                <table className="mapid-reports-table">
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
                          <div className="mapid-report-name">
                            {report.name}
                          </div>

                          <div className="mapid-report-description">
                            {report.description}
                          </div>
                        </td>

                        <td>
                          <span
                            className={
                              `mapid-status mapid-status-${report.status}`
                            }
                          >
                            {statusLabels[report.status]}
                          </span>
                        </td>

                        <td className="mapid-date-cell">
                          {formatDate(report.created_at)}
                        </td>

                        <td>
                          <Link
                            className="mapid-detail-link"
                            to={
                              `/dashboard/reports/${report.id}${querySuffix}`
                            }
                            aria-label={
                              `Lihat detail ${report.name}`
                            }
                          >
                            Detail
                            <span aria-hidden="true"> →</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mapid-reports-pagination">
              <span>
                {current.data.pagination.total} laporan
              </span>

              <div className="mapid-pagination-actions">
                <button
                  type="button"
                  className="mapid-reports-secondary"
                  disabled={page <= 1}
                  onClick={() => changePage(page - 1)}
                >
                  Sebelumnya
                </button>

                <span className="mapid-page-indicator">
                  {page} /{" "}
                  {Math.max(
                    1,
                    current.data.pagination.totalPages
                  )}
                </span>

                <button
                  type="button"
                  className="mapid-reports-secondary"
                  disabled={
                    page >= current.data.pagination.totalPages
                  }
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
