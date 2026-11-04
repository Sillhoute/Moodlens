import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { prisma } from "../config/prisma";
import { mlService } from "../services/ml.service";
import { FaceDetectorService } from "../services/face.service";

const faceDetector = new FaceDetectorService();

export async function predict(req: AuthenticatedRequest, res: Response) {
  if (!req.file) {
    return res.status(400).json({ message: "Berkas foto wajib diunggah" });
  }

  const source = (req.body.source || "upload").toLowerCase();
  const saveHistory =
    req.body.save_history !== "false" && req.body.save_history !== false;
  const t0 = Date.now();

  try {
    const { faces, imageWidth, imageHeight } =
      await faceDetector.detectAndCropFaces(req.file.buffer);

    if (faces.length === 0) {
      return res.json({
        id: null,
        source,
        n_faces: 0,
        image_width: imageWidth,
        image_height: imageHeight,
        duration_ms: Date.now() - t0,
        faces: [],
        message:
          "Tidak ada wajah terdeteksi. Pastikan wajah menghadap kamera dan cukup terang.",
      });
    }

    const faceResults = faces.map((f) => {
      const pred = mlService.predict(f.imageTensor);
      f.imageTensor.dispose(); // Bebaskan memori tensor
      return {
        index: f.index,
        box: f.box,
        top_label: pred.topLabel,
        confidence: pred.confidence,
        probabilities: pred.probabilities,
      };
    });

    const durationMs = Date.now() - t0;
    let predictionRecord = null;

    if (saveHistory) {
      predictionRecord = await prisma.prediction.create({
        data: {
          userId: req.user!.userId,
          source,
          imageWidth,
          imageHeight,
          nFaces: faces.length,
          durationMs,
          faces: {
            create: faceResults.map((fr) => ({
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
    }

    return res.json({
      id: predictionRecord ? predictionRecord.id : null,
      source,
      created_at: predictionRecord ? predictionRecord.createdAt : new Date(),
      image_width: imageWidth,
      image_height: imageHeight,
      n_faces: faces.length,
      duration_ms: durationMs,
      faces: faceResults,
      message: `${faces.length} wajah terdeteksi.`,
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: "Gagal memproses gambar", error: error.message });
  }
}
