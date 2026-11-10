# MoodLens

Aplikasi web cerdas untuk pengenalan dan analisis ekspresi wajah berbasis _Deep Learning_ (Deep Learning & DevOps Course Project). MoodLens mampu mendeteksi serta mengenali 7 kelas emosi secara real-time dari unggahan foto maupun tangkapan kamera langsung (_webcam_), termasuk kemampuan mendeteksi banyak wajah sekaligus dalam satu frame. Sistem ini dibangun dengan arsitektur multi-container dan di-otomasi menggunakan pipeline CI/CD GitHub Actions.

## Arsitektur Sistem & Container

Sistem berjalan secara terisolasi ke dalam 3 container Docker yang terhubung melalui jaringan internal:

| Container  | Teknologi Utama                                      | Peran & Tanggung Jawab                                                                                     | Port Akses |
| ---------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| `frontend` | Next.js, React, NextAuth                             | Antarmuka pengguna (UI/UX) dan manajemen autentikasi sesi. Browser memanggil backend langsung di port 9000. | `4000`     |
| `backend`  | Express.js / Bun, Prisma, Python, TensorFlow, OpenCV | Autentikasi user, deteksi wajah, inferensi model pilihan, riwayat, dan statistik emosi.                    | `9000`     |
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

## Panduan Konfigurasi Environment (`.env` vs `.env.deploy`)

Proyek ini membedakan file environment agar konfigurasi pengembangan lokal (_development_) dan server/Docker (_deployment_) terpisah dengan jelas dan rapi:

- **`.env` / `backend/.env` / `frontend/.env`:** Digunakan khusus untuk pengembangan **lokal tanpa Docker** (saat menjalankan `bun run dev` secara langsung di mesin lokal).
- **`.env.deploy` / `backend/.env.deploy` / `frontend/.env.deploy`:** Digunakan khusus untuk **deployment / Docker Container** (diatur untuk jaringan internal container dan port produksi seperti Frontend `4000` dan Backend `9000`).

---

## Panduan Menjalankan Secara Lokal

Pastikan perangkat Anda telah memenuhi prasyarat berikut sebelum menjalankan aplikasi:

- Docker Desktop aktif dengan alokasi memori minimal 4 GB dan ruang disk kosong sekitar 6 GB.
- Bun / Node.js dan Python 3.11 (jika ingin menjalankan pengujian atau mode development tanpa Docker secara lokal).

### Struktur File Environment

Konfigurasi environment dipisahkan berdasarkan target runtime (Lokal vs Docker Deployment):

| File Target Deployment / Docker                                                     | File Target Development Lokal                                                   | Dipakai oleh                       | Port (Frontend / Backend)   |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------- | --------------------------- |
| `.env.deploy` (di-copy ke `.env` saat compose)                                      | `.env` (di folder utama)                                                        | `docker compose` (3 container)     | Frontend `4000`, Backend `9000` |
| `backend/.env.deploy` (di-copy ke `backend/.env`)                                   | `backend/.env`                                                                  | `bun run dev` di folder `backend`  | Port `8000` (Lokal) / `9000` (Docker) |
| `frontend/.env.deploy` (di-copy ke `frontend/.env`)                                 | `frontend/.env`                                                                 | `bun run dev` di folder `frontend` | Port `3000` (Lokal) / `4000` (Docker) |
| GitHub Secrets                                                                      | -                                                                               | Job `deploy` di pipeline CI/CD     | Frontend `4000`, Backend `9000` |

Semua file `.env` maupun `.env.deploy` diabaikan oleh Git (`.gitignore`), sehingga kata sandi dan kunci rahasia tidak pernah masuk ke repository.

---

### A. Menjalankan dengan Docker Compose (Deployment / Container Mode)

Untuk menggunakan konfigurasi deployment Docker, pastikan file `.env.deploy` disalin menjadi `.env` sesuai targetnya:

1. **Menyiapkan File Environment Deployment:**
   ```bash
   copy .env.deploy .env
   copy backend\.env.deploy backend\.env
   copy frontend\.env.deploy frontend\.env
   ```
   *(Untuk Linux/macOS gunakan perintah `cp`)*

2. **Jalankan Docker Compose:**
   - **Menggunakan Image Hasil Build CI/CD dari Docker Hub (Tanpa Build Ulang):**
     Pastikan `IMAGE_PREFIX` dan `IMAGE_TAG` sudah terkonfigurasi di `.env`, lalu jalankan:
     ```bash
     docker compose up -d --pull always --no-build --wait
     ```
   - **Build Sendiri dari Source Code Lokal:**
     ```bash
     docker compose up -d --build --wait
     ```

