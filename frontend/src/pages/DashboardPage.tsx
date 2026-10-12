
import { Link } from "react-router";
import { useAuth } from "../features/auth/useAuth";
import type { UserRole } from "../features/auth/auth.api";

const roleDescriptions: Record<UserRole, string> = {
  admin: "Kelola pengguna dan pantau laporan lapangan.",
  pelapor: "Buat dan pantau laporan lapangan milik Anda.",
  approver: "Tinjau laporan dan kelola keputusan persetujuan.",
};

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <section>
      <div className="page-heading">
        <h1>Selamat datang, {user.name}</h1>
        <p className="muted">
          {roleDescriptions[user.role]}
        </p>
      </div>

      <div className="content-card overview-card">
        <h2>Report Management</h2>

        <p className="muted">
          Anda dapat melihat laporan sesuai dengan hak akses
          akun yang sedang digunakan.
        </p>

        <Link
          to="/dashboard/reports"
          className="primary-link"
        >
          Lihat Laporan
        </Link>
      </div>
    </section>
  );
}
