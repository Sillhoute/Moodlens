import dotenv from "dotenv";
dotenv.config();

import { spawnSync } from "child_process";
import app from "./app";
import { startNativeMlWorker, stopNativeMlWorker } from "./services/nativeMl.service";
import { logger } from "./utils/logger";
import path from "path";

const PORT = parseInt(process.env.PORT || "8000", 10);
const pythonCmd = path.join(
  process.cwd(),
  "venv",
  process.platform === "win32" ? "Scripts" : "bin",
  process.platform === "win32" ? "python.exe" : "python",
);

function ensurePythonEnv() {
  logger.info("SERVER", "Memeriksa lingkungan Python & pustaka ML...");
  const checkScript = path.join(
    process.cwd(),
    "src",
    "services",
    "check_env.py",
  );

  const result = spawnSync(pythonCmd, [checkScript], { encoding: "utf-8" });

  if (result.stderr) {
    console.error(result.stderr);
  }

  if (result.error) {
    logger.error(
      "SERVER",
      `Gagal menjalankan Python venv (${pythonCmd}):`,
      result.error,
    );
    process.exit(1);
  }

  if (result.status !== 0) {
    logger.error("SERVER", "Gagal menyiapkan environment Python.");
    process.exit(1);
  }
  logger.success("SERVER", "Lingkungan Python siap digunakan.");
}

async function start() {
  try {
    ensurePythonEnv();
    await startNativeMlWorker();

    const server = app.listen(PORT, () => {
      logger.success(
        "SERVER",
        `🚀 Bun server berjalan di http://localhost:${PORT}`,
      );
    });

    const shutdown = () => {
      server.close(() => {
        stopNativeMlWorker()
          .then(() => process.exit(0))
          .catch((error: unknown) => {
            logger.error("SERVER", "Gagal menghentikan Python ML worker:", error);
            process.exit(1);
          });
      });
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    logger.error("SERVER", "Gagal menjalankan server:", error);
    process.exit(1);
  }
}

void start();
