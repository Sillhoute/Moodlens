import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.router";
import predictRouter from "./routes/predict.router";
import historyRouter from "./routes/history.router";
import statsRouter from "./routes/stats.router";
import { requestLogger } from "./middlewares/logger.middleware";

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

// Health Check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    database: true,
    model: true,
    versi_aplikasi: "1.0.0",
  });
});

export default app;
