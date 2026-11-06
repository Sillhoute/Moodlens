import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { prisma } from "../config/prisma";
import {
  runNativePrediction,
  type PredictionModel,
} from "../services/nativeMl.service";

function isPredictionModel(value: unknown): value is PredictionModel {
  return value === "vanilla" || value === "resnet50" || value === "ensemble";
}

export async function predict(req: AuthenticatedRequest, res: Response) {
  if (!req.file) {
    return res.status(400).json({ message: "Berkas foto wajib diunggah" });
  }

  const requestedModel: unknown = req.body?.model ?? "resnet50";
  if (!isPredictionModel(requestedModel)) {
    return res.status(400).json({
      message: "Model harus vanilla, resnet50, atau ensemble",
    });
  }

  const source = (req.body.source || "upload").toLowerCase();
  const saveHistoryRequested = req.body.save_history !== "false";
  const shouldSaveHistory = Boolean(saveHistoryRequested && req.user?.userId);

  const t0 = Date.now();

  try {
    const hasil = await runNativePrediction(req.file.buffer, requestedModel);
    const durationMs = Date.now() - t0;
    hasil.duration_ms = durationMs;
    hasil.source = source;

    let predictionRecord = null;
    if (shouldSaveHistory && req.user?.userId && hasil.faces.length > 0) {
      predictionRecord = await prisma.prediction.create({
        data: {
          userId: req.user.userId,
          source,
          imageWidth: hasil.image_width,
          imageHeight: hasil.image_height,
          nFaces: hasil.n_faces,
          durationMs,
          faces: {
            create: hasil.faces.map((fr) => ({
              faceIndex: fr.index,
              boxX: fr.box.x,
              boxY: fr.box.y,
              boxW: fr.box.w,
              boxH: fr.box.h,
              topLabel: fr.top_label,
              confidence: fr.confidence,
              probabilities: fr.probabilities,
            })),
          },
        },
      });
      hasil.id = predictionRecord.id;
      hasil.created_at = predictionRecord.createdAt;
    }

    return res.json(hasil);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Kesalahan tidak diketahui";
    console.error("Error menjalankan native model:", message);
    return res
      .status(500)
      .json({ message: "Gagal memproses prediksi", error: message });
  }
}
