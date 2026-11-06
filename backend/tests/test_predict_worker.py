"""Test worker Python dengan model asli. Jalankan dari folder backend: python -m pytest -q tests"""
import base64
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
    # Memuat predict_worker.py beserta model dan detektor wajahnya sekali saja.
    spec = importlib.util.spec_from_file_location("predict_worker", BACKEND / "src" / "services" / "predict_worker.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.models = module.build_models()
    module.detectors = module.build_face_detector()
    return module


def kenali(worker, gambar_bytes, model="ensemble"):
    data = base64.b64encode(gambar_bytes).decode("ascii")
    return worker.process_image(data, model, worker.models, worker.detectors)


def test_urutan_label_sama_dengan_training(worker):
    assert worker.EMOTION_CLASSES == URUTAN_KELAS_TRAINING


@pytest.mark.parametrize("model", ["vanilla", "resnet50", "ensemble"])
def test_foto_tiga_wajah(worker, model):
    hasil = kenali(worker, FOTO_TIGA_WAJAH.read_bytes(), model)
    assert hasil["n_faces"] == 3

    for f in hasil["faces"]:
        assert list(f["probabilities"]) == URUTAN_KELAS_TRAINING
        assert sum(f["probabilities"].values()) == pytest.approx(1, abs=1e-3)
        assert f["top_label"] == max(f["probabilities"], key=f["probabilities"].get)
        assert f["jelas"] == (f["confidence"] >= 0.5)


def test_wajah_terkejut_diberi_label_yang_benar(worker):
    hasil = kenali(worker, FOTO_TIGA_WAJAH.read_bytes())
    wajah = sorted(hasil["faces"], key=lambda f: f["box"]["x"])
    # Wajah di tengah adalah ekspresi terkejut. Dengan urutan label yang salah, wajah ini tampil sebagai "neutral".
    assert wajah[1]["top_label"] == "surprise"


def test_gambar_tanpa_wajah_tidak_ditebak(worker):
    kosong = cv2.imencode(".png", np.full((300, 300, 3), 128, dtype=np.uint8))[1].tobytes()
    hasil = kenali(worker, kosong)
    assert hasil["n_faces"] == 0
    assert hasil["faces"] == []


def test_berkas_bukan_gambar_ditolak(worker):
    with pytest.raises(ValueError):
        kenali(worker, b"bukan gambar")
