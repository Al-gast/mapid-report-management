
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";

import { useAuth } from "../features/auth/useAuth";
import type { UserRole } from "../features/auth/auth.api";

const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  pelapor: "Pelapor",
  approver: "Approver",
};

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setError("Logout gagal. Silakan coba lagi.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span>MAPID</span>
          <small>Report Management</small>
        </div>

        <nav
          className="sidebar-navigation"
          aria-label="Main navigation"
        >
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/dashboard/reports"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            Laporan
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <span className="role-label">
            {roleLabels[user.role]}
          </span>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-user">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </header>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
