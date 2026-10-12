
import { useEffect, useState } from "react";

import { ApiError } from "../../lib/api";

import {
  approvalsApi,
  type ApprovalHistoryData,
} from "./approvals.api";

import type { ReportStatus } from "./reports.api";

type Props = {
  reportId: string;
};

type LoadResult =
  | {
      key: string;
      kind: "success";
      data: ApprovalHistoryData;
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

export default function ApprovalHistory({
  reportId,
}: Props) {
  const [page, setPage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const [result, setResult] =
    useState<LoadResult | null>(null);

  const requestKey = `${reportId}:${page}:${retryKey}`;

  useEffect(() => {
    let active = true;

    approvalsApi
      .history(reportId, page, 10)
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
          error.status === 404
            ? "Riwayat tidak ditemukan atau tidak dapat diakses."
            : "Gagal memuat riwayat persetujuan.";

        setResult({
          key: requestKey,
          kind: "error",
          message,
        });
      });

    return () => {
      active = false;
    };
  }, [reportId, page, retryKey, requestKey]);

  const current =
    result?.key === requestKey ? result : null;

  return (
    <section className="content-card approval-history-panel">
      <div className="approval-history-heading">
        <h2>Approval History</h2>
        <span className="muted">
          Riwayat keputusan laporan
        </span>
      </div>

      {!current && (
        <p role="status" className="table-message">
          Memuat riwayat persetujuan...
        </p>
      )}

      {current?.kind === "error" && (
        <div className="table-message" role="alert">
          <p>{current.message}</p>

          <button
            type="button"
            className="secondary-button"
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
          {current.data.history.length === 0 ? (
            <p className="table-message">
              Belum ada keputusan persetujuan.
            </p>
          ) : (
            <ol className="approval-history-list">
              {current.data.history.map((item) => (
                <li
                  key={item.id}
                  className="approval-history-item"
                >
                  <div className="history-content">
                    <strong>{item.approver_name}</strong>

                    <div className="history-status-change">
                      <span
                        className={`status-badge status-${item.previous_status}`}
                      >
                        {statusLabels[item.previous_status]}
                      </span>

                      <span aria-label="menjadi">
                        →
                      </span>

                      <span
                        className={`status-badge status-${item.new_status}`}
                      >
                        {statusLabels[item.new_status]}
                      </span>
                    </div>

                    <time dateTime={item.decided_at}>
                      {formatDate(item.decided_at)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {current.data.pagination.totalPages > 1 && (
            <div className="table-pagination">
              <span>
                Total {current.data.pagination.total} keputusan
              </span>

              <div className="pagination-controls">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((previous) => previous - 1)
                  }
                >
                  Sebelumnya
                </button>

                <span>
                  {page} / {current.data.pagination.totalPages}
                </span>

                <button
                  type="button"
                  className="secondary-button"
                  disabled={
                    page >= current.data.pagination.totalPages
                  }
                  onClick={() =>
                    setPage((previous) => previous + 1)
                  }
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
