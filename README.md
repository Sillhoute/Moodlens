# MoodLens

Aplikasi web pengenal ekspresi wajah untuk UTS Deep Learning dan UTS DevOps. Aplikasi mengenali 7 ekspresi
dari foto atau kamera, berjalan dalam empat container, dan di-deploy otomatis dengan GitHub Actions.

| Container | Teknologi | Peran |
| --- | --- | --- |
| `frontend` | React, Vite, Nginx | Antarmuka dan meneruskan `/api` ke backend |
| `backend` | Node.js, Express | Validasi upload, memanggil model, menyimpan riwayat |
| `ml-service` | Python, FastAPI, TensorFlow, OpenCV | Deteksi wajah dan prediksi ekspresi |
| `db` | PostgreSQL 16 | Menyimpan riwayat pada volume `db-data` |

Foto wajah hanya diproses di memori dan tidak disimpan. Riwayat hanya berisi ekspresi, skor, model, dan waktu.

## Model

Arsitektur dan bobot berasal dari notebook UTS Deep Learning dengan dataset FER.

| Model | Akurasi | Parameter | Dipakai untuk |
| --- | --- | --- | --- |
| ResNet50 (transfer learning) | 61% | 24,1 juta | Foto |
| Custom Residual CNN | 56% | 1,3 juta | Kamera dan foto |

Akurasi berasal dari folder test yang juga dipakai saat memilih bobot terbaik, sehingga cenderung optimistis.
Model membaca ekspresi di wajah, bukan perasaan seseorang.

`ml-service/weights` berisi bobot tanpa data optimizer. Untuk membuatnya ulang dari file hasil training,
jalankan perintah berikut dari folder `ml-service` dalam environment yang sudah memasang `requirements.txt`:

```bash
python -m scripts.strip_weights <folder bobot notebook> weights
```

## Menjalankan secara lokal

Syarat: Docker Desktop sudah berjalan.

```bash
cp .env.example .env
```

Ubah `POSTGRES_PASSWORD` di `.env`, lalu jalankan:

```bash
docker compose up -d --build --wait
```

Aplikasi terbuka di <http://localhost:8088>. Port dapat diubah lewat `APP_PORT`. Build pertama butuh waktu lama
karena image `ml-service` berukuran sekitar 2,6 GB, dan container ini memakai memori sekitar 1 GB.

Menghentikan container tanpa menghapus data:

```bash
docker compose down
```

Kamera hanya bisa dipakai lewat `localhost` atau HTTPS. Di alamat lain, gunakan menu Foto.

## Menjalankan test

Backend membutuhkan PostgreSQL yang dapat diakses lewat variabel `PGHOST`, `PGPORT`, `PGUSER`,
`PGPASSWORD`, dan `PGDATABASE`. Test mengosongkan tabel `predictions`, jadi gunakan database khusus test.

```bash
cd backend && npm ci && npm test
```

```bash
cd frontend && npm ci && npm test
```

```bash
cd ml-service && pip install -r requirements-dev.txt && python -m pytest -q
```

Foto uji `ml-service/tests/fixtures/astronaut.jpg` adalah foto NASA domain publik dari paket scikit-image.

## Alur CI/CD

Workflow ada di `.github/workflows/ci-cd.yml`.

1. **Test** (setiap push dan pull request ke `main`): test backend dengan PostgreSQL, test dan build frontend,
   serta test model dengan bobot asli.
2. **Build dan push** (hanya push ke `main`): ketiga image dikirim ke GitHub Container Registry dengan tag
   commit SHA dan `latest`.
3. **Deploy** (hanya push ke `main`): self-hosted runner menarik image dan menjalankan `docker compose up`,
   lalu smoke test ke `/api/health` dan satu prediksi sungguhan.

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
