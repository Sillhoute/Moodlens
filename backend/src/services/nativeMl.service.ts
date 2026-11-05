import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { logger } from "../utils/logger";

// Deteksi otomatis perintah python yang tersedia di server/OS
function getPythonCommand(): string {
  return process.platform === "win32" ? "python" : "python3";
}

export async function runNativePrediction(imageBuffer: Buffer): Promise<any> {
  const tempFilePath = path.join(process.cwd(), `temp_${Date.now()}.jpg`);
  fs.writeFileSync(tempFilePath, imageBuffer);
  logger.ml(`File sementara dibuat untuk inferensi: ${tempFilePath}`);

  try {
    const pythonExecutable = getPythonCommand();
    const scriptPath = path.join(
      process.cwd(),
      "src",
      "services",
      "predict_worker.py",
    );

    logger.ml(`Menjalankan worker Python (${pythonExecutable})...`);

    const resultData = await new Promise<string>((resolve, reject) => {
      const pythonProcess = spawn(pythonExecutable, [scriptPath, tempFilePath]);

      let stdoutData = "";
      let stderrData = "";

      pythonProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        const msg = data.toString().trim();
        if (msg) {
          logger.ml(`Worker Log: ${msg}`);
        }
      });

      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(`Python process exited with code ${code}: ${stderrData}`),
          );
        } else {
          resolve(stdoutData);
        }
      });

      pythonProcess.on("error", (err) => {
        reject(err);
      });
    });

    const lines = resultData.trim().split("\n");
    const jsonString = lines[lines.length - 1];

    const parsedResult = JSON.parse(jsonString);
    logger.success(
      "ML",
      `Inferensi selesai (${parsedResult.n_faces} wajah dikenali).`,
    );
    return parsedResult;
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      logger.ml("File sementara berhasil dibersihkan.");
    }
  }
}
