
import { useState, type FormEvent } from "react";

import { ApiError } from "../../lib/api";

import {
  approvalsApi,
  type ApprovalDecision,
} from "./approvals.api";

import type { Report } from "./reports.api";

type Props = {
  report: Report;
  onStatusChanged: (report: Report) => void;
  onRefresh: () => void;
};

const decisions: {
  status: ApprovalDecision;
  label: string;
  className: string;
}[] = [
  {
    status: "approved",
    label: "Approve",
    className: "decision-approve",
  },
  {
    status: "rejected",
    label: "Reject",
    className: "decision-reject",
  },
];

const decisionLabels: Record<ApprovalDecision, string> = {
  approved: "Approved",
  rejected: "Rejected",
};

export default function ApprovalActions({
  report,
  onStatusChanged,
  onRefresh,
}: Props) {
  const [selected, setSelected] =
    useState<ApprovalDecision | null>(null);

  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hasConflict, setHasConflict] = useState(false);

  const reasonRequired = selected === "rejected";

  const availableDecisions = decisions.filter(
    (item) => item.status !== report.status
  );

  const canConfirm =
    selected !== null &&
    !saving &&
    !hasConflict &&
    (!reasonRequired || reason.trim().length > 0);

  function chooseDecision(status: ApprovalDecision) {
    if (saving || hasConflict) return;

    setSelected(status);
    setReason("");
    setError("");
  }

  function cancelDecision() {
    if (saving) return;

    setSelected(null);
    setReason("");
    setError("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selected || !canConfirm) return;

    const normalizedReason = reason.trim();

    if (normalizedReason.length > 1000) {
      setError("Alasan maksimal 1000 karakter.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updatedReport =
        await approvalsApi.changeStatus(
          report.id,
          selected,
          normalizedReason || undefined
        );

      setSelected(null);
      setReason("");

      onStatusChanged(updatedReport);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setHasConflict(true);
          setError(
            "Status laporan sudah berubah atau keputusan " +
            "tidak menghasilkan perubahan. Muat ulang laporan."
          );
        } else if (err.status === 400) {
          setError(
            "Data keputusan tidak valid. Periksa alasan."
          );
        } else if (err.status === 403) {
          setError(
            "Akun ini tidak memiliki izin approval."
          );
        } else if (err.status === 404) {
          setError("Laporan tidak ditemukan.");
        } else {
          setError(err.message);
        }
      } else {
        setError(
          "Gagal menyimpan keputusan. Silakan coba lagi."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="content-card approval-panel">
      <h2>Keputusan Persetujuan</h2>

      <p className="muted">
        Setiap perubahan status akan dicatat
        dalam approval history.
      </p>

      <div className="decision-actions">
        {availableDecisions.map((item) => (
          <button
            key={item.status}
            type="button"
            className={
              `decision-button ${item.className}`
            }
            disabled={saving || hasConflict}
            onClick={() => chooseDecision(item.status)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {selected && (
        <form
          className="decision-confirmation"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <h3>Konfirmasi Keputusan</h3>

          <p>
            Ubah status laporan dari{" "}
            <strong>{report.status}</strong>{" "}
            menjadi{" "}
            <strong>{decisionLabels[selected]}</strong>?
          </p>

          <div className="form-group">
            <label htmlFor="approval-reason">
              {reasonRequired
                ? "Alasan Penolakan *"
                : "Catatan Persetujuan (opsional)"}
            </label>

            <textarea
              id="approval-reason"
              name="reason"
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              rows={4}
              minLength={reasonRequired ? 1 : undefined}
              maxLength={1000}
              required={reasonRequired}
              disabled={saving || hasConflict}
              placeholder={
                reasonRequired
                  ? "Jelaskan mengapa laporan ditolak..."
                  : "Tambahkan catatan jika diperlukan..."
              }
            />

            <span className="character-count">
              {reason.length}/1000 karakter
            </span>

            {reasonRequired && (
              <p className="muted">
                Alasan penolakan wajib diisi.
              </p>
            )}
          </div>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <div className="confirmation-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={cancelDecision}
              disabled={saving}
            >
              Batal
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={!canConfirm}
            >
              {saving
                ? "Menyimpan..."
                : `Konfirmasi ${decisionLabels[selected]}`}
            </button>
          </div>
        </form>
      )}

      {error && !selected && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {hasConflict && (
        <button
          type="button"
          className="secondary-button approval-refresh"
          onClick={onRefresh}
          disabled={saving}
        >
          Muat Ulang Laporan
        </button>
      )}
    </section>
  );
}
