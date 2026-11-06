# MoodLens

Aplikasi web cerdas untuk pengenalan dan analisis ekspresi wajah berbasis _Deep Learning_ (Deep Learning & DevOps Course Project). MoodLens mampu mendeteksi serta mengenali 7 kelas emosi secara real-time dari unggahan foto maupun tangkapan kamera langsung (_webcam_), termasuk kemampuan mendeteksi banyak wajah sekaligus dalam satu frame. Sistem ini dibangun dengan arsitektur multi-container dan di-otomasi menggunakan pipeline CI/CD GitHub Actions.

## Arsitektur Sistem & Container

Sistem berjalan secara terisolasi ke dalam 3 container Docker yang terhubung melalui jaringan internal:

| Container           | Teknologi Utama                              | Peran & Tanggung Jawab                                                                                                          | Port Akses |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `frontend` | Next.js, React, NextAuth | Antarmuka pengguna (UI/UX) dan manajemen autentikasi sesi. Browser memanggil backend langsung di port 9000. | `4000` |
| `backend` | Express.js / Bun, Prisma, Python, TensorFlow, OpenCV | Autentikasi user, deteksi wajah (OpenCV Haar Cascade), inferensi ensemble dua model, riwayat, dan statistik emosi. | `9000` |
| `database` | PostgreSQL 15, Volume Persistent | Menyimpan data akun pengguna (password di-hash bcrypt) dan riwayat prediksi. Hanya bisa diakses backend. | - |

> **Privasi & Keamanan:** Citra wajah mentah yang diproses melalui unggahan foto atau _webcam_ hanya diekstrak di memori volatil (_runtime memory_) dan **tidak pernah disimpan** ke database maupun penyimpanan disk. Database hanya menyimpan metadata hasil prediksi emosi dan statistik terkait.

---

## Fitur Utama

1. **Autentikasi Pengguna Aman:** Registrasi dan login akun mandiri dengan enkripsi _password_ menggunakan algoritma _bcrypt_.
2. **Deteksi Emosi Multi-Wajah:** Mengenali 7 ekspresi dasar (Happy, Sad, Angry, Surprise, Fear, Disgust, Neutral) baik melalui berkas gambar maupun aliran video _webcam_ secara langsung.
3. **Manajemen Riwayat Prediksi:** Menyimpan log riwayat analisis emosi per akun pengguna, lengkap dengan opsi penghapusan riwayat secara selektif maupun massal.
4. **Analisis Statistik & Tren:** Visualisasi data statistik mendalam yang mencakup distribusi emosi, tingkat keyakinan rata-rata (_confidence score_), serta volume prediksi harian.
5. **Transparansi Model (Info Page):** Halaman informasi mendetail mengenai arsitektur model, evaluasi per kelas emosi, dan metrik performa yang dapat diakses publik tanpa perlu login.

---

## Arsitektur & Cara Kerja Model Deep Learning

Sistem ini menggunakan dua pilihan arsitektur model Deep Learning terpisah yang dilatih menggunakan dataset **FER-2013**:

1. **Custom Residual CNN (Vanilla):** Arsitektur konvolusi buatan sendiri dengan _skip connections_ (residual block) yang efisien untuk mengekstraksi fitur pola spasial dasar pada citra grayscale $48 \times 48$ piksel.
2. **Pre-trained ResNet50 (Transfer Learning):** Menggunakan bobot pra-latih _ImageNet_ yang di-fine-tune untuk menangkap struktur anatomi wajah yang lebih kompleks dan mendalam.

### Penggunaan Ambang Batas Keyakinan ($\tau$)

- **Ambang Batas Keyakinan ($\tau = 0,5$):** Jika probabilitas kelas emosi tertinggi berada di bawah ambang batas $\tau = 0,5$, sistem secara cerdas mengklasifikasikannya sebagai **"Ekspresi kurang jelas"** guna menghindari prediksi yang keliru.

### Metrik Performa Evaluasi Model

| Model / Arsitektur   | Akurasi Pengujian | Macro F1-Score | Keterangan                                         |
| -------------------- | ----------------- | -------------- | -------------------------------------------------- |
| Custom Residual CNN  | 56,0%             | 0,570          | Cepat & ringan untuk ekstraksi fitur spasial dasar |
| Pre-trained ResNet50 | 61,0%             | 0,597          | Unggul dalam ekstraksi pola visual kompleks (+5%)  |

---

## Analisis Karakteristik Per Kelas Emosi

Berdasarkan hasil pengujian pada 7.178 gambar uji (mengacu pada _Classification Report_ dan _Confusion Matrix_), berikut adalah karakteristik dan performa pengenalan untuk masing-masing dari 7 kelas emosi:

1. **Happy (Senang):**
   - **Performa:** Merupakan kelas dengan akurasi dan stabilitas tertinggi (Precision ~85-87%, Recall ~77-78%).
   - **Karakteristik Visual:** Struktur senyuman lebar, pipi terangkat, serta kerutan di sudut mata sangat dominan dan mudah dikenali oleh filter konvolusi.
