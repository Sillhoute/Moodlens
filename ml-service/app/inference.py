"""Deteksi wajah dan prediksi ekspresi."""
import threading
import time
from pathlib import Path

import cv2
import numpy as np
import tensorflow as tf

from app.architectures import AdvancedResidualFERModel, OOPResNet50FERModel

# Urutan indeks dari flow_from_directory di notebook (alfabetis).
EMOTIONS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]

MODEL_SPECS = {
    "vanilla": (AdvancedResidualFERModel, "vanilla.weights.h5"),
    "resnet": (OOPResNet50FERModel, "resnet.weights.h5"),
}

FACE_INPUT_SIZE = 48
MAX_IMAGE_SIDE = 1280
MAX_FACES = 10


class InvalidImageError(ValueError):
    pass


def build_model(name, weights_path=None):
    model_class, _ = MODEL_SPECS[name]
    model = model_class(num_classes=len(EMOTIONS))
    model(tf.zeros((1, FACE_INPUT_SIZE, FACE_INPUT_SIZE, 1)))
    if weights_path is not None:
        model.load_weights(weights_path)
    return model


def decode_image(data):
    """Membaca gambar BGR dan memperkecilnya agar deteksi wajah tetap cepat."""
    try:
        image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    except cv2.error as exc:
        raise InvalidImageError("Gambar tidak dapat dibaca") from exc
    if image is None:
        raise InvalidImageError("Gambar tidak dapat dibaca")

    height, width = image.shape[:2]
    scale = MAX_IMAGE_SIDE / max(height, width)
    if scale < 1:
        image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    return image


def preprocess_faces(gray, boxes):
    """Menyamakan input dengan notebook: grayscale 48x48 dengan skala 0-1."""
    crops = [
        cv2.resize(gray[y : y + h, x : x + w], (FACE_INPUT_SIZE, FACE_INPUT_SIZE), interpolation=cv2.INTER_AREA)
        for x, y, w, h in boxes
    ]
    return (np.stack(crops).astype("float32") / 255.0)[..., None]


class FerEngine:
    def __init__(self, weights_dir):
        self._detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        if self._detector.empty():
            raise RuntimeError("Haar cascade gagal dimuat")
        # Instance CascadeClassifier dipakai bersama antar-thread request.
        self._detector_lock = threading.Lock()
        self._predictors = {}

        for name, (_, filename) in MODEL_SPECS.items():
            model = build_model(name, Path(weights_dir) / filename)
            predictor = tf.function(
                lambda batch, model=model: model(batch, training=False),
                input_signature=[tf.TensorSpec([None, FACE_INPUT_SIZE, FACE_INPUT_SIZE, 1], tf.float32)],
            )
            # Membangun graph sekarang agar request pertama tidak lambat.
            predictor(tf.zeros((1, FACE_INPUT_SIZE, FACE_INPUT_SIZE, 1)))
            self._predictors[name] = predictor

    @property
    def model_names(self):
        return list(self._predictors)

    def _detect_faces(self, gray):
        with self._detector_lock:
            boxes = self._detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(48, 48))
        ordered = sorted((tuple(int(v) for v in box) for box in boxes), key=lambda b: b[2] * b[3], reverse=True)
        return ordered[:MAX_FACES]

    def predict(self, data, model_names):
        image = decode_image(data)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        boxes = self._detect_faces(gray)

        height, width = gray.shape
        faces = [
            {"box": {"x": x, "y": y, "width": w, "height": h}, "results": {}}
            for x, y, w, h in boxes
        ]
        latency_ms = {}
        if boxes:
            batch = preprocess_faces(gray, boxes)
            for name in model_names:
                started = time.perf_counter()
                probabilities = self._predictors[name](tf.constant(batch)).numpy()
                latency_ms[name] = round((time.perf_counter() - started) * 1000, 1)
                for face, scores in zip(faces, probabilities):
                    best = int(np.argmax(scores))
                    face["results"][name] = {
                        "emotion": EMOTIONS[best],
                        "score": round(float(scores[best]), 4),
                        "probabilities": {
                            emotion: round(float(score), 4) for emotion, score in zip(EMOTIONS, scores)
                        },
                    }

        return {"image": {"width": width, "height": height}, "faces": faces, "latency_ms": latency_ms}
