"""Fitur 5: riwayat prediksi per user (lihat, hapus satu, hapus semua)."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Prediction, User
from ..schemas import PrediksiOut, RiwayatOut
from ..security import user_saat_ini

router = APIRouter(prefix="/api/history", tags=["Riwayat"])


def ke_keluaran(p: Prediction) -> PrediksiOut:
    faces = [{"index": f.face_index, "box": {"x": f.box_x, "y": f.box_y, "w": f.box_w, "h": f.box_h},
              "label": f.label, "top_label": f.top_label, "confidence": f.confidence, "jelas": f.label is not None,
              "probabilities": f.probabilities} for f in p.faces]
    jelas = sum(f["jelas"] for f in faces)
    return PrediksiOut(id=p.id, source=p.source, created_at=p.created_at, image_width=p.image_width or 0,
                       image_height=p.image_height or 0, n_faces=p.n_faces, duration_ms=p.duration_ms or 0,
                       faces=faces, message=f"{p.n_faces} wajah terdeteksi, {jelas} dengan ekspresi jelas.")


@router.get("", response_model=RiwayatOut)
def daftar(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0),
           user: User = Depends(user_saat_ini), db: Session = Depends(get_db)):
    total = db.scalar(select(func.count()).select_from(Prediction).where(Prediction.user_id == user.id))
    rows = db.scalars(select(Prediction).where(Prediction.user_id == user.id)
                      .options(selectinload(Prediction.faces))
                      .order_by(Prediction.created_at.desc(), Prediction.id.desc())
                      .limit(limit).offset(offset)).all()
    return RiwayatOut(total=total or 0, items=[ke_keluaran(p) for p in rows])


@router.delete("/{prediction_id}", status_code=status.HTTP_204_NO_CONTENT)
def hapus(prediction_id: int, user: User = Depends(user_saat_ini), db: Session = Depends(get_db)):
    p = db.get(Prediction, prediction_id)
    if p is None or p.user_id != user.id:              # milik user lain dianggap tidak ada
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Riwayat tidak ditemukan")
    db.delete(p)
    db.commit()


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def hapus_semua(user: User = Depends(user_saat_ini), db: Session = Depends(get_db)):
    for p in db.scalars(select(Prediction).where(Prediction.user_id == user.id)).all():
        db.delete(p)                                     # lewat ORM agar wajah ikut terhapus juga di SQLite
    db.commit()
