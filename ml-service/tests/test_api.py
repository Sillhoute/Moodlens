from pathlib import Path

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.inference import EMOTIONS, decode_image
from app.main import app

FACE_IMAGE = (Path(__file__).parent / "fixtures" / "astronaut.jpg").read_bytes()


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def encode(image):
    return cv2.imencode(".jpg", image)[1].tobytes()


def post_image(client, data, models="resnet"):
    return client.post(
        "/predict",
        files={"image": ("foto.jpg", data, "image/jpeg")},
        data={"models": models},
    )


def test_health_melaporkan_kedua_model(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "models": ["vanilla", "resnet"]}


@pytest.mark.parametrize("model", ["vanilla", "resnet"])
def test_foto_wajah_tersenyum_terbaca_happy(client, model):
    res = post_image(client, FACE_IMAGE, model)
    assert res.status_code == 200
    body = res.json()
    assert len(body["faces"]) == 1

    result = body["faces"][0]["results"][model]
    assert result["emotion"] == "happy"
    assert list(result["probabilities"]) == EMOTIONS
    assert sum(result["probabilities"].values()) == pytest.approx(1, abs=0.01)
    assert body["latency_ms"][model] > 0


def test_mode_bandingkan_mengembalikan_kedua_model(client):
    body = post_image(client, FACE_IMAGE, "vanilla,resnet").json()
    assert set(body["faces"][0]["results"]) == {"vanilla", "resnet"}


def test_kotak_wajah_berada_di_dalam_gambar(client):
    body = post_image(client, FACE_IMAGE).json()
    box = body["faces"][0]["box"]
    assert box["x"] >= 0 and box["y"] >= 0
    assert box["x"] + box["width"] <= body["image"]["width"]
    assert box["y"] + box["height"] <= body["image"]["height"]


def test_gambar_tanpa_wajah_tidak_menghasilkan_prediksi(client):
    blank = np.full((300, 300, 3), 128, dtype=np.uint8)
    body = post_image(client, encode(blank)).json()
    assert body["faces"] == []
    assert body["latency_ms"] == {}


def test_file_bukan_gambar_ditolak(client):
    assert post_image(client, b"bukan gambar").status_code == 400


def test_model_tidak_dikenal_ditolak(client):
    assert post_image(client, FACE_IMAGE, "mobilenet").status_code == 400


def test_gambar_besar_diperkecil():
    large = np.zeros((2000, 4000, 3), dtype=np.uint8)
    assert decode_image(encode(large)).shape[:2] == (640, 1280)