3. **Akses Aplikasi:**
   - Frontend terbuka di <http://localhost:4000>
   - Backend API Health check di <http://localhost:9000/api/health>
   - Database PostgreSQL berjalan di jaringan internal container (tabel dan skema dibuat otomatis via `prisma db push` saat backend container *booting*).

---

### B. Menjalankan Tanpa Docker (Local Development Mode)

Jika Anda ingin melakukan pengembangan/fitur baru secara langsung tanpa container:

1. **Jalankan Database PostgreSQL (misal via Docker terpisah):**
   ```bash
   docker run --name fer-postgres -e POSTGRES_USER=fer -e POSTGRES_PASSWORD=rahasia -e POSTGRES_DB=fer_db -p 5434:5432 -d postgres:15-alpine
   ```

2. **Jalankan Service Backend:**
   Salin `backend/.env.example` menjadi `backend/.env` (sesuaikan port ke `8000`), lalu jalankan perintah berikut di folder `backend`:
   ```bash
   cd backend
   bun install
   bun run db:generate
   bun run db:push
   bun run dev
   ```
   `bun run dev` secara otomatis membuat lingkungan virtual Python (`venv`) dan memasang pustaka dari `requirements.txt`.

3. **Jalankan Service Frontend:**
   Salin `frontend/.env.example` menjadi `frontend/.env` (sesuaikan port backend ke `8000`), lalu jalankan perintah berikut di folder `frontend`:
   ```bash
   cd frontend
   bun install
   bun run dev
   ```
   Aplikasi Next.js akan terbuka di port `3000`.

---

### Menjalankan Pengujian (Testing)

- **Backend Integration & Unit Test:**
  ```bash
  cd backend && bun run test
  ```

- **Machine Learning Inference Test:**
  ```bash
  cd backend && pip install -r requirements-dev.txt && python -m pytest -q tests
  ```
  *Pengujian Python memuat bobot model asli untuk menguji urutan label emosi, deteksi landmark wajah, serta validitas 3 pilihan inferensi model.*

---

## Alur Pipeline CI/CD

Workflow CI/CD diatur pada berkas `.github/workflows/ci-cd.yml` yang ter-trigger otomatis saat terdapat perintah *push* ke branch `main` atau dijalankan secara manual via **Run workflow**:

1. **Test Phase:** 
   - `test-backend`: Typechecking dan pengujian skrip Vitest.
   - `test-ml`: Pytest dengan memuat file bobot model asli (`.weights.h5`).
   - `test-frontend`: Verifikasi *build production* Next.js.
2. **Build & Push Phase:** 
   - Mengompilasi Docker image backend & frontend di runner GitHub.
   - Mengunggah image ke Docker Hub (`<username>/moodlens-backend` & `<username>/moodlens-frontend`) menggunakan tag `latest` dan commit SHA.
3. **Deploy Phase:** 
   - *Self-hosted runner* mengeksekusi penarikan image terbaru dari Docker Hub.
   - Menyiapkan environment `.env.deploy` dan mengaktifkan container melalui `docker compose up -d`.
   - Melakukan *smoke test* ke endpoint `/api/health` serta halaman antarmuka frontend.

**Konfigurasi Repository Secret (GitHub Actions Settings > Secrets and variables):**
- Variables: `DOCKERHUB_USERNAME`
- Secrets: `DOCKERHUB_TOKEN`, `POSTGRES_PASSWORD`, `JWT_SECRET` (`AUTH_SECRET` opsional).

---

## Struktur Notebook Model

- `notebook/UTS_Modip.ipynb`: Eksplorasi dataset FER-2013, pelatihan model, serta evaluasi metrik Custom Residual CNN & ResNet50. Menghasilkan berkas bobot `.weights.h5` yang digunakan di backend.
- `notebook/Pembahasan_Modip.ipynb`: Eksperimen pembuktian *Soft Voting Ensemble*, ambang batas keyakinan $\tau = 0,5$, serta analisis *selective fine-tuning* ResNet50.

> File bobot model tersimpan pada folder `backend/src/services/model/` (state optimizer telah dibersihkan agar berada di bawah ambang batas ukuran berkas GitHub 100 MB).