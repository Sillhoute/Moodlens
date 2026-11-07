import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.router";
import predictRouter from "./routes/predict.router";
import historyRouter from "./routes/history.router";
import statsRouter from "./routes/stats.router";
import { requestLogger } from "./middlewares/logger.middleware";
import { prisma } from "./config/prisma";
import { isMlReady } from "./services/nativeMl.service";

const app = express();

app.use(cors());
app.use(express.json());

// Pasang Logger HTTP Request
app.use(requestLogger);

// Routes
app.use("/api/auth", authRouter);
app.use("/api", predictRouter);
app.use("/api/history", historyRouter);
app.use("/api/stats", statsRouter);

// Health Check: benar-benar mengecek database dan model, dipakai healthcheck container dan smoke test CI/CD.
app.get("/api/health", async (_req, res) => {
  const database = await prisma
    .$queryRaw`SELECT 1`.then(() => true)
    .catch(() => false);
  const model = isMlReady();
  const sehat = database && model;

  res.status(sehat ? 200 : 503).json({
    status: sehat ? "ok" : "degraded",
    database,
    model,
    versi_aplikasi: process.env.APP_VERSION || "dev",
  });
});

export default app;
