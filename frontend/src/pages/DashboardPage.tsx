
import { Link } from "react-router";

import { useAuth } from "../features/auth/useAuth";
import "../styles/dashboard-minimal.css";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  const shortcuts =
    user.role === "admin"
      ? [
          {
            label: "Laporan",
            to: "/dashboard/reports",
          },
          {
            label: "Pengguna",
            to: "/dashboard/users",
          },
        ]
      : user.role === "pelapor"
        ? [
            {
              label: "Buat Laporan",
              to: "/dashboard/reports/new",
            },
            {
              label: "Laporan Saya",
              to: "/dashboard/reports",
            },
          ]
        : [
            {
              label: "Perlu Ditinjau",
              to: "/dashboard/reports?status=pending",
            },
            {
              label: "Semua Laporan",
              to: "/dashboard/reports",
            },
          ];

  return (
    <section className="mapid-minimal-home">
      <h1>Akses Cepat</h1>

      <div className="mapid-minimal-shortcuts">
        {shortcuts.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="mapid-minimal-shortcut"
          >
            <span>{item.label}</span>
            <span aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
