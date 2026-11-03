"""Uji otomatis backend. Jalankan dari folder backend:
    DATABASE_URL=postgresql+psycopg://fer:fer_rahasia@127.0.0.1:5433/fer_db pytest -q
Tanpa DATABASE_URL, uji memakai SQLite sementara."""
import os
import pathlib
import tempfile

os.environ.setdefault("DATABASE_URL", f"sqlite:///{tempfile.mkdtemp()}/uji.db")
os.environ.setdefault("JWT_SECRET", "rahasia-uji-otomatis-minimal-32-karakter")

import cv2  # noqa: E402
import numpy as np  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.database import engine  # noqa: E402
from app.main import app  # noqa: E402

DATA = pathlib.Path(__file__).parent / "data"
KELAS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        with engine.begin() as conn:                      # mulai dari database kosong
            conn.execute(text("DELETE FROM prediction_faces"))
            conn.execute(text("DELETE FROM predictions"))
            conn.execute(text("DELETE FROM users"))
        yield c


def daftar_login(client, username, password="password123"):
    r = client.post("/api/auth/register", json={"username": username, "password": password, "full_name": "Uji"})
    assert r.status_code == 201, r.text
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def kirim(client, header, nama, source="upload"):
    with open(DATA / nama, "rb") as f:
        return client.post("/api/predict", headers=header, files={"file": (nama, f, "image/jpeg")},
                           data={"source": source})


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json() == {"status": "ok", "database": True, "model": True,
                                                 "versi_aplikasi": "1.0.0"}


def test_model_info(client):
    r = client.get("/api/model-info").json()
    assert r["tau"] == 0.5 and r["kelas"] == KELAS
    assert [k["parameter"] for k in r["komponen"]] == [1294919, 23602055]
    assert r["hasil_verifikasi"]["Ensemble"]["akurasi"] == pytest.approx(0.6513, abs=0.001)


def test_register_dan_login(client):
    daftar_login(client, "nicholas")
    assert client.post("/api/auth/register", json={"username": "Nicholas", "password": "password123"}).status_code == 409
    assert client.post("/api/auth/register", json={"username": "ab", "password": "password123"}).status_code == 422
    assert client.post("/api/auth/register", json={"username": "budi", "password": "pendek"}).status_code == 422
    assert client.post("/api/auth/login", json={"username": "nicholas", "password": "salah123"}).status_code == 401


def test_password_tersimpan_sebagai_hash(client):
    with engine.connect() as conn:
        h = conn.execute(text("SELECT password_hash FROM users WHERE username = 'nicholas'")).scalar_one()
    assert h.startswith("$2b$") and "password123" not in h


def test_wajib_login(client):
    assert client.get("/api/history").status_code == 401
    assert client.get("/api/stats", headers={"Authorization": "Bearer token-palsu"}).status_code == 401
    with open(DATA / "tiga_wajah.jpg", "rb") as f:
        assert client.post("/api/predict", files={"file": ("a.jpg", f, "image/jpeg")}).status_code == 401


def test_prediksi_tiga_wajah(client):
    h = daftar_login(client, "andi")
    r = kirim(client, h, "tiga_wajah.jpg")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["id"] is not None and d["n_faces"] == 3 and (d["image_width"], d["image_height"]) == (960, 420)
    xs = [f["box"]["x"] for f in d["faces"]]
    assert xs == sorted(xs)                                   # urut kiri ke kanan
    for f in d["faces"]:
        assert set(f["probabilities"]) == set(KELAS)
        assert sum(f["probabilities"].values()) == pytest.approx(1, abs=1e-3)
        assert f["jelas"] == (f["confidence"] >= 0.5)
        assert (f["label"] is None) != f["jelas"]
        assert f["top_label"] == max(f["probabilities"], key=f["probabilities"].get)
        b = f["box"]
        assert 0 <= b["x"] < 960 and 0 <= b["y"] < 420 and b["w"] > 40
    print("\nHasil 3 wajah (happy, surprise, angry):",
          [(f["label"] or "kurang jelas", f["confidence"]) for f in d["faces"]])


def test_tanpa_wajah_tidak_disimpan(client):
    h = daftar_login(client, "citra")
    d = kirim(client, h, "tanpa_wajah.png", source="webcam").json()
    assert d["n_faces"] == 0 and d["id"] is None and "Tidak ada wajah" in d["message"]
    assert client.get("/api/history", headers=h).json()["total"] == 0


def test_berkas_bukan_gambar(client):
    h = daftar_login(client, "dodi")
    r = client.post("/api/predict", headers=h, files={"file": ("x.txt", b"bukan gambar", "text/plain")})
    assert r.status_code == 400
    r = client.post("/api/predict", headers=h, files={"file": ("x.jpg", b"", "image/jpeg")})
    assert r.status_code == 400


def test_riwayat_statistik_dan_hapus(client):
    h1, h2 = daftar_login(client, "eka"), daftar_login(client, "fani")
    id1 = kirim(client, h1, "tiga_wajah.jpg").json()["id"]
    kirim(client, h1, "tiga_wajah.jpg", source="webcam")

    riwayat = client.get("/api/history", headers=h1).json()
    assert riwayat["total"] == 2 and riwayat["items"][0]["source"] == "webcam"      # terbaru di atas
    assert client.get("/api/history", headers=h2).json()["total"] == 0              # data user lain tidak terlihat

    s = client.get("/api/stats", headers=h1).json()
    assert s["total_prediksi"] == 2 and s["total_wajah"] == 6
    assert s["wajah_jelas"] + s["wajah_kurang_jelas"] == 6
    assert sum(x["jumlah"] for x in s["distribusi"]) == 6
    assert s["per_sumber"] == {"upload": 1, "webcam": 1} and s["tren_harian"][-1]["jumlah"] == 2

    assert client.delete(f"/api/history/{id1}", headers=h2).status_code == 404       # bukan miliknya
    assert client.delete(f"/api/history/{id1}", headers=h1).status_code == 204
    assert client.get("/api/history", headers=h1).json()["total"] == 1
    assert client.delete("/api/history", headers=h1).status_code == 204
    assert client.get("/api/history", headers=h1).json()["total"] == 0
    with engine.connect() as conn:                          # wajah ikut terhapus (ON DELETE CASCADE)
        sisa = conn.execute(text("SELECT COUNT(*) FROM prediction_faces f JOIN predictions p "
                                 "ON p.id = f.prediction_id JOIN users u ON u.id = p.user_id "
                                 "WHERE u.username = 'eka'")).scalar_one()
    assert sisa == 0


def test_pipeline_sama_dengan_notebook(client):
    """Potongan wajah backend harus sama dengan fungsi siapkan_wajah di Notebook 4 (margin dari model_info)."""
    p = app.state.pengenal
    abu = cv2.imread(str(DATA / "tiga_wajah.jpg"), cv2.IMREAD_GRAYSCALE)
    x, y, w, h = 350, 80, 220, 260
    s = int(round(max(w, h) * (1 + 2 * p.margin)))
    x0, y0 = int(round(x + w / 2 - s / 2)), int(round(y + h / 2 - s / 2))
    acuan = cv2.resize(cv2.copyMakeBorder(abu, s, s, s, s, cv2.BORDER_REPLICATE)[y0 + s:y0 + 2 * s, x0 + s:x0 + 2 * s],
                       (48, 48), interpolation=cv2.INTER_AREA)
    assert np.array_equal(p.potong(abu, (x, y, w, h))[..., 0], acuan.astype("float32"))
