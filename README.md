# Ruang Belajar (Cloudflare Workers + D1 + R2 + Pages)

Aplikasi portal ruang belajar untuk sekolah: guru dapat mengirim materi belajar dan tugas ke kelas tertentu, dan setiap siswa menerima materi serta mengumpulkan tugas langsung dari akun masing-masing.

## Struktur Proyek

- `backend/` — API berbasis **Hono** di **Cloudflare Workers**, database **Cloudflare D1** (Drizzle ORM), dan penyimpanan file **Cloudflare R2**.
- `frontend/` — Antarmuka **React + Vite + TypeScript + Tailwind CSS** untuk deployment di **Cloudflare Pages**.

---

## 1. Menjalankan Secara Lokal

### Backend (`backend/`)
```bash
cd backend
npm install
npm run db:migrate:local
npm run dev
```
Backend akan berjalan di `http://127.0.0.1:8787`.

### Frontend (`frontend/`)
```bash
cd frontend
npm install
npm run dev
```
Frontend akan berjalan di `http://localhost:5173` (otomatis terhubung ke backend melalui proxy `/api`).

### Setup Akun Pertama
1. Buka `http://localhost:5173`.
2. Klik tab **Setup Admin Awal** untuk membuat akun Admin pertama.
3. Login sebagai Admin, lalu buat **Akun Guru**, **Akun Siswa**, **Kelas**, masukkan siswa ke kelas, dan buat **Mata Pelajaran**.

---

## 2. Deployment ke Cloudflare

### A. Siapkan Database D1 & Storage R2
```bash
cd backend
npx wrangler login
npx wrangler d1 create ruang_belajar_db
npx wrangler r2 bucket create ruang-belajar-files
```
Salin `database_id` hasil perintah `d1 create` ke dalam `backend/wrangler.toml`.

Jalankan migrasi database ke production:
```bash
npm run db:migrate:remote
```

Atur secret JWT dan URL frontend di `backend/wrangler.toml` (atau gunakan `wrangler secret put JWT_SECRET`):
```bash
npx wrangler secret put JWT_SECRET
```

Deploy backend ke Cloudflare Workers:
```bash
npm run deploy
```

### B. Deploy Frontend ke Cloudflare Pages
Buat file `frontend/.env.production` berisi URL Workers Anda:
```env
VITE_API_URL=https://ruang-belajar-api.<subdomain-anda>.workers.dev
```
Lalu build dan deploy ke Cloudflare Pages:
```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name ruang-belajar
```
Terakhir, pastikan `CORS_ORIGIN` di `backend/wrangler.toml` diisi dengan URL Cloudflare Pages Anda (misalnya `https://ruang-belajar.pages.dev`) lalu jalankan `npm run deploy` ulang di `backend/`.
