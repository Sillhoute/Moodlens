import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { logger } from "../utils/logger";

function getPythonCommand(): string {
  // Path absolut ke python di dalam folder venv proyek
  const venvPython = path.join(process.cwd(), "venv", "bin", "python");
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  return "python3"; // Fallback ke sistem jika venv belum ada
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

    logger.ml(`Menjalankan worker Python via venv (${pythonExecutable})...`);

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
