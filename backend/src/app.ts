import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.router";
import predictRouter from "./routes/predict.router";
import historyRouter from "./routes/history.router";
import statsRouter from "./routes/stats.router";
import { mlService } from "./services/ml.service";

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api", predictRouter);
app.use("/api/history", historyRouter);
app.use("/api/stats", statsRouter);

// Health Check
app.get("/api/health", (_req, res) => {
  const modelReady = mlService.getIsLoaded();
  const status = modelReady ? "ok" : "degraded";
  res.status(modelReady ? 200 : 503).json({
    status,
    database: true,
    model: modelReady,
    versi_aplikasi: "1.0.0",
  });
});

export default app;
