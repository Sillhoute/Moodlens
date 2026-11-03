"""Fitur 6: dashboard statistik ekspresi milik user."""
from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Prediction, PredictionFace, User
from ..security import user_saat_ini

router = APIRouter(prefix="/api/stats", tags=["Statistik"])


@router.get("")
def statistik(request: Request, hari: int = Query(14, ge=1, le=90),
              user: User = Depends(user_saat_ini), db: Session = Depends(get_db)):
    kelas = request.app.state.pengenal.kelas
    preds = db.execute(select(Prediction.id, Prediction.created_at, Prediction.source)
                       .where(Prediction.user_id == user.id)).all()
    faces = db.execute(select(PredictionFace.label, PredictionFace.confidence)
                       .join(Prediction).where(Prediction.user_id == user.id)).all()

    hitung = Counter(f.label or "kurang_jelas" for f in faces)
    jelas = [f.confidence for f in faces if f.label is not None]

    # jumlah prediksi per hari (zona waktu WIB) untuk grafik tren
    wib = timezone(timedelta(hours=7))
    hari_ini = datetime.now(wib).date()
    per_hari = Counter()
    for p in preds:
        t = p.created_at if p.created_at.tzinfo else p.created_at.replace(tzinfo=timezone.utc)
        per_hari[t.astimezone(wib).date()] += 1
    tren = [{"tanggal": (hari_ini - timedelta(days=i)).isoformat(), "jumlah": per_hari[hari_ini - timedelta(days=i)]}
            for i in range(hari - 1, -1, -1)]

    return {
        "total_prediksi": len(preds),
        "total_wajah": len(faces),
        "wajah_jelas": len(jelas),
        "wajah_kurang_jelas": hitung.get("kurang_jelas", 0),
        "rata_rata_keyakinan": round(sum(jelas) / len(jelas), 4) if jelas else None,
        "per_sumber": dict(Counter(p.source for p in preds)),
        "distribusi": [{"label": k, "jumlah": hitung.get(k, 0)} for k in kelas]
                      + [{"label": "kurang_jelas", "jumlah": hitung.get("kurang_jelas", 0)}],
        "ekspresi_terbanyak": max(kelas, key=lambda k: hitung.get(k, 0)) if jelas else None,
        "tren_harian": tren,
    }
