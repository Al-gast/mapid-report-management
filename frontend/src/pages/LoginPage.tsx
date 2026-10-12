
import { useState, type FormEvent } from "react";

import "../styles/targeted-polish.css";

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {visible ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a16.1 16.1 0 0 1-3.3 4.1" />
          <path d="M6.2 6.2C3.4 8.1 2 12 2 12s3.5 7 10 7c1.4 0 2.7-.3 3.8-.8" />
          <path d="M10 10a3 3 0 0 0 4 4" />
        </>
      )}
    </svg>
  );
}

function getLoginError(status: number): string {
  switch (status) {
    case 400:
      return "Periksa kembali email dan kata sandi.";
    case 401:
      return "Email atau kata sandi salah.";
    case 403:
      return "Akun tidak aktif atau tidak memiliki akses.";
    case 429:
      return "Terlalu banyak percobaan. Coba lagi nanti.";
    default:
      return "Gagal masuk. Silakan coba lagi.";
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      if (!response.ok) {
        setError(getLoginError(response.status));
        return;
      }

      // Full reload agar AuthProvider membaca session baru.
      window.location.replace("/dashboard");
    } catch {
      setError(
        "Tidak dapat terhubung ke server. Periksa koneksi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mapid-login-page">
      <div className="mapid-login-card">
        <div className="mapid-login-heading">
          <span className="mapid-login-brand">MAPID</span>
          <h1>Masuk</h1>
          <p>Masuk ke akun Anda.</p>
        </div>

        <form
          className="mapid-login-form"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="mapid-login-field">
            <label htmlFor="login-email">
              Email
            </label>

            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="Masukkan email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              disabled={loading}
              required
            />
          </div>

          <div className="mapid-login-field">
            <label htmlFor="login-password">
              Kata Sandi
            </label>

            <div className="mapid-password-field">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                disabled={loading}
                required
              />

              <button
                type="button"
                className="mapid-password-toggle"
                aria-label={
                  showPassword
                    ? "Sembunyikan kata sandi"
                    : "Tampilkan kata sandi"
                }
                aria-pressed={showPassword}
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                disabled={loading}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
          </div>

          {error && (
            <div
              className="mapid-login-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="mapid-login-submit"
            disabled={loading}
          >
            {loading ? "Sedang masuk..." : "Masuk"}
          </button>
        </form>
      </div>
    </main>
  );
}
