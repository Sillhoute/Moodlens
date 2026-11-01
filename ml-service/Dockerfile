FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    TF_CPP_MIN_LOG_LEVEL=2 \
    OPENCV_IO_MAX_IMAGE_PIXELS=50000000 \
    WEIGHTS_DIR=/app/weights

WORKDIR /app

# Dependency dipasang lebih dulu agar layer TensorFlow yang besar tetap ter-cache
# selama requirements.txt tidak berubah.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY weights ./weights
COPY app ./app

RUN useradd --create-home appuser
USER appuser
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
