import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { prisma } from "../config/prisma";

// Urutan sama dengan EMOTION_CLASSES di predict_worker.py (urutan kelas saat training).
export const EMOTION_CLASSES = [
  "angry",
  "disgust",
  "fear",
  "happy",
  "neutral",
  "sad",
  "surprise",
];

export async function getStats(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;
  const hari = Math.min(
    Math.max(parseInt(String(req.query.hari || "14"), 10), 1),
    90,
  );

  const predictions = await prisma.prediction.findMany({
    where: { userId },
    select: {
      id: true,
      createdAt: true,
      source: true,
      faces: {
        select: {
          topLabel: true,
          confidence: true,
        },
      },
    },
  });

  const allFaces = predictions.flatMap((p) => p.faces);
  const totalPrediksi = predictions.length;
  const totalWajah = allFaces.length;

  const distributionMap: Record<string, number> = {};
  EMOTION_CLASSES.forEach((c) => (distributionMap[c] = 0));

  let totalConfidence = 0;
  allFaces.forEach((f) => {
    distributionMap[f.topLabel] = (distributionMap[f.topLabel] || 0) + 1;
    totalConfidence += f.confidence;
  });

  const rataRataKeyakinan =
    totalWajah > 0 ? Number((totalConfidence / totalWajah).toFixed(4)) : null;

  const perSumber: Record<string, number> = {};
  predictions.forEach((p) => {
    perSumber[p.source] = (perSumber[p.source] || 0) + 1;
  });

  let ekspresiTerbanyak: string | null = null;
  let maxCount = -1;
  Object.entries(distributionMap).forEach(([label, count]) => {
    if (count > maxCount && count > 0) {
      maxCount = count;
      ekspresiTerbanyak = label;
    }
  });

  const hariIni = new Date();
  const trenHarian: Array<{ tanggal: string; jumlah: number }> = [];

  for (let i = hari - 1; i >= 0; i--) {
    const d = new Date(hariIni);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    const count = predictions.filter((p) => {
      const predDate = new Date(p.createdAt).toISOString().split("T")[0];
      return predDate === dateStr;
    }).length;

    trenHarian.push({ tanggal: dateStr, jumlah: count });
  }

  return res.json({
    total_prediksi: totalPrediksi,
    total_wajah: totalWajah,
    rata_rata_keyakinan: rataRataKeyakinan,
    per_sumber: perSumber,
    distribusi: EMOTION_CLASSES.map((label) => ({
      label,
      jumlah: distributionMap[label] || 0,
    })),
    ekspresi_terbanyak: ekspresiTerbanyak,
    tren_harian: trenHarian,
  });
}
