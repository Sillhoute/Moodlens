"""Test worker Python dengan model asli. Jalankan dari folder backend: python -m pytest -q tests"""
import importlib.util
import pathlib

import cv2
import numpy as np
import pytest

BACKEND = pathlib.Path(__file__).resolve().parents[1]
FOTO_TIGA_WAJAH = BACKEND / "tests" / "fixtures" / "tiga_wajah.jpg"
URUTAN_KELAS_TRAINING = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]


@pytest.fixture(scope="module")
def worker():
    # Memuat predict_worker.py sekali saja, karena memuat model butuh beberapa detik.
    spec = importlib.util.spec_from_file_location("predict_worker", BACKEND / "src" / "services" / "predict_worker.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_urutan_label_sama_dengan_training(worker):
    assert worker.EMOTION_CLASSES == URUTAN_KELAS_TRAINING


def test_foto_tiga_wajah(worker):
    hasil = worker.process_image(str(FOTO_TIGA_WAJAH))
    assert hasil["n_faces"] == 3

    wajah = sorted(hasil["faces"], key=lambda f: f["box"]["x"])
    # Wajah di tengah adalah ekspresi terkejut. Sebelum urutan label diperbaiki, wajah ini tampil sebagai "neutral".
    assert wajah[1]["top_label"] == "surprise"

    for f in wajah:
        assert list(f["probabilities"]) == URUTAN_KELAS_TRAINING
        assert sum(f["probabilities"].values()) == pytest.approx(1, abs=1e-3)
        assert f["jelas"] == (f["confidence"] >= 0.5)


def test_gambar_tanpa_wajah_tidak_ditebak(worker, tmp_path):
    kosong = tmp_path / "kosong.png"
    cv2.imwrite(str(kosong), np.full((300, 300, 3), 128, dtype=np.uint8))
    hasil = worker.process_image(str(kosong))
    assert hasil["n_faces"] == 0
    assert hasil["faces"] == []
