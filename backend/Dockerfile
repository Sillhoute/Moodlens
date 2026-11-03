# ---- Backend: FastAPI + TensorFlow (CPU) + OpenCV ----
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TF_CPP_MIN_LOG_LEVEL=2 \
    MODEL_DIR=/app/model_final

WORKDIR /app

# 1) Library dulu (lapisan ini di-cache selama requirements.txt tidak berubah)
COPY requirements.txt .
RUN pip install -r requirements.txt

# 2) Model hasil Notebook 4 (SHA-256 dicek saat backend menyala) lalu kode aplikasi
COPY model_final/ ./model_final/
COPY app/ ./app/

# 3) Jalankan sebagai user biasa, bukan root
RUN useradd --create-home --uid 1000 appuser && chown -R appuser /app
USER appuser

EXPOSE 8000
# Model butuh ±10-30 detik untuk dimuat, karena itu start-period dibuat longgar
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/api/health', timeout=4).status == 200 else 1)"

# Satu worker: setiap worker memuat kedua model (±1,5 GB RAM)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
