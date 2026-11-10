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

1. **Custom Residual CNN (Vanilla):** 1 konvolusi awal dan 3 _residual block_ (64, 128, 256 filter) dengan konvolusi tanpa bias dan ReLU setelah _BatchNormalization_. Input citra grayscale $48 \times 48$ piksel, sekitar 1,3 juta parameter.
2. **Pre-trained ResNet50 (Transfer Learning):** Bobot pra-latih _ImageNet_; citra diubah ke RGB dan di-_resize_ ke $96 \times 96$ di dalam model, dengan _fine-tuning_ pada 30 layer teratas.
3. **Ensemble (Soft Voting):** Rata-rata probabilitas kedua model. Menjadi pilihan default di halaman prediksi.

Kedua model dilatih dengan _class weight_ untuk mengatasi kelas yang tidak seimbang (misalnya _disgust_ hanya 1,5% data).

### Penggunaan Ambang Batas Keyakinan ($\tau$)

- **Ambang Batas Keyakinan ($\tau = 0,5$):** Jika probabilitas kelas emosi tertinggi berada di bawah $\tau = 0,5$, wajah ditandai **"Ekspresi kurang jelas"**. Pada model ensemble, 54,5% citra uji melewati ambang ini, dengan akurasi 79,6%.

### Metrik Performa Evaluasi Model

| Model / Arsitektur   | Akurasi Pengujian | Macro F1-Score | Keterangan                                         |
| -------------------- | ----------------- | -------------- | -------------------------------------------------- |
| Custom Residual CNN  | 51,3%             | 0,44           | Cepat & ringan untuk ekstraksi fitur spasial dasar |
| Pre-trained ResNet50 | 61,7%             | 0,60           | Unggul dalam ekstraksi pola visual kompleks        |
| Ensemble             | 62,7%             | 0,59           | Gabungan probabilitas kedua model                  |

Sumber angka: `notebook/UTS.ipynb` (training dan evaluasi) dan `notebook/Pembahasan.ipynb` (ensemble, ambang keyakinan, dan eksperimen _fine-tuning_).

---

## Analisis Karakteristik Per Kelas Emosi

Berdasarkan hasil pengujian pada 7.178 gambar uji (_Classification Report_ dan _Confusion Matrix_), berikut karakteristik dan performa pengenalan untuk masing-masing dari 7 kelas emosi:

1. **Happy (Senang):**
   - **Performa:** Kelas dengan hasil terbaik (precision 83–85%, recall 71–78%).
   - **Karakteristik Visual:** Struktur senyuman lebar, pipi terangkat, serta kerutan di sudut mata sangat dominan dan mudah dikenali.
2. **Surprise (Terkejut):**
   - **Performa:** Recall 80–81% pada kedua model.
   - **Karakteristik Visual:** Bentuk mata melotot dan mulut terbuka membulat (huruf O) memberikan fitur pembeda yang kuat.
3. **Neutral (Datar):**
   - **Performa:** Recall cukup tinggi (65–69%), tetapi precision hanya 44–52%.
   - **Karakteristik Visual:** Minim tarikan otot ekstrem, sering tumpang tindih dengan ekspresi sedih atau marah.
4. **Angry (Marah):**
   - **Performa:** Moderat. Recall naik dari 28% (Vanilla) menjadi 57% (ResNet50).
   - **Karakteristik Visual:** Berfokus pada kerutan alis ke arah bawah dan ketegangan rahang.
5. **Disgust (Jijik):**
   - **Performa:** Sampel paling sedikit (111 citra uji). Berkat _class weight_, recall mencapai 65–68%; precision ResNet50 53%.
   - **Karakteristik Visual:** Kerutan pada hidung bagian atas dan bibir atas yang terangkat.
6. **Sad (Sedih):**
   - **Performa:** Salah satu kelas tersulit (recall 41–42%).
   - **Karakteristik Visual:** Cenderung tertukar dengan _Neutral_ atau _Fear_ akibat kemiripan mikro-ekspresi.
7. **Fear (Takut):**
   - **Performa:** Kelas paling sulit. Recall hanya 9% pada Vanilla, naik menjadi 40% pada ResNet50.
   - **Karakteristik Visual:** Gabungan mata membesar dan mulut menegang/mengerut.

---

## Panduan Konfigurasi Environment (`.env` dan `.env.example`)

Proyek ini menggunakan 3 file template `.env.example` terpisah untuk memudahkan konfigurasi pengembangan lokal (_development_) maupun deployment Docker (_deployment_):

