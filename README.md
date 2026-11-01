# TaskFlow

Papan manajemen tugas berbasis web untuk UTS DevOps. Aplikasi berjalan dalam tiga container
(frontend, backend, database) dan di-deploy otomatis dengan GitHub Actions.

| Container | Teknologi | Peran |
| --- | --- | --- |
| `frontend` | React, Vite, Nginx | Menyajikan antarmuka dan meneruskan `/api` ke backend |
| `backend` | Node.js, Express | REST API dan validasi data |
| `db` | PostgreSQL 16 | Menyimpan data pada volume `db-data` |

## Menjalankan secara lokal

Syarat: Docker Desktop sudah berjalan.

```bash
cp .env.example .env
```

Ubah `POSTGRES_PASSWORD` di `.env`, lalu jalankan:

```bash
docker compose up -d --build --wait
```

Aplikasi terbuka di <http://localhost:8088>. Port dapat diubah lewat `APP_PORT`.

Menghentikan container tanpa menghapus data:

```bash
docker compose down
```

## Menjalankan test

Backend membutuhkan PostgreSQL yang dapat diakses lewat variabel `PGHOST`, `PGPORT`, `PGUSER`,
`PGPASSWORD`, dan `PGDATABASE`. Test mengosongkan tabel `tasks`, jadi gunakan database khusus test.

```bash
cd backend && npm ci && npm test
```

```bash
cd frontend && npm ci && npm test
```

## Alur CI/CD

Workflow ada di `.github/workflows/ci-cd.yml`.

1. **Test** (setiap push dan pull request ke `main`): test backend dengan PostgreSQL, test dan build frontend.
2. **Build dan push** (hanya push ke `main`): image frontend dan backend dikirim ke GitHub Container
   Registry dengan tag commit SHA dan `latest`.
3. **Deploy** (hanya push ke `main`): self-hosted runner menarik image dan menjalankan
   `docker compose up`, lalu smoke test ke `/api/health`.

Versi yang sedang berjalan tampil di bagian bawah halaman aplikasi.

## Menyiapkan CI/CD

1. Buat repository GitHub **private**. Self-hosted runner pada repository publik bisa menjalankan kode
   dari pull request orang lain di laptop Anda.
2. Push kode ini ke branch `main`.
3. Tambahkan secret `POSTGRES_PASSWORD` di **Settings > Secrets and variables > Actions**.
4. Buka **Settings > Actions > Runners > New self-hosted runner**, pilih Windows x64, lalu ikuti perintah
   unduh dan `config.cmd` yang ditampilkan GitHub.
5. Jalankan `run.cmd` memakai akun Windows yang sama dengan Docker Desktop, bukan sebagai service.
6. Push commit baru, lalu pantau hasilnya di tab **Actions**.

Laptop harus menyala dengan Docker Desktop dan `run.cmd` aktif saat deploy. Jika tidak, job `deploy`
menunggu sampai runner kembali online.

## Catatan

- PostgreSQL hanya memakai password saat volume pertama kali dibuat. Jika sudah pernah menjalankan
  aplikasi secara lokal dengan password berbeda dari secret, samakan password-nya atau hapus data lama
  dengan `docker compose down -v`.
- Deploy lewat CI dan `docker compose` lokal memakai nama proyek yang sama, sehingga saling menggantikan.
