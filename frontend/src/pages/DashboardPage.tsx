import { useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "../features/auth/useAuth";
import type { UserRole } from "../features/auth/auth.api";

const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  pelapor: "Pelapor",
  approver: "Approver",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  async function handleLogout() {
    setLoading(true);
    setError("");

    try {
      await logout();

      navigate("/login", {
        replace: true,
      });
    } catch {
      setError("Logout gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard-layout">
      <header className="dashboard-header">
        <div className="brand">MAPID</div>

        <button
          className="secondary-button"
          onClick={handleLogout}
          disabled={loading}
        >
          {loading ? "Logging out..." : "Logout"}
        </button>
      </header>

      <section className="dashboard-content">
        <p className="muted">Dashboard</p>

        <h1>Welcome, {user.name}</h1>

        <p className="muted">
          You are logged in as{" "}
          <strong>{roleLabels[user.role]}</strong>.
        </p>

        <div className="info-card">
          <h2>Account Information</h2>

          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p>
            <strong>Role:</strong>{" "}
            {roleLabels[user.role]}
          </p>
        </div>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}