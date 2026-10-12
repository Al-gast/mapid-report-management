
import { useState } from "react";

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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hasConflict, setHasConflict] = useState(false);

  function chooseDecision(status: ApprovalDecision) {
    if (saving) return;

    setSelected(status);
    setError("");
    setHasConflict(false);
  }

  async function confirmDecision() {
    if (!selected || saving) return;

    setSaving(true);
    setError("");
    setHasConflict(false);

    try {
      const updatedReport =
        await approvalsApi.changeStatus(
          report.id,
          selected
        );

      setSelected(null);
      onStatusChanged(updatedReport);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setError(
            "Status laporan sudah berubah. " +
            "Muat ulang sebelum mengambil keputusan."
          );
          setHasConflict(true);
        } else if (error.status === 403) {
          setError(
            "Akun ini tidak memiliki izin untuk approval."
          );
        } else if (error.status === 404) {
          setError("Laporan tidak ditemukan.");
        } else {
          setError(error.message);
        }
      } else {
        setError(
          "Gagal mengubah status laporan. Coba lagi."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  const availableDecisions = decisions.filter(
    (item) => item.status !== report.status
  );

  return (
    <section className="content-card approval-panel">
      <h2>Keputusan Persetujuan</h2>

      <p className="muted">
        Sebagai Approver, Anda dapat mengubah keputusan
        laporan. Setiap perubahan akan tercatat dalam
        approval history.
      </p>

      <div className="decision-actions">
        {availableDecisions.map((item) => (
          <button
            key={item.status}
            type="button"
            className={`decision-button ${item.className}`}
            disabled={saving}
            onClick={() => chooseDecision(item.status)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {selected && (
        <div className="decision-confirmation">
          <h3>Konfirmasi Keputusan</h3>

          <p>
            Ubah status laporan dari{" "}
            <strong>{report.status}</strong> menjadi{" "}
            <strong>{decisionLabels[selected]}</strong>?
          </p>

          <p className="muted">
            Keputusan ini akan disimpan dalam riwayat
            persetujuan.
          </p>

          <div className="confirmation-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={saving}
              onClick={() => setSelected(null)}
            >
              Batal
            </button>

            <button
              type="button"
              className="primary-button"
              disabled={saving || hasConflict}
              onClick={() => void confirmDecision()}
            >
              {saving
                ? "Menyimpan..."
                : "Konfirmasi"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="approval-error" role="alert">
          <p className="error-message">{error}</p>

          {hasConflict && (
            <button
              type="button"
              className="secondary-button"
              onClick={onRefresh}
              disabled={saving}
            >
              Muat Ulang Laporan
            </button>
          )}
        </div>
      )}
    </section>
  );
}
