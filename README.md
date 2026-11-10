# MoodLens

Aplikasi web cerdas untuk pengenalan dan analisis ekspresi wajah berbasis _Deep Learning_ (Deep Learning & DevOps Course Project). MoodLens mampu mendeteksi serta mengenali 7 kelas emosi secara real-time dari unggahan foto maupun tangkapan kamera langsung (_webcam_), termasuk kemampuan mendeteksi banyak wajah sekaligus dalam satu frame. Sistem ini dibangun dengan arsitektur multi-container dan di-otomasi menggunakan pipeline CI/CD GitHub Actions.

## Arsitektur Sistem & Container

Sistem berjalan secara terisolasi ke dalam 3 container Docker yang terhubung melalui jaringan internal:

| Container  | Teknologi Utama                                      | Peran & Tanggung Jawab                                                                                      | Port Akses |
| ---------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------- |
| `frontend` | Next.js, React, NextAuth                             | Antarmuka pengguna (UI/UX) dan manajemen autentikasi sesi. Browser memanggil backend langsung di port 9000. | `4000`     |
| `backend`  | Express.js / Bun, Prisma, Python, TensorFlow, OpenCV | Autentikasi user, deteksi wajah, inferensi model pilihan, riwayat, dan statistik emosi.                     | `9000`     |
| `database` | PostgreSQL 15, Volume Persistent                     | Menyimpan data akun pengguna (password di-hash bcrypt) dan riwayat prediksi. Hanya bisa diakses backend.    | -          |

> **Privasi & Keamanan:** Citra wajah mentah yang diproses melalui unggahan foto atau _webcam_ hanya diekstrak di memori volatil (_runtime memory_) dan **tidak pernah disimpan** ke database maupun penyimpanan disk.

---

## Fitur Utama

1. **Autentikasi Pengguna Aman:** Registrasi dan login akun mandiri dengan enkripsi _password_ menggunakan algoritma _bcrypt_.
2. **Deteksi Emosi Multi-Wajah:** Mengenali 7 ekspresi dasar (Happy, Sad, Angry, Surprise, Fear, Disgust, Neutral) baik melalui berkas gambar maupun aliran video _webcam_ secara langsung.
3. **Manajemen Riwayat Prediksi:** Menyimpan log riwayat analisis emosi per akun pengguna, lengkap dengan opsi penghapusan riwayat secara selektif maupun massal.
4. **Analisis Statistik & Tren:** Visualisasi data statistik mendalam yang mencakup distribusi emosi, tingkat keyakinan rata-rata (_confidence score_), serta volume prediksi harian.
5. **Transparansi Model (Info Page):** Halaman informasi mendetail mengenai arsitektur model, evaluasi per kelas emosi, dan metrik performa yang dapat diakses publik tanpa perlu login.

---

## Arsitektur & Cara Kerja Model Deep Learning

Sistem ini menggunakan dua model Deep Learning yang dilatih dengan dataset **FER-2013** (28.709 citra latih, 7.178 citra uji), ditambah gabungan keduanya:

1. **Custom Residual CNN (Vanilla):** Arsitektur konvolusi buatan sendiri dengan _skip connections_ (residual block) yang efisien untuk mengekstraksi fitur pola spasial dasar pada citra grayscale $48 \times 48$ piksel.
2. **Pre-trained ResNet50 (Transfer Learning):** Menggunakan bobot pra-latih _ImageNet_ yang di-fine-tune untuk menangkap struktur anatomi wajah yang lebih kompleks dan mendalam.

### Penggunaan Ambang Batas Keyakinan ($\tau$)

- **Ambang Batas Keyakinan ($\tau = 0,5$):** Jika probabilitas kelas emosi tertinggi berada di bawah ambang batas $\tau = 0,5$, sistem secara cerdas mengklasifikasikannya sebagai **"Ekspresi kurang jelas"** guna menghindari prediksi yang keliru.

### Metrik Performa Evaluasi Model