2. **Surprise (Terkejut):**
   - **Performa:** Sangat akurat dengan tingkat _recall_ mencapai 79–80%.
   - **Karakteristik Visual:** Bentuk geometri mata melotot dan mulut terbuka membulat (berbentuk huruf O) memberikan fitur pembeda yang sangat khas.
3. **Neutral (Datar):**
   - **Performa:** Cukup konsisten dengan tingkat identifikasi yang stabil.
   - **Karakteristik Visual:** Minim tarikan otot ekstrem. Namun, sering kali mengalami tumpang tindih (_overlap_) dengan ekspresi _Sad_ atau _Angry_ pada kondisi wajah _resting face_.
4. **Angry (Marah):**
   - **Performa:** Moderat (Precision ~42–50%, Recall ~51–57%).
   - **Karakteristik Visual:** Berfokus pada kerutan alis ke arah bawah dan ketegangan rahang. Sering tertukar dengan ekspresi sedih atau netral karena variasi intensitas kerutan antar individu.
5. **Disgust (Jijik):**
   - **Performa:** Memiliki jumlah sampel paling sedikit dalam dataset (111 sampel uji), namun penerapan _class weight_ berhasil mendongkrak performa ResNet50 secara signifikan.
   - **Karakteristik Visual:** Kerutan pada hidung bagian atas dan bibir atas yang terangkat.
6. **Sad (Sedih):**
   - **Performa:** Menjadi salah satu tantangan kasus tersulit dalam klasifikasi ekspresi.
   - **Karakteristik Visual:** Cenderung salah diklasifikasikan sebagai _Neutral_ atau _Fear_ akibat kemiripan mikro-ekspresi pada bagian mulut dan mata yang sayu.
7. **Fear (Takut):**
   - **Performa:** Kategori emosi paling kompleks (Vanilla CNN mencatat _recall_ 21%, yang berhasil ditingkatkan ResNet50 menjadi 40%).
   - **Karakteristik Visual:** Memuat elemen gabungan antara mata membesar (mirip _Surprise_) dan mulut menegang/mengerut (mirip _Sad_).

---

## Panduan Menjalankan Secara Lokal

Pastikan perangkat Anda telah memenuhi prasyarat berikut sebelum menjalankan aplikasi:

- Docker Desktop aktif dengan alokasi memori minimal 4 GB dan ruang disk kosong $\approx 5$ GB.
- Bun / Node.js dan Python 3.10+ (jika ingin menjalankan pengujian secara lokal).

### Langkah Instalasi & Eksekusi:

#### A. Dengan Docker Compose (3 container)

1. **Konfigurasi Lingkungan (.env):**
   Salin `.env.example` di folder utama menjadi `.env`, lalu ganti `POSTGRES_PASSWORD`, `JWT_SECRET`, dan `AUTH_SECRET`. File `.env` tidak ikut ter-commit.

   ```bash
   cp .env.example .env
   ```

2. **Menjalankan Container via Docker Compose:**
   Buka terminal di direktori root proyek, lalu jalankan perintah berikut:
   ```bash
   docker compose up -d --build --wait
   ```
   Frontend terbuka di <http://localhost:4000> dan backend di <http://localhost:9000/api/health>. Database tidak dibuka ke luar,
   dan tabelnya dibuat otomatis oleh backend saat container menyala (`prisma db push`).

#### B. Tanpa Docker (mode development)

1. Jalankan database: `docker run --name fer-postgres -e POSTGRES_USER=fer -e POSTGRES_PASSWORD=rahasia -e POSTGRES_DB=fer_db -p 5434:5432 -d postgres:15-alpine`
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

Test Python memuat model asli dan memastikan urutan label ekspresi sama dengan saat training.

## Alur CI/CD

Workflow ada di `.github/workflows/ci-cd.yml` dan berjalan setiap ada push ke `main`:

1. **Test:** `test-backend` (typecheck dan vitest), `test-ml` (pytest dengan model asli), dan `test-frontend` (build Next.js).
2. **Build dan push:** image backend dan frontend di-build di VM GitHub lalu dikirim ke Docker Hub sebagai
   `<username>/moodlens-backend` dan `<username>/moodlens-frontend`, dengan tag commit SHA dan `latest`.
3. **Deploy:** self-hosted runner di laptop kelompok menarik image terbaru dari Docker Hub, menjalankan `docker compose up`,
   lalu smoke test ke `/api/health` dan halaman frontend.

Syarat di GitHub (**Settings > Secrets and variables > Actions**): variable `DOCKERHUB_USERNAME`, serta secret `DOCKERHUB_TOKEN`,
`POSTGRES_PASSWORD`, dan `JWT_SECRET` (`AUTH_SECRET` opsional). Runner dijalankan dengan `run.cmd` di laptop yang menjadi server.
