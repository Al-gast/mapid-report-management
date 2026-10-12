
import { useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";

import { useAuth } from "../features/auth/useAuth";
import "../styles/dashboard-minimal.css";

type IconName = "dashboard" | "reports" | "users";

function SidebarIcon({ name }: { name: IconName }) {
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
      {name === "dashboard" && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </>
      )}

      {name === "reports" && (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h8" />
        </>
      )}

      {name === "users" && (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20v-2a6 6 0 0 1 12 0v2" />
          <path d="M17 5a3 3 0 0 1 0 6" />
          <path d="M19 14a5 5 0 0 1 2 4v2" />
        </>
      )}
    </svg>
  );
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/dashboard/users")) {
    return "Pengguna";
  }

  if (pathname.startsWith("/dashboard/reports")) {
    return "Laporan";
  }

  return "Dashboard";
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  if (!user) return null;

  const pageTitle = getPageTitle(location.pathname);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setLogoutError("Gagal keluar. Coba lagi.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="mapid-minimal-shell">
      <aside className="mapid-minimal-sidebar">
        <div className="mapid-minimal-brand">
          MAPID
        </div>

        <nav
          className="mapid-minimal-navigation"
          aria-label="Navigasi utama"
        >
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `mapid-nav-link ${isActive ? "is-active" : ""}`
            }
          >
            <SidebarIcon name="dashboard" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/dashboard/reports"
            className={({ isActive }) =>
              `mapid-nav-link ${isActive ? "is-active" : ""}`
            }
          >
            <SidebarIcon name="reports" />
            <span>Laporan</span>
          </NavLink>

          {user.role === "admin" && (
            <NavLink
              to="/dashboard/users"
              className={({ isActive }) =>
                `mapid-nav-link ${isActive ? "is-active" : ""}`
              }
            >
              <SidebarIcon name="users" />
              <span>Pengguna</span>
            </NavLink>
          )}
        </nav>
      </aside>

      <div className="mapid-minimal-main">
        <header className="mapid-minimal-topbar">
          <h2>{pageTitle}</h2>

          <div className="mapid-minimal-account">
            <span className="mapid-minimal-username">
              {user.name}
            </span>

            <button
              type="button"
              className="mapid-minimal-logout"
              disabled={loggingOut}
              onClick={() => void handleLogout()}
            >
              {loggingOut ? "Keluar..." : "Keluar"}
            </button>
          </div>
        </header>

        {logoutError && (
          <div className="mapid-minimal-alert" role="alert">
            {logoutError}
          </div>
        )}

        <main
          className="mapid-minimal-content"
          id="main-content"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