| Model / Arsitektur   | Akurasi Pengujian | Macro F1-Score | Keterangan                                         |
| -------------------- | ----------------- | -------------- | -------------------------------------------------- |
| Custom Residual CNN  | 56,0%             | 0,51           | Cepat & ringan untuk ekstraksi fitur spasial dasar |
| Pre-trained ResNet50 | 61,0%             | 0,59           | Unggul dalam ekstraksi pola visual kompleks (+5%)  |

---

## Analisis Karakteristik Per Kelas Emosi

Berdasarkan hasil pengujian pada 7.178 gambar uji (_Classification Report_ dan _Confusion Matrix_), berikut karakteristik dan performa pengenalan untuk masing-masing dari 7 kelas emosi:

1. **Happy (Senang):**
   - **Performa:** Merupakan kelas dengan akurasi dan stabilitas tertinggi (Precision ~85-87%, Recall ~77-78%).
   - **Karakteristik Visual:** Struktur senyuman lebar, pipi terangkat, serta kerutan di sudut mata sangat dominan dan mudah dikenali oleh filter konvolusi.
2. **Surprise (Terkejut):**
   - **Performa:** Sangat akurat dengan tingkat _recall_ mencapai 79–80%.
   - **Karakteristik Visual:** Bentuk geometri mata melotot dan mulut terbuka membulat (berbentuk huruf O) memberikan fitur pembeda yang sangat khas.
3. **Neutral (Datar):**
   - **Performa:** Cukup konsisten dengan tingkat identifikasi yang stabil.
   - **Karakteristik Visual:** Minim tarikan otot ekstrem. Namun, sering kali mengalami tumpang tindih (_overlap_) dengan ekspresi _Sad_ atau _Angry_.
4. **Angry (Marah):**
   - **Performa:** Moderat (Precision ~42–50%, Recall ~51–57%).
   - **Karakteristik Visual:** Berfokus pada kerutan alis ke arah bawah dan ketegangan rahang.
5. **Disgust (Jijik):**
   - **Performa:** Memiliki jumlah sampel paling sedikit dalam dataset (111 sampel uji).
   - **Karakteristik Visual:** Kerutan pada hidung bagian atas dan bibir atas yang terangkat.
6. **Sad (Sedih):**
   - **Performa:** Menjadi salah satu tantangan kasus tersulit dalam klasifikasi ekspresi.
   - **Karakteristik Visual:** Cenderung salah diklasifikasikan sebagai _Neutral_ atau _Fear_.
7. **Fear (Takut):**
   - **Performa:** Kategori emosi paling kompleks.
   - **Karakteristik Visual:** Memuat elemen gabungan antara mata membesar dan mulut menegang.

---

## Panduan Konfigurasi `.env` (Lokal vs Deploy)

Proyek ini membedakan file environment agar Anda tidak keliru antara pengembangan lokal (_development_) dan server produksi (_deployment_):

- **`.env` / `backend/.env` / `frontend/.env`:** Digunakan khusus untuk pengembangan **lokal** (tanpa Docker atau saat menjalankan `bun run dev`).
- **`.env.deploy` / `backend/.env.deploy` / `frontend/.env.deploy`:** Digunakan khusus untuk **deployment / Docker** (diatur menggunakan port produksi seperti Frontend `4000` dan Backend `9000`).

---

## Panduan Menjalankan Secara Lokal

Pastikan perangkat Anda telah memenuhi prasyarat berikut sebelum menjalankan aplikasi:

- Docker Desktop aktif dengan alokasi memori minimal 4 GB dan ruang disk kosong sekitar 6 GB.
- Bun / Node.js dan Python 3.11 (jika ingin menjalankan pengujian secara lokal).

### File env: mana dipakai untuk apa

Env untuk Docker dan env untuk development lokal dipisah. Ketiganya tidak saling membaca:

| File (salin dari `.env.example` di folder yang sama) | Dipakai oleh                       | Port                        |
| ---------------------------------------------------- | ---------------------------------- | --------------------------- |
| `.env` di folder utama                               | `docker compose` (3 container)     | frontend 4000, backend 9000 |
| `backend/.env`                                       | `bun run dev` di folder `backend`  | 8000                        |
| `frontend/.env`                                      | `bun run dev` di folder `frontend` | 3000                        |
| GitHub Secrets                                       | job `deploy` di pipeline CI/CD     | 4000, 9000                  |