- **`.env.example` (di root):** Template variabel environment untuk konfigurasi root/Docker (misalnya `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `PORT`, `JWT_SECRET`, dll.).
- **`backend/.env.example`:** Template variabel environment khusus untuk service Backend Express.
- **`frontend/.env.example`:** Template variabel environment khusus untuk service Frontend Next.js.

---

## Panduan Menjalankan Secara Lokal

Pastikan perangkat Anda telah memenuhi prasyarat berikut sebelum menjalankan aplikasi:

- Docker Desktop aktif dengan alokasi memori minimal 4 GB dan ruang disk kosong sekitar 6 GB.
- Bun / Node.js dan Python 3.11 (jika ingin menjalankan pengujian atau mode development tanpa Docker secara lokal).

### Struktur File Environment

Konfigurasi environment menggunakan template `.env.example` yang disalin menjadi `.env` pada masing-masing direktori:

| File Template Contoh    | File Target (Lokal / Deployment) | Keterangan / Cakupan Variabel                        |
| ----------------------- | -------------------------------- | ---------------------------------------------------- |
| `.env.example`          | `.env` (di root folder)          | Variabel root / Docker compose (DB, Port, JWT, Auth) |
| `backend/.env.example`  | `backend/.env`                   | Konfigurasi spesifik backend Express & Prisma        |
| `frontend/.env.example` | `frontend/.env`                  | Konfigurasi spesifik frontend Next.js & NextAuth     |

Semua file `.env` diabaikan oleh Git (`.gitignore`), sehingga kata sandi dan kunci rahasia tidak pernah masuk ke repository.

---

### A. Menjalankan dengan Docker Compose (Deployment / Container Mode)

Untuk menggunakan konfigurasi deployment Docker dengan file `.env` tunggal di root, pastikan Anda menyiapkan file `.env` dari template:

1. **Menyiapkan File Environment Root:**
   Salin `.env.example` menjadi `.env` di root folder, lalu sesuaikan isinya:

   ```bash
   cp .env.example .env
   ```

   _(Atau gunakan perintah `copy .env.example .env` di Windows)_

2. **Jalankan Docker Compose:**
   - **Menggunakan Image Hasil Build CI/CD dari Docker Hub (Tanpa Build Ulang):**
     Pastikan image sudah tersedia, lalu jalankan:
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
   - Database PostgreSQL berjalan di jaringan internal container (tabel dan skema dibuat otomatis via `prisma db push` saat backend container _booting_).

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

   `bun run dev` secara otomatis membuat lingkungan virtual Python (`venv`).

3. **Jalankan Service Frontend:**
   Salin `frontend/.env.example` menjadi `frontend/.env` (sesuaikan port backend ke `8000`), lalu jalankan perintah berikut di folder `frontend`:
   ```bash
   cd frontend
   bun install
   bun run dev
   ```
   Aplikasi Next.js akan terbuka di port `3000`.

---

## Alur Pipeline CI/CD

Workflow CI/CD diatur pada berkas `.github/workflows/ci-cd.yml` yang ter-trigger otomatis saat terdapat perintah _push_ ke branch `main` atau dijalankan secara manual via **Run workflow**:

1. **Test Phase:**
   - `test-backend`: Typechecking dan pengujian skrip Vitest.
   - `test-ml`: Pytest dengan memuat file bobot model asli (`.weights.h5`).
   - `test-frontend`: Verifikasi _build production_ Next.js.
2. **Build & Push Phase:**
   - Mengompilasi Docker image backend & frontend di runner GitHub.
   - Mengunggah image ke Docker Hub (`<username>/moodlens-backend` & `<username>/moodlens-frontend`) menggunakan tag `latest` dan commit SHA.
3. **Deploy Phase:**
   - _Self-hosted runner_ mengeksekusi penarikan image terbaru dari Docker Hub.
   - Menyiapkan environment dari file `.env` root dan mengaktifkan container melalui `docker compose up -d`.
   - Melakukan _smoke test_ ke endpoint `/api/health` serta halaman antarmuka frontend.

**Konfigurasi Repository Secret (GitHub Actions Settings > Secrets and variables):**

- Variables: `DOCKERHUB_USERNAME`
- Secrets: `DOCKERHUB_TOKEN`, `POSTGRES_PASSWORD`, `JWT_SECRET` (`AUTH_SECRET` opsional).

---

## Struktur Notebook Model

- `notebook/UTS_Modip.ipynb`: Eksplorasi dataset FER-2013, pelatihan model, serta evaluasi metrik Custom Residual CNN & ResNet50. Menghasilkan berkas bobot `.weights.h5` yang digunakan di backend.
- `notebook/Pembahasan_Modip.ipynb`: Eksperimen pembuktian _Soft Voting Ensemble_, ambang batas keyakinan $\tau = 0,5$, serta analisis _selective fine-tuning_ ResNet50.

> File bobot model tersimpan pada folder `backend/src/services/model/` (state optimizer telah dibersihkan agar berada di bawah ambang batas ukuran berkas GitHub 100 MB).
