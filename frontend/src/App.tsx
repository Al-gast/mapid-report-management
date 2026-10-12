
import {
  Navigate,
  Route,
  Routes,
} from "react-router";

import type { ReactNode } from "react";

import { useAuth } from "./features/auth/useAuth";

import DashboardLayout from "./layouts/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import ReportsPage from "./pages/ReportsPage";
import LoginPage from "./pages/LoginPage";
import ReportDetailPage from "./pages/ReportDetailPage";
import ReportFormPage from "./pages/ReportFormPage";
import UsersPage from "./pages/UsersPage";

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

function AdminOnlyRoute({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  console.log("user role", user?.role);

  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
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
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route
          path="reports"
          element={<ReportsPage />}
        />

        <Route
          path="reports/new"
          element={<ReportFormPage mode="create" />}
        />

        <Route
          path="reports/:id"
          element={<ReportDetailPage />}
        />

        <Route
          path="reports/:id/edit"
          element={<ReportFormPage mode="edit" />}
        />

        <Route
          path="users"
          element={
            <AdminOnlyRoute>
              <UsersPage />
            </AdminOnlyRoute>
          }
        />
      </Route>

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />

    </Routes>
  );
}