Semua file `.env` diabaikan Git, jadi password dan secret tidak pernah masuk repository.

### A. Dengan Docker Compose (3 container)

1. Salin `.env.example` di folder utama menjadi `.env`, lalu ganti `POSTGRES_PASSWORD`, `JWT_SECRET`, dan `AUTH_SECRET`.

   ```bash
   copy .env.example .env
   ```

2. Jalankan salah satu:
   - **Pakai image hasil pipeline dari Docker Hub (tanpa build):** hapus tanda `#` di depan `IMAGE_PREFIX` dan `IMAGE_TAG` pada `.env`, lalu
     ```bash
     docker compose up -d --pull always --no-build --wait
     ```
   - **Build sendiri dari source code** (sekitar 15 menit pertama kali):
     ```bash
     docker compose up -d --build --wait
     ```

3. Frontend terbuka di <http://localhost:4000> dan backend di <http://localhost:9000/api/health>. Database tidak dibuka ke luar,
   dan tabelnya dibuat otomatis oleh backend saat container menyala (`prisma db push`).

### B. Tanpa Docker (mode development)

1. Jalankan database:
   ```bash
   docker run --name fer-postgres -e POSTGRES_USER=fer -e POSTGRES_PASSWORD=rahasia -e POSTGRES_DB=fer_db -p 5434:5432 -d postgres:15-alpine
   ```
2. Backend: salin `backend/.env.example` menjadi `backend/.env`, lalu di folder `backend` jalankan `bun install`, `bun run db:generate`,
   `bun run db:push`, dan `bun run dev` (port 8000). `bun run dev` otomatis membuat `venv` dan memasang `requirements.txt`.
3. Frontend: salin `frontend/.env.example` menjadi `frontend/.env`, lalu di folder `frontend` jalankan `bun install` dan `bun run dev` (port 3000).

### Menjalankan test

```bash
cd backend && bun run test
```

```bash
cd backend && pip install -r requirements-dev.txt && python -m pytest -q tests
```

Test Python memuat bobot model asli dan memastikan urutan label, deteksi wajah, serta ketiga pilihan model berjalan benar.

---

## Alur CI/CD

Workflow ada di `.github/workflows/ci-cd.yml` dan berjalan setiap ada push ke `main` (atau lewat tombol **Run workflow**):

1. **Test:** `test-backend` (typecheck dan vitest), `test-ml` (pytest dengan bobot model asli), dan `test-frontend` (build Next.js).
2. **Build dan push:** image backend dan frontend di-build di VM GitHub lalu dikirim ke Docker Hub sebagai
   `<username>/moodlens-backend` dan `<username>/moodlens-frontend`, dengan tag commit SHA dan `latest`.
3. **Deploy:** self-hosted runner di laptop kelompok menarik image terbaru dari Docker Hub, menjalankan `docker compose up`,
   lalu smoke test ke `/api/health` dan halaman frontend.

Syarat di GitHub (**Settings > Secrets and variables > Actions**): variable `DOCKERHUB_USERNAME`, serta secret `DOCKERHUB_TOKEN`,
`POSTGRES_PASSWORD`, dan `JWT_SECRET` (`AUTH_SECRET` opsional). Runner dijalankan dengan `run.cmd` di laptop yang menjadi server.

---

## Notebook

- `notebook/UTS_Modip.ipynb`: eksplorasi data, training, dan evaluasi kedua model. Menghasilkan bobot `.weights.h5` yang dipakai aplikasi.
- `notebook/Pembahasan_Modip.ipynb`: pembuktian ensemble, ambang keyakinan $\tau = 0,5$, dan eksperimen _selective fine-tuning_ ResNet50.

Bobot di `backend/src/services/model/` adalah hasil notebook tersebut, dengan state optimizer dibuang agar ukurannya di bawah batas 100 MB GitHub.
