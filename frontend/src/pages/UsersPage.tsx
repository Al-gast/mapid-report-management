
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { ApiError } from "../lib/api";

import {
  usersApi,
  type CreateUserInput,
  type CreatableRole,
  type ManagedUser,
} from "../features/users/users.api";

import type { UserRole } from "../features/auth/auth.api";

import PasswordField from "../components/PasswordField";

type UserForm = CreateUserInput & {
  confirmPassword: string;
};

type UsersResult =
  | {
      key: number;
      kind: "success";
      users: ManagedUser[];
    }
  | {
      key: number;
      kind: "error";
      message: string;
    };

const emptyForm: UserForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "pelapor",
};

const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  pelapor: "Pelapor",
  approver: "Approver",
};

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

export default function UsersPage() {
  const [form, setForm] = useState<UserForm>(emptyForm);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<UsersResult | null>(
    null
  );

  // Load daftar pengguna dari backend
  useEffect(() => {
    let active = true;

    usersApi
      .list()
      .then((users) => {
        if (!active) return;

        setResult({
          key: reloadKey,
          kind: "success",
          users,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;

        let message = "Gagal mengambil daftar pengguna.";

        if (error instanceof ApiError) {
          if (error.status === 401) {
            message = "Session tidak valid. Muat ulang aplikasi.";
          } else if (error.status === 403) {
            message = "Akun tidak memiliki izin mengakses pengguna.";
          }
        }

        setResult({
          key: reloadKey,
          kind: "error",
          message,
        });
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  function reloadUsers() {
    setReloadKey((current) => current + 1);
  }

  async function handleCreateUser(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting) return;

    setFormError("");
    setSuccessMessage("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name || !email) {
      setFormError("Nama dan email wajib diisi.");
      return;
    }

    if (name.length > 150 || email.length > 255) {
      setFormError("Nama atau email melebihi batas karakter.");
      return;
    }

    if (
      form.password.length < 12 ||
      form.password.length > 128
    ) {
      setFormError("Password harus terdiri dari 12–128 karakter.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setFormError("Konfirmasi password tidak cocok.");
      return;
    }

    const payload: CreateUserInput = {
      name,
      email,
      password: form.password,
      role: form.role,
    };

    setSubmitting(true);

    try {
      await usersApi.create(payload);

      // Hapus password dari form setelah berhasil
      setForm({ ...emptyForm });

      setSuccessMessage(
        `Akun ${roleLabels[payload.role]} berhasil dibuat.`
      );

      // Ambil ulang daftar dari database
      reloadUsers();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setFormError("Email sudah terdaftar.");
        } else if (error.status === 400) {
          setFormError(
            "Data tidak valid. Periksa input dan coba lagi."
          );
        } else if (error.status === 401) {
          setFormError(
            "Session tidak valid. Muat ulang aplikasi."
          );
        } else if (error.status === 403) {
          setFormError(
            "Akun ini tidak memiliki izin membuat pengguna."
          );
        } else {
          setFormError(
            "Gagal membuat pengguna. Silakan coba lagi."
          );
        }
      } else {
        setFormError(
          "Tidak dapat menghubungi server. Coba lagi."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const current =
    result?.key === reloadKey ? result : null;

  return (
    <section className="users-page">
      <div className="page-heading">
        <h1>User Management</h1>

        <p className="muted">
          Buat akun Pelapor dan Approver serta pantau
          pengguna yang terdaftar.
        </p>
      </div>

      <div className="users-grid">
        <section className="content-card users-form-card">
          <h2>Tambah Pengguna</h2>

          <p className="muted">
            Akun hanya dapat dibuat oleh Administrator.
          </p>

          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <label htmlFor="user-name">
                Nama Lengkap
              </label>

              <input
                id="user-name"
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                maxLength={150}
                autoComplete="off"
                required
                disabled={submitting}
                placeholder="Nama pengguna"
              />
            </div>

            <div className="form-group">
              <label htmlFor="user-email">
                Email
              </label>

              <input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
                maxLength={255}
                autoComplete="off"
                required
                disabled={submitting}
                placeholder="user@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="user-role">
                Role
              </label>

              <select
                id="user-role"
                value={form.role}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    role: event.target.value as CreatableRole,
                  }))
                }
                disabled={submitting}
              >
                <option value="pelapor">Pelapor</option>
                <option value="approver">Approver</option>
              </select>
            </div>

            <div className="form-group">
              <PasswordField
                id="user-password"
                label="Password"
                value={form.password}
                onChange={(value) =>
                    setForm((previous) => ({
                    ...previous,
                    password: value,
                    }))
                }
                placeholder="Minimal 12 karakter"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                disabled={submitting}
                />
            </div>

            <div className="form-group">
              <PasswordField
                id="confirm-password"
                label="Konfirmasi Password"
                value={form.confirmPassword}
                onChange={(value) =>
                    setForm((previous) => ({
                    ...previous,
                    confirmPassword: value,
                    }))
                }
                placeholder="Ulangi password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                disabled={submitting}
                />
            </div>

            {formError && (
              <p className="error-message" role="alert">
                {formError}
              </p>
            )}

            {successMessage && (
              <p className="success-message" role="status">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
            >
              {submitting
                ? "Membuat Akun..."
                : "Buat Akun"}
            </button>
          </form>
        </section>

        <section className="content-card users-list-card">
          <div className="users-list-heading">
            <div>
              <h2>Daftar Pengguna</h2>
              <p className="muted">
                Pengguna yang tersimpan di database.
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={reloadUsers}
            >
              Muat Ulang
            </button>
          </div>

          {!current && (
            <p className="table-message" role="status">
              Memuat pengguna...
            </p>
          )}

          {current?.kind === "error" && (
            <div className="table-message" role="alert">
              <p>{current.message}</p>

              <button
                type="button"
                className="secondary-button"
                onClick={reloadUsers}
              >
                Coba Lagi
              </button>
            </div>
          )}

          {current?.kind === "success" && (
            <>
              {current.users.length === 0 ? (
                <p className="table-message">
                  Belum ada pengguna yang ditampilkan.
                </p>
              ) : (
                <div className="table-wrapper">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Nama</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Dibuat</th>
                      </tr>
                    </thead>

                    <tbody>
                      {current.users.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.name}</strong>
                            <span className="user-email">
                              {item.email}
                            </span>
                          </td>

                          <td>
                            {roleLabels[item.role]}
                          </td>

                          <td>
                            <span
                              className={
                                item.is_active
                                  ? "user-status user-active"
                                  : "user-status user-inactive"
                              }
                            >
                              {item.is_active
                                ? "Aktif"
                                : "Nonaktif"}
                            </span>
                          </td>

                          <td>
                            {formatDate(item.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="users-list-footnote">
                Menampilkan {current.users.length} akun
                sesuai batas hasil API.
              </p>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
