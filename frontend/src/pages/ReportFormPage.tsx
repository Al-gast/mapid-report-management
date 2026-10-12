
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
} from "react-router";

import { useAuth } from "../features/auth/useAuth";
import {
  reportsApi,
  type Report,
  type ReportInput,
} from "../features/reports/reports.api";

import { ApiError } from "../lib/api";

type Props = {
  mode: "create" | "edit";
};

type LoadResult =
  | { id: string; kind: "success"; report: Report }
  | { id: string; kind: "error"; message: string };

const emptyForm: ReportInput = {
  name: "",
  description: "",
};

export default function ReportFormPage({ mode }: Props) {
  const navigate = useNavigate();
  const { id } = useParams<"id">();
  const { user } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState<ReportInput>(emptyForm);
  const [loaded, setLoaded] = useState<LoadResult | null>(
    null
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const reportsListUrl = `/dashboard/reports${location.search}`;

  useEffect(() => {
    if (mode !== "edit" || !id || user?.role !== "pelapor") {
      return;
    }

    let active = true;

    reportsApi
      .detail(id)
      .then((report) => {
        if (!active) return;

        setLoaded({
          id,
          kind: "success",
          report,
        });

        setForm({
          name: report.name,
          description: report.description,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;

        setLoaded({
          id,
          kind: "error",
          message:
            error instanceof ApiError && error.status === 404
              ? "Laporan tidak ditemukan atau tidak dapat diakses."
              : "Gagal mengambil data laporan.",
        });
      });

    return () => {
      active = false;
    };
  }, [mode, id, user?.role]);

  if (user?.role !== "pelapor") {
    return <Navigate to="/dashboard/reports" replace />;
  }

  if (mode === "edit") {
    if (!id) {
      return <p>ID laporan tidak valid.</p>;
    }

    if (!loaded || loaded.id !== id) {
      return <p role="status">Memuat laporan...</p>;
    }

    if (loaded.kind === "error") {
      return (
        <div className="content-card report-detail">
          <p className="error-message" role="alert">
            {loaded.message}
          </p>
          <Link to={reportsListUrl}>
            Kembali ke daftar laporan
          </Link>
        </div>
      );
    }

    const report = loaded.report;

    if (
      report.reporter_id !== user.id ||
      report.status !== "pending"
    ) {
      return (
        <div className="content-card report-detail">
          <h2>Laporan tidak dapat diedit</h2>
          <p className="muted">
            Hanya laporan pending milik sendiri
            yang dapat diedit.
          </p>
          <Link to={`/dashboard/reports/${report.id}${location.search}`}>
            Kembali ke detail
          </Link>
        </div>
      );
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    setError("");

    const payload: ReportInput = {
      name: form.name.trim(),
      description: form.description.trim(),
    };

    if (!payload.name || !payload.description) {
      setError("Nama dan deskripsi laporan wajib diisi.");
      return;
    }

    if (
      payload.name.length > 255 ||
      payload.description.length > 5000
    ) {
      setError("Input melebihi batas karakter.");
      return;
    }

    setSaving(true);

    try {
      const report =
        mode === "create"
          ? await reportsApi.create(payload)
          : await reportsApi.update(id!, payload);

      navigate(
        `/dashboard/reports/${report.id}${location.search}`,
        {
            replace: true,
        }
     );
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setError(
            "Laporan tidak dapat diperbarui karena " +
            "statusnya sudah berubah. Muat ulang detail laporan."
          );
        } else {
          setError(error.message);
        }
      } else {
        setError("Terjadi kesalahan. Silakan coba lagi.");
      }
    } finally {
      setSaving(false);
    }
  }

  const isEdit = mode === "edit";
  const cancelUrl =
  isEdit && id
    ? `/dashboard/reports/${id}${location.search}`
    : reportsListUrl;

  return (
    <section>
      <div className="page-heading">
        <h1>
          {isEdit ? "Edit Laporan" : "Tambah Laporan"}
        </h1>

        <p className="muted">
          {isEdit
            ? "Perbarui informasi laporan yang masih pending."
            : "Buat laporan lapangan baru."}
        </p>
      </div>

      <div className="content-card report-form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="report-name">
              Nama Laporan
            </label>

            <input
              id="report-name"
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              maxLength={255}
              required
              disabled={saving}
              placeholder="Contoh: Inspeksi Lokasi A"
            />
          </div>

          <div className="form-group">
            <label htmlFor="report-description">
              Deskripsi
            </label>

            <textarea
              id="report-description"
              value={form.description}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
              maxLength={5000}
              required
              disabled={saving}
              rows={7}
              placeholder="Jelaskan hasil laporan lapangan..."
            />
          </div>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <div className="form-actions">
            <Link
              to={cancelUrl}
              className="secondary-link"
            >
              Batal
            </Link>

            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving
                ? "Menyimpan..."
                : isEdit
                  ? "Simpan Perubahan"
                  : "Buat Laporan"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
