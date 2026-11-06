import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import readline from "readline";
import path from "path";
import fs from "fs";
import os from "os";
import { logger } from "../utils/logger";

// Satu prediksi tidak boleh menggantung selamanya kalau worker macet.
const PREDICTION_TIMEOUT_MS = 60_000;

export function getPythonCommand(): string {
  // Path absolut ke python di dalam folder venv proyek (Windows memakai folder Scripts)
  const venvPython =
    process.platform === "win32"
      ? path.join(process.cwd(), "venv", "Scripts", "python.exe")
      : path.join(process.cwd(), "venv", "bin", "python");
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  return process.platform === "win32" ? "python" : "python3"; // Fallback ke sistem jika venv belum ada
}

/*
 * Worker Python dijalankan SEKALI saat server menyala dan tetap hidup.
 * TensorFlow dan kedua model hanya dimuat satu kali, lalu setiap request cukup
 * mengirim path gambar lewat stdin dan membaca satu baris JSON dari stdout.
 */
let worker: ChildProcessWithoutNullStreams | null = null;
let workerReady = false;
let startPromise: Promise<void> | null = null;
// Fungsi yang menunggu jawaban untuk request yang sedang diproses worker.
let waitingForAnswer: ((line: string) => void) | null = null;
// Antrean agar request diproses satu per satu (worker membaca satu gambar sekali waktu).
let queue: Promise<unknown> = Promise.resolve();

export function isMlReady(): boolean {
  return workerReady;
}

export function startMlWorker(): Promise<void> {
  if (startPromise) return startPromise;

  startPromise = new Promise<void>((resolve, reject) => {
    const scriptPath = path.join(
      process.cwd(),
      "src",
      "services",
      "predict_worker.py",
    );
    logger.ml(`Menyalakan worker Python (${getPythonCommand()})...`);

    const proc = spawn(getPythonCommand(), [scriptPath, "--serve"]);
    worker = proc;

    readline.createInterface({ input: proc.stdout }).on("line", (line) => {
      if (!workerReady) {
        // Baris pertama dari worker adalah {"ready": true} setelah model selesai dimuat.
        if (line.includes('"ready"')) {
          workerReady = true;
          logger.success("ML", "Worker Python siap, model sudah dimuat.");
          resolve();
        }
        return;
      }
      const answer = waitingForAnswer;
      waitingForAnswer = null;
      answer?.(line);
    });

    proc.stderr.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg) {
        logger.ml(`Worker Log: ${msg}`);
      }
    });

    proc.on("error", (err) => {
      logger.error("ML", "Gagal menjalankan worker Python:", err);
    });

    proc.on("close", (code) => {
      logger.warn("ML", `Worker Python berhenti (kode ${code}).`);
      workerReady = false;
      worker = null;
      startPromise = null; // request berikutnya akan menyalakan worker lagi
      waitingForAnswer?.(JSON.stringify({ error: "Worker Python berhenti" }));
      waitingForAnswer = null;
      reject(new Error(`Worker Python berhenti sebelum siap (kode ${code})`));
    });
  });

  return startPromise;
}

async function predictOnce(imageBuffer: Buffer): Promise<any> {
  await startMlWorker();

  // File sementara disimpan di folder temp sistem, bukan di folder proyek.
  const tempFilePath = path.join(
    os.tmpdir(),
    `fer_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
  );
  fs.writeFileSync(tempFilePath, imageBuffer);
  logger.ml(`File sementara dibuat untuk inferensi: ${tempFilePath}`);

  try {
    const line = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        waitingForAnswer = null;
        worker?.kill(); // worker macet: matikan, nanti dinyalakan ulang otomatis
        reject(new Error("Prediksi melebihi batas waktu"));
      }, PREDICTION_TIMEOUT_MS);

      waitingForAnswer = (answer) => {
        clearTimeout(timer);
        resolve(answer);
      };
      worker!.stdin.write(`${tempFilePath}\n`);
    });

    const parsedResult = JSON.parse(line);
    if (parsedResult.error) {
      throw new Error(parsedResult.error);
    }
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

export function runNativePrediction(imageBuffer: Buffer): Promise<any> {
  const job = queue.then(() => predictOnce(imageBuffer));
  queue = job.catch(() => undefined); // satu request gagal tidak menghentikan antrean
  return job;
}
