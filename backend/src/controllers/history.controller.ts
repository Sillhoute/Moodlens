import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { prisma } from "../config/prisma";

export async function getHistory(req: AuthenticatedRequest, res: Response) {
  const limit = Math.min(
    Math.max(parseInt(String(req.query.limit || "20"), 10), 1),
    100,
  );
  const offset = Math.max(parseInt(String(req.query.offset || "0"), 10), 0);

  const [total, items] = await Promise.all([
    prisma.prediction.count({ where: { userId: req.user!.userId } }),
    prisma.prediction.findMany({
      where: { userId: req.user!.userId },
      include: { faces: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
  ]);

  return res.json({
    total,
    items: items.map((p) => ({
      id: p.id,
      source: p.source,
      created_at: p.createdAt,
      image_width: p.imageWidth || 0,
      image_height: p.imageHeight || 0,
      n_faces: p.nFaces,
      duration_ms: p.durationMs || 0,
      faces: p.faces.map((f) => ({
        index: f.faceIndex,
        box: { x: f.boxX, y: f.boxY, w: f.boxW, h: f.boxH },
        top_label: f.topLabel,
        confidence: f.confidence,
        probabilities: f.probabilities,
      })),
    })),
  });
}

export async function deleteOneHistory(
  req: AuthenticatedRequest,
  res: Response,
) {
  const paramId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const id = parseInt(String(paramId), 10);

  const pred = await prisma.prediction.findFirst({
    where: { id, userId: req.user!.userId },
  });

  if (!pred) {
    return res.status(404).json({ message: "Riwayat tidak ditemukan" });
  }

  await prisma.prediction.delete({ where: { id } });
  return res.status(204).send();
}

export async function deleteAllHistory(
  req: AuthenticatedRequest,
  res: Response,
) {
  await prisma.prediction.deleteMany({
    where: { userId: req.user!.userId },
  });
  return res.status(204).send();
}
