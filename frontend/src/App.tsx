import {
  Navigate,
  Route,
  Routes,
} from "react-router";

import type { ReactNode } from "react";

import { useAuth } from "./features/auth/useAuth";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}) {
  const { status, refresh } = useAuth();

  if (status === "loading") {
    return <p className="centered">Loading session...</p>;
  }

  if (status === "error") {
    return (
      <div className="centered">
        <p>Gagal memverifikasi session.</p>
        <button onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function LoginRoute() {
  const { status } = useAuth();

  if (status === "loading") {
    return <p className="centered">Loading session...</p>;
  }

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginPage />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/dashboard" replace />}
      />

      <Route
        path="/login"
        element={<LoginRoute />}
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}