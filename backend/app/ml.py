"""Inti pengenalan ekspresi: deteksi wajah (YuNet) -> potong 48x48 -> ensemble Model A + ResNet50 C2 -> ambang tau.
Langkah praproses SAMA PERSIS dengan fungsi `siapkan_wajah` di Notebook 4 (verifikasi), dan semua parameternya
dibaca dari model_final/model_info.json agar backend tidak bisa berbeda dari model yang sudah diverifikasi."""
import hashlib
import json
import logging
import os
import threading
import time

import cv2
import numpy as np

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
import keras  # noqa: E402

log = logging.getLogger("fer.ml")

IMG = 48
BERKAS_MODEL = ("model_a_seed1.keras", "resnet50_c2_seed3.keras")


def _sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for blok in iter(lambda: f.read(1 << 20), b""):
            h.update(blok)
    return h.hexdigest()


class PengenalEkspresi:
    def __init__(self, model_dir: str, verifikasi_sha: bool = True, max_wajah: int = 10, sisi_maks: int = 1280):
        t0 = time.perf_counter()
        self.model_dir = os.path.abspath(model_dir)
        with open(os.path.join(self.model_dir, "model_info.json"), encoding="utf-8") as f:
            self.info = json.load(f)

        if verifikasi_sha:   # pastikan berkas di container sama dengan berkas yang lolos Notebook 4
            for nama, meta in self.info["berkas"].items():
                sha = _sha256(os.path.join(self.model_dir, nama))
                if sha != meta["sha256"]:
                    raise RuntimeError(f"SHA-256 {nama} tidak cocok dengan model_info.json")
            log.info("SHA-256 ketiga berkas model cocok dengan model_info.json")

        self.kelas: list[str] = self.info["kelas"]
        self.tau: float = float(self.info["tau"])
        d = self.info["deteksi_wajah"]
        self.margin = float(d["margin"])
        self.ukuran_min = int(d["ukuran_min_px"])
        self.max_wajah, self.sisi_maks = max_wajah, sisi_maks

        self.model_a = keras.models.load_model(os.path.join(self.model_dir, BERKAS_MODEL[0]))
        self.model_r = keras.models.load_model(os.path.join(self.model_dir, BERKAS_MODEL[1]))
        self.detektor = cv2.FaceDetectorYN.create(os.path.join(self.model_dir, d["berkas"]), "", (320, 320),
                                                  float(d["skor_min"]), float(d["nms"]), 50)
        self._kunci = threading.Lock()      # detektor OpenCV dan model tidak dipakai bersamaan oleh dua request
        self.prediksi_batch(np.zeros((1, IMG, IMG, 1), dtype="float32"))     # pemanasan
        self.waktu_muat_s = time.perf_counter() - t0
        log.info("Model siap dalam %.1f s (tau=%.2f, margin=%.2f)", self.waktu_muat_s, self.tau, self.margin)

    # ---------- langkah-langkah ----------
    def deteksi(self, bgr: np.ndarray) -> list[tuple[int, int, int, int]]:
        self.detektor.setInputSize((bgr.shape[1], bgr.shape[0]))
        _, hasil = self.detektor.detect(bgr)
        if hasil is None:
            return []
        kotak = [tuple(int(round(v)) for v in d[:4]) for d in hasil]
        kotak = [k for k in kotak if min(k[2], k[3]) >= self.ukuran_min]
        kotak.sort(key=lambda k: k[2] * k[3], reverse=True)            # wajah terbesar dulu
        kotak = kotak[: self.max_wajah]
        return sorted(kotak, key=lambda k: k[0])                         # lalu urut dari kiri ke kanan

    def potong(self, abu: np.ndarray, kotak: tuple[int, int, int, int]) -> np.ndarray:
        """Potongan PERSEGI di tengah kotak, sisi = max(w, h) x (1 + 2*margin), lalu INTER_AREA ke 48x48."""
        x, y, w, h = kotak
        s = int(round(max(w, h) * (1 + 2 * self.margin)))
        x0, y0 = int(round(x + w / 2 - s / 2)), int(round(y + h / 2 - s / 2))
        bingkai = cv2.copyMakeBorder(abu, s, s, s, s, cv2.BORDER_REPLICATE)
        wajah = bingkai[y0 + s:y0 + 2 * s, x0 + s:x0 + 2 * s]
        wajah = cv2.resize(wajah, (IMG, IMG), interpolation=cv2.INTER_AREA)
        return wajah[..., None].astype("float32")                        # nilai 0-255, TANPA normalisasi

    def prediksi_batch(self, wajah: np.ndarray) -> np.ndarray:
        """Fitur unik 1: rata-rata probabilitas dua model."""
        pa = self.model_a(wajah, training=False)
        pr = self.model_r(wajah, training=False)
        return ((np.asarray(pa) + np.asarray(pr)) / 2).astype("float64")

    # ---------- alur lengkap ----------
    def kenali(self, bgr: np.ndarray) -> dict:
        t0 = time.perf_counter()
        tinggi, lebar = bgr.shape[:2]
        skala = min(1.0, self.sisi_maks / max(tinggi, lebar))           # foto besar diperkecil agar cepat
        kecil = cv2.resize(bgr, (round(lebar * skala), round(tinggi * skala)), interpolation=cv2.INTER_AREA) \
            if skala < 1 else bgr
        abu = cv2.cvtColor(kecil, cv2.COLOR_BGR2GRAY)

        with self._kunci:
            kotak = self.deteksi(kecil)
            prob = self.prediksi_batch(np.stack([self.potong(abu, k) for k in kotak])) if kotak else np.zeros((0, 7))

        wajah = []
        for i, (k, p) in enumerate(zip(kotak, prob)):
            top = int(p.argmax())
            jelas = bool(p[top] >= self.tau)                              # fitur unik 2: ambang keyakinan
            wajah.append({
                "index": i,
                "box": {n: int(round(v / skala)) for n, v in zip(("x", "y", "w", "h"), k)},   # koordinat foto asli
                "label": self.kelas[top] if jelas else None,
                "top_label": self.kelas[top],
                "confidence": round(float(p[top]), 4),
                "jelas": jelas,
                "probabilities": {self.kelas[j]: round(float(p[j]), 4) for j in range(len(self.kelas))},
            })
        return {"image_width": lebar, "image_height": tinggi, "faces": wajah,
                "duration_ms": round((time.perf_counter() - t0) * 1000, 1)}

    def ringkasan(self) -> dict:
        """Isi halaman 'Info Model' di frontend."""
        i = self.info
        return {
            "nama": i["nama"],
            "kelas": self.kelas,
            "tau": self.tau,
            "aturan_tau": i["aturan_tau"],
            "masukan": i["masukan"],
            "ensemble": i["ensemble"],
            "deteksi_wajah": i["deteksi_wajah"],
            "hasil_verifikasi": i["hasil_verifikasi"],
            "tau_0_5": i["tau_0_5"],
            "cpu_ms_per_wajah": i.get("cpu_ms_per_wajah"),
            "versi_pelatihan": i["versi"],
            "komponen": [
                {"nama": "Model A - CNN residual dari nol", "parameter": self.model_a.count_params(),
                 "ukuran_mb": i["berkas"]["model_a_seed1.keras"]["ukuran_mb"]},
                {"nama": "ResNet50 C2 - transfer learning (fine-tuning dalam)", "parameter": self.model_r.count_params(),
                 "ukuran_mb": i["berkas"]["resnet50_c2_seed3.keras"]["ukuran_mb"]},
            ],
            "dataset": "FER-2013 (Kaggle msambare/fer2013): 7 kelas, citra wajah grayscale 48x48",
        }
