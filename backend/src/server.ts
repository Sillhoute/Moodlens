import dotenv from "dotenv";
dotenv.config();

import { spawnSync } from "child_process";
import app from "./app";
import { logger } from "./utils/logger";
import path from "path";

const PORT = parseInt(process.env.PORT || "8000", 10);
const pythonCmd = process.platform === "win32" ? "python" : "python3";

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

  if (result.status !== 0) {
    logger.error("SERVER", "Gagal menyiapkan environment Python.");
    process.exit(1);
  }
  logger.success("SERVER", "Lingkungan Python siap digunakan.");
}

function start() {
  try {
    // Jalankan pengecekan sekali di awal sebelum server nyala
    ensurePythonEnv();

    app.listen(PORT, () => {
      logger.success(
        "SERVER",
        `🚀 Bun server berjalan di http://localhost:${PORT}`,
      );
    });
  } catch (error) {
    logger.error("SERVER", "Gagal menjalankan server:", error);
    process.exit(1);
  }
}

start();
