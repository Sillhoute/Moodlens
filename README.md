# FER Ensemble

Aplikasi web pengenal ekspresi wajah untuk UTS Deep Learning dan UTS DevOps. Aplikasi mengenali 7 ekspresi
dari foto atau webcam, termasuk beberapa wajah sekaligus, berjalan dalam tiga container, dan di-deploy
otomatis dengan GitHub Actions.

| Container | Teknologi | Peran |
| --- | --- | --- |
| `frontend` | React, Vite, Nginx | Antarmuka dan meneruskan `/api` ke backend |
| `backend` | Python, FastAPI, TensorFlow, OpenCV | Login, deteksi wajah, prediksi ensemble, riwayat, statistik |
| `database` | PostgreSQL 16 dengan `init.sql` | Menyimpan akun dan riwayat prediksi pada volume `db-data` |

Foto wajah hanya diproses di memori dan tidak disimpan. Database hanya menyimpan hasil prediksi.

## Fitur

1. Daftar dan masuk dengan akun sendiri. Password disimpan sebagai hash bcrypt.
2. Kenali ekspresi dari unggah foto atau analisis webcam langsung, termasuk beberapa wajah. Frame webcam otomatis
   hanya dipakai untuk prediksi; tekan tombol ambil foto untuk menyimpan satu hasil ke riwayat.
3. Riwayat prediksi per akun, bisa dihapus satu per satu atau semuanya.
4. Statistik: distribusi ekspresi, rata-rata keyakinan, dan jumlah prediksi per hari.
5. Info model: akurasi, komponen ensemble, dan cara kerja, bisa dilihat tanpa login.

## Model

Model berasal dari laporan UTS Deep Learning: ensemble Model A (CNN dari nol) dan ResNet50 C2 dengan dataset
FER-2013. Probabilitas kedua model dirata-rata. Jika probabilitas tertinggi di bawah ambang τ = 0,5, wajah
ditampilkan sebagai "Ekspresi kurang jelas".

| Model | Akurasi | Macro F1 |
| --- | --- | --- |
| Model A | 61,1% | 0,570 |
| ResNet50 C2 | 62,6% | 0,597 |
| **Ensemble** | **65,1%** | **0,622** |

Dengan τ = 0,5, model menjawab 66,6% wajah, dan akurasinya pada wajah yang dijawab 77,4%. Detail lengkap ada
di [backend/README.md](backend/README.md) dan `backend/model_final/model_info.json`. Backend memeriksa SHA-256
ketiga file model saat menyala.

## Menjalankan secara lokal

Syarat: Docker Desktop sudah berjalan, sisa disk sekitar 5 GB, dan memori Docker minimal 4 GB.

```bash
cp .env.example .env
```

Ubah `POSTGRES_PASSWORD` dan `JWT_SECRET` di `.env`, lalu jalankan:

```bash
docker compose up -d --build --wait
```

Aplikasi terbuka di <http://localhost:8088>, dan dokumentasi API di <http://localhost:8088/api/docs>. Port
dapat diubah lewat `APP_PORT`. Build pertama butuh waktu lama karena memasang TensorFlow.

Menghentikan container tanpa menghapus data:

```bash
docker compose down
```

Webcam hanya bisa dipakai lewat `localhost` atau HTTPS. Di alamat lain, gunakan unggah foto.

## Menjalankan test

Backend memuat model asli dan memakai SQLite sementara jika `DATABASE_URL` tidak diisi:

```bash
cd backend && pip install -r requirements.txt -r requirements-dev.txt && python -m pytest -q
```

```bash
cd frontend && npm ci && npm test
```

## Alur CI/CD

Workflow ada di `.github/workflows/ci-cd.yml`.

1. **Test** (setiap push dan pull request ke `main`): test backend dengan model asli terhadap PostgreSQL,
   serta test dan build frontend.
2. **Build dan push** (hanya push ke `main`): ketiga image dikirim ke GitHub Container Registry dengan tag
   commit SHA dan `latest`.
3. **Deploy** (hanya push ke `main`): self-hosted runner menarik image dan menjalankan `docker compose up`,
   lalu smoke test ke `/api/health` dan `/api/model-info`.

Versi yang sedang berjalan tampil di bagian bawah halaman aplikasi.

## Menyiapkan CI/CD

1. Buat repository GitHub **private**. Self-hosted runner pada repository publik bisa menjalankan kode
   dari pull request orang lain di laptop Anda.
2. Push kode ini ke branch `main`.
3. Tambahkan secret `POSTGRES_PASSWORD` dan `JWT_SECRET` (string acak minimal 32 karakter) di
   **Settings > Secrets and variables > Actions**.
4. Buka **Settings > Actions > Runners > New self-hosted runner**, pilih Windows x64, lalu ikuti perintah
   unduh dan `config.cmd` yang ditampilkan GitHub.
5. Jalankan `run.cmd` memakai akun Windows yang sama dengan Docker Desktop, bukan sebagai service.
6. Push commit baru, lalu pantau hasilnya di tab **Actions**.

Laptop harus menyala dengan Docker Desktop dan `run.cmd` aktif saat deploy. Jika tidak, job `deploy`
menunggu sampai runner kembali online.

## Catatan

- PostgreSQL hanya memakai password dan menjalankan `init.sql` saat volume pertama kali dibuat. Jika sudah
  pernah menjalankan aplikasi secara lokal dengan password berbeda dari secret, samakan password-nya atau
  hapus data lama dengan `docker compose down -v`.
- Mengganti `JWT_SECRET` membuat semua sesi login berakhir, jadi pengguna perlu masuk lagi.
- Deploy lewat CI dan `docker compose` lokal memakai nama proyek yang sama, sehingga saling menggantikan.
