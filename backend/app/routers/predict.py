"""Fitur 2-4: pengenalan ekspresi dari unggah foto, webcam, dan banyak wajah sekaligus."""
import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from ..config import settings
from ..database import get_db
from ..models import Prediction, PredictionFace, User
from ..schemas import PrediksiOut
from ..security import user_saat_ini

router = APIRouter(prefix="/api", tags=["Pengenalan ekspresi"])


def ke_keluaran(pred: Prediction | None, hasil: dict, source: str) -> PrediksiOut:
    n = len(hasil["faces"])
    if n == 0:
        pesan = "Tidak ada wajah terdeteksi. Pastikan wajah menghadap kamera dan cukup terang."
    else:
        jelas = sum(f["jelas"] for f in hasil["faces"])
        pesan = f"{n} wajah terdeteksi, {jelas} dengan ekspresi jelas."
    return PrediksiOut(id=pred.id if pred else None, source=source, created_at=pred.created_at if pred else None,
                       n_faces=n, message=pesan, **hasil)


@router.post("/predict", response_model=PrediksiOut)
async def predict(request: Request,
                  file: UploadFile = File(..., description="Foto JPG/PNG/WebP"),
                  source: str = Form("upload", pattern="^(upload|webcam)$"),
                  user: User = Depends(user_saat_ini),
                  db: Session = Depends(get_db)):
    data = await file.read()
    if len(data) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, f"Ukuran foto maksimal {settings.MAX_UPLOAD_MB:g} MB")
    bgr = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR) if data else None
    if bgr is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Berkas bukan gambar yang valid (gunakan JPG, PNG, atau WebP)")

    pengenal = request.app.state.pengenal
    hasil = await run_in_threadpool(pengenal.kenali, bgr)          # inferensi berat di luar event loop

    pred = None
    if hasil["faces"]:                                            # hanya hasil (bukan foto) yang disimpan
        pred = Prediction(user_id=user.id, source=source, image_width=hasil["image_width"],
                          image_height=hasil["image_height"], n_faces=len(hasil["faces"]),
                          duration_ms=hasil["duration_ms"])
        for f in hasil["faces"]:
            b = f["box"]
            pred.faces.append(PredictionFace(face_index=f["index"], box_x=b["x"], box_y=b["y"], box_w=b["w"],
                                             box_h=b["h"], label=f["label"], top_label=f["top_label"],
                                             confidence=f["confidence"], probabilities=f["probabilities"]))
        db.add(pred)
        db.commit()
        db.refresh(pred)
    return ke_keluaran(pred, hasil, source)
