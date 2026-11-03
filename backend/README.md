# Backend — FER Ensemble API

FastAPI + TensorFlow (CPU) + OpenCV + PostgreSQL. Menjalankan model final laporan Deep Learning:
ensemble **Model A (CNN dari nol, seed 1) + ResNet50 C2 (seed 3)** dengan ambang keyakinan **τ = 0,5**.

## Isi folder

| Berkas | Fungsi |
|---|---|
| `app/main.py` | Membuat aplikasi FastAPI; saat menyala: tunggu database → buat tabel → muat model |
| `app/ml.py` | Deteksi wajah (YuNet) → potong persegi 48 × 48 → ensemble → ambang τ |
| `app/models.py` | Tabel `users`, `predictions`, `prediction_faces` (sama dengan `database/init.sql`) |
| `app/security.py` | Hash password bcrypt dan token JWT |
| `app/routers/` | Endpoint API (lihat tabel di bawah) |
| `model_final/` | Hasil Notebook 4: dua model `.keras`, detektor YuNet, `model_info.json` |
| `tests/` | 10 uji otomatis (pytest) |

## Endpoint

| Fitur | Metode & path | Login |
|---|---|---|
| 1. Registrasi | `POST /api/auth/register` `{username, password, full_name?}` | – |
| 1. Login | `POST /api/auth/login` `{username, password}` → `access_token` | – |
| 1. Profil | `GET /api/auth/me` | ✔ |
| 2–4. Kenali ekspresi (unggah / webcam / banyak wajah) | `POST /api/predict` multipart: `file`, `source=upload\|webcam` | ✔ |
| 5. Riwayat | `GET /api/history?limit=20&offset=0` | ✔ |
| 5. Hapus satu / semua riwayat | `DELETE /api/history/{id}` · `DELETE /api/history` | ✔ |
| 6. Statistik dashboard | `GET /api/stats?hari=14` | ✔ |
| 7. Info model | `GET /api/model-info` | – |
| Health check container | `GET /api/health` (200 = database & model siap, 503 = belum) | – |
| Dokumentasi interaktif | `GET /api/docs` (Swagger UI) | – |

Token dikirim di header `Authorization: Bearer <access_token>`. Foto **tidak disimpan**; yang disimpan hanya hasil prediksi.

## Environment variable

| Nama | Contoh | Keterangan |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://fer:rahasia@database:5432/fer_db` | Wajib di container |
| `JWT_SECRET` | string acak ≥ 32 karakter | Wajib di produksi |
| `JWT_EXPIRE_MINUTES` | `480` | Masa berlaku login |
| `MAX_UPLOAD_MB` | `5` | Batas ukuran foto |
| `MAX_FACES` | `10` | Maksimal wajah per foto |
| `VERIFY_MODEL_SHA` | `true` | Cek SHA-256 berkas model saat menyala |

## Menjalankan tanpa Docker (pengembangan)

```bash
cd backend
python -m venv .venv && . .venv/bin/activate      # Python 3.13
pip install -r requirements.txt pytest httpx
uvicorn app.main:app --reload --port 8000           # tanpa DATABASE_URL memakai SQLite lokal
pytest -q                                           # 10 uji
```

Kebutuhan sumber daya (terukur): RAM ±1,0 GB setelah model dimuat, siap dalam ±6 detik,
±0,3 detik per foto berisi 3 wajah di CPU.
