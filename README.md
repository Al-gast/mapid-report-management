# MAPID Report Management System

Aplikasi web untuk mengelola laporan lapangan, dibangun menggunakan **Express.js, TypeScript, PostgreSQL, React, dan Vite**.

## Live Demo

- **Aplikasi (Frontend):** https://mapid-report-management.vercel.app/
- **Backend API:** https://mapid-backend.vercel.app/
- **Database:** PostgreSQL (Supabase)

Frontend dan backend di-deploy di **Vercel**. Request `/api/*` dari frontend diteruskan ke backend melalui Vercel rewrites.

## Fitur

- **Admin:** melihat laporan serta membuat akun Pelapor dan Approver.
- **Pelapor:** membuat laporan, melihat laporan milik sendiri, serta mengubah atau menghapus laporan selama berstatus `pending`.
- **Approver:** meninjau laporan dan memberikan keputusan `approved` atau `rejected`.
- **Approval history:** setiap perubahan status dicatat bersama waktu, Approver, dan alasan/catatan. Alasan wajib diisi saat Reject.
- Filter status, sorting, pagination, dan navigasi daftar laporan yang mempertahankan filter di URL.
- Authentication menggunakan server-side session melalui **HttpOnly cookie** dan authorization berdasarkan role.

## Teknologi

| Bagian | Teknologi |
| --- | --- |
| Backend | Node.js, Express.js, TypeScript |
| Frontend | React, Vite, TypeScript |
| Database | PostgreSQL (Supabase) |
| Authentication | Server-side session, Argon2id |
| Testing | Vitest, Supertest |

## Menjalankan project secara lokal

**Prasyarat:** Node.js 22.12+ dan npm, serta database PostgreSQL yang dapat diakses (misalnya Supabase).

### 1. Install dependencies

Dari root repository:

```bash
npm ci --prefix backend
npm ci --prefix frontend
```

### 2. Siapkan database

1. Buat project PostgreSQL di Supabase.
2. Buka **SQL Editor**, lalu jalankan seluruh isi `database/schema.sql` pada database yang masih kosong.
3. Salin file environment backend:

   ```bash
   cp backend/.env.example backend/.env
   ```

4. Isi `backend/.env` menggunakan konfigurasi dari `backend/.env.example`. Pastikan `DATABASE_URL` mengarah ke database yang dibuat dan `APP_ALLOWED_ORIGINS` mengizinkan origin frontend lokal (`http://localhost:5173`).

> **Penting:** Untuk database baru, cukup jalankan `database/schema.sql`. Folder `database/migrations/` digunakan untuk memperbarui database versi lama; jangan menjalankan migration yang sama lagi setelah menggunakan schema terbaru.

### 3. Buat akun Admin

Atur nilai `SEED_ADMIN_*` pada `backend/.env` sesuai variabel yang dipakai script, lalu dari folder `backend` jalankan:

```bash
npx tsx scripts/seed-admin.ts
```

Akun Admin dibuat melalui seed script, bukan endpoint registrasi publik. Setelah login, Admin dapat membuat akun Pelapor dan Approver dari halaman **Pengguna**.

### 4. Jalankan backend dan frontend

Buka dua terminal dari root repository:

**Terminal 1 — Backend**

```bash
npm run dev --prefix backend
```

**Terminal 2 — Frontend**

```bash
npm run dev --prefix frontend
```

Buka **http://localhost:5173**. API berjalan di **http://localhost:8000**; Vite meneruskan request `/api` ke backend melalui proxy development.

## Akun demo

Akun berikut tersedia pada **database demo yang sudah disiapkan**:

| Role | Email |
| --- | --- |
| Admin | `admin@example.com` |
| Approver | `approver@example.com` |
| Pelapor | `pelapor@example.com` |

**Password untuk ketiga akun:** `GANTI_DENGAN_PASSWORD_KUAT`

> Akun demo tidak dibuat otomatis oleh `schema.sql`. Pada database baru, buat Admin melalui seed script dan akun lainnya melalui halaman Pengguna. Gunakan kredensial di atas hanya untuk lingkungan demo terisolasi, tanpa data sensitif. Jika repository bersifat publik, jangan gunakan password yang sama untuk akun produksi atau layanan lain.

## Alur penggunaan

1. **Admin** login dan membuat akun Pelapor serta Approver.
2. **Pelapor** login, membuat laporan, dan dapat mengeditnya selama status `pending`.
3. **Approver** login, membuka laporan, lalu memilih Approve atau Reject. Reject memerlukan alasan.
4. **Pelapor** melihat status terbaru beserta riwayat keputusan pada detail laporan.

## Endpoint utama

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/users` | Daftar pengguna (Admin) |
| `POST` | `/api/users` | Membuat pengguna (Admin) |
| `GET` | `/api/reports` | Daftar laporan sesuai izin pengguna |
| `POST` | `/api/reports` | Membuat laporan (Pelapor) |
| `GET` | `/api/reports/:id` | Detail laporan |
| `PATCH` | `/api/reports/:id` | Mengubah laporan pending milik sendiri |
| `DELETE` | `/api/reports/:id` | Menghapus laporan pending milik sendiri |
| `PATCH` | `/api/reports/:id/status` | Approve/Reject (Approver) |

Contoh body untuk Reject:

```json
{
  "status": "rejected",
  "reason": "Data laporan belum lengkap."
}
```

## Pengujian

**Backend:**

```bash
npm run typecheck --prefix backend
npm run typecheck:test --prefix backend
npm run test --prefix backend
npm run build --prefix backend
```

**Frontend:**

```bash
npm run lint --prefix frontend
npm run build --prefix frontend
```

## Struktur project

```text
backend/                 Express API, authentication, business logic, tests
frontend/                React dashboard
database/
   schema.sql            Skema database terbaru
   migrations/           Riwayat perubahan skema
```

## Catatan keamanan

- Password disimpan sebagai hash menggunakan Argon2id.
- Session token disimpan di database dalam bentuk hash; cookie session menggunakan atribut `HttpOnly`.
- Hak akses divalidasi di backend, termasuk ownership laporan.
- Perubahan status dan pencatatan approval history dilakukan dalam satu transaksi PostgreSQL.
- Konfigurasi rahasia berada di file `.env` dan tidak boleh di-commit ke repository.
