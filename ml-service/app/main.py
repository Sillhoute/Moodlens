import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile

from app.inference import MODEL_SPECS, FerEngine, InvalidImageError

MAX_UPLOAD_BYTES = 6 * 1024 * 1024


@asynccontextmanager
async def lifespan(app):
    # Service baru menerima request setelah kedua model selesai dimuat.
    app.state.engine = FerEngine(os.environ.get("WEIGHTS_DIR", "weights"))
    yield


app = FastAPI(title="MoodLens ML Service", lifespan=lifespan)


@app.get("/health")
def health(request: Request):
    return {"status": "ok", "models": request.app.state.engine.model_names}


# Sengaja memakai def biasa: FastAPI menjalankannya di thread pool sehingga
# inferensi yang berat tidak menahan event loop dan healthcheck.
@app.post("/predict")
def predict(request: Request, image: UploadFile = File(...), models: str = Form("resnet")):
    model_names = [name.strip() for name in models.split(",") if name.strip()]
    unknown = [name for name in model_names if name not in MODEL_SPECS]
    if not model_names or unknown:
        raise HTTPException(400, f"Model harus salah satu dari: {', '.join(MODEL_SPECS)}")

    data = image.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Ukuran gambar terlalu besar")

    try:
        return request.app.state.engine.predict(data, list(dict.fromkeys(model_names)))
    except InvalidImageError as exc:
        raise HTTPException(400, str(exc)) from exc
