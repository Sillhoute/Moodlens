# MoodLens

Aplikasi web cerdas untuk pengenalan dan analisis ekspresi wajah berbasis _Deep Learning_ (Deep Learning & DevOps Course Project). MoodLens mampu mendeteksi serta mengenali 7 kelas emosi secara real-time dari unggahan foto maupun tangkapan kamera langsung (_webcam_), termasuk kemampuan mendeteksi banyak wajah sekaligus dalam satu frame. Sistem ini dibangun dengan arsitektur multi-container dan di-otomasi menggunakan pipeline CI/CD GitHub Actions.

## Arsitektur Sistem & Container

Sistem berjalan secara terisolasi ke dalam 3 container Docker yang terhubung melalui jaringan internal:

| Container           | Teknologi Utama                              | Peran & Tanggung Jawab                                                                                                                   | Port Akses |
| ------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `moodlens-frontend` | Next.js, React, Nginx                        | Antarmuka pengguna (UI/UX), manajemen autentikasi sesi, dan reverse proxy untuk routing `/api`.                                          | `4000`     |
| `moodlens-backend`  | Python, Express.js / Bun, TensorFlow, OpenCV | Layanan inti untuk autentikasi user, deteksi wajah (BlazeFace/OpenCV), inferensi model ensemble, manajemen riwayat, dan statistik emosi. | `9000`     |
| `moodlens-db`       | PostgreSQL 15, Volume Persistent             | Menyimpan data akun pengguna (terenkripsi bcrypt) dan rekam jejak riwayat prediksi emosi.                                                | `5432`     |

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

Model yang digunakan merupakan hasil eksperimen _ensemble learning_ dari laporan Deep Learning yang menggabungkan dua arsitektur utama terlatih pada dataset **FER-2013**:

1. **Custom Residual CNN (Model A - Vanilla):** Arsitektur konvolusi buatan sendiri dengan _skip connections_ (residual block) yang efisien untuk mengekstraksi fitur pola spasial dasar pada citra grayscale $48 \times 48$ piksel.
2. **Pre-trained ResNet50 (Transfer Learning):** Menggunakan bobot pra-latih _ImageNet_ yang di-fine-tune untuk menangkap struktur anatomi wajah yang lebih kompleks dan mendalam.

### Mekanisme Ensemble & Penanganan Ambang Batas ($\tau$)

- **Probabilitas Rata-Rata:** Probabilitas output dari kedua model digabungkan menggunakan metode _averaging ensemble_.
- **Ambang Batas Keyakinan ($\tau = 0,5$):** Jika probabilitas kelas emosi tertinggi berada di bawah ambang batas $\tau = 0,5$, sistem secara cerdas mengklasifikasikannya sebagai **"Ekspresi kurang jelas"** guna menghindari prediksi yang keliru.

### Metrik Performamban Evaluasi Model

| Model / Arsitektur   | Akurasi Pengujian | Macro F1-Score | Keterangan                                        |
| -------------------- | ----------------- | -------------- | ------------------------------------------------- |
| Custom Residual CNN  | 56,0%             | 0,570          | Cepat & ringan untuk ekstraksi fitur dasar        |
| Pre-trained ResNet50 | 61,0%             | 0,597          | Unggul dalam ekstraksi pola visual kompleks (+5%) |
| **Ensemble Model**   | **65,1%**         | **0,622**      | **Kombinasi optimal dengan akurasi tertinggi**    |

> Dengan menerapkan ambang batas $\tau = 0,5$, model memberikan keputusan definitif pada 66,6% total wajah yang diuji, dengan tingkat akurasi presisi aktual mencapai **77,4%**. Backend juga memvalidasi integritas file model menggunakan verifikasi SHA-256 saat pertama kali dijalankan.

---

## Panduan Menjalankan Secara Lokal

Pastikan perangkat Anda telah memenuhi prasyarat berikut sebelum menjalankan aplikasi:

- Docker Desktop aktif dengan alokasi memori minimal 4 GB dan ruang disk kosong $\approx 5$ GB.
- Bun / Node.js dan Python 3.10+ (jika ingin menjalankan pengujian secara lokal).

### Langkah Instalasi & Eksekusi:

1. **Konfigurasi Lingkungan (.env):**
   Masing-masing modul memiliki file konfigurasi lingkungan mandiri di dalam foldernya (`backend/.env` dan `frontend/.env`). Pastikan parameter seperti `POSTGRES_PASSWORD` dan `JWT_SECRET` telah disesuaikan. Docker Compose memuat nilai tersebut ke container melalui `env_file`; simpan file di lokasi tersebut dan jangan memindahkan nilai rahasia ke file yang di-commit.

2. **Menjalankan Container via Docker Compose:**
   Buka terminal di direktori root proyek, lalu jalankan perintah berikut:
   ```bash
   docker compose up -d --build --wait
   ```
