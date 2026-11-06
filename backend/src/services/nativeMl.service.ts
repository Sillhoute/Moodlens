import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs";
import path from "path";
import { createInterface, type Interface as ReadLineInterface } from "readline";
import { logger } from "../utils/logger";

export type PredictionModel = "vanilla" | "resnet50" | "ensemble";

interface NativePredictionFace {
  index: number;
  box: { x: number; y: number; w: number; h: number };
  top_label: string;
  confidence: number;
  probabilities: Record<string, number>;
  jelas: boolean;
}

export interface NativePredictionResult {
  image_width: number;
  image_height: number;
  n_faces: number;
  faces: NativePredictionFace[];
  message: string;
  duration_ms?: number;
  source?: string;
  id?: number;
  created_at?: string | Date;
}

interface WorkerResponse extends Partial<NativePredictionResult> {
  ready?: boolean;
  error?: string;
}

interface PendingPrediction {
  resolve: (result: NativePredictionResult) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

interface MlWorker {
  child: ChildProcessWithoutNullStreams;
  lines: ReadLineInterface;
  ready: boolean;
  failed: boolean;
  readyPromise: Promise<void>;
  resolveReady: () => void;
  rejectReady: (error: Error) => void;
  startupTimeout: NodeJS.Timeout;
  pending: PendingPrediction | null;
}

const STARTUP_TIMEOUT_MS = 120_000;
const PREDICTION_TIMEOUT_MS = 60_000;
let worker: MlWorker | null = null;
let predictionQueue = Promise.resolve();

function getPythonCommand(): string {
  const isWin = process.platform === "win32";
  const venvPython = isWin
    ? path.join(process.cwd(), "venv", "Scripts", "python.exe")
    : path.join(process.cwd(), "venv", "bin", "python");

  if (fs.existsSync(venvPython)) return venvPython;
  return isWin ? "python" : "python3";
}

function failWorker(state: MlWorker, error: Error): void {
  if (state.failed) return;
  state.failed = true;
  clearTimeout(state.startupTimeout);
  if (worker === state) worker = null;

  state.rejectReady(error);
  if (state.pending) {
    clearTimeout(state.pending.timeout);
    state.pending.reject(error);
    state.pending = null;
  }
  if (!state.child.killed) state.child.kill();
}

function startWorker(): MlWorker {
  if (worker) return worker;

  const pythonExecutable = getPythonCommand();
  const scriptPath = path.join(
    process.cwd(),
    "src",
    "services",
    "predict_worker.py",
  );
  const child = spawn(pythonExecutable, [scriptPath], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });
  const lines = createInterface({ input: child.stdout });
  let resolveReady!: () => void;
  let rejectReady!: (error: Error) => void;
  const readyPromise = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const state: MlWorker = {
    child,
    lines,
    ready: false,
    failed: false,
    readyPromise,
    resolveReady,
    rejectReady,
    startupTimeout: setTimeout(
      () => failWorker(state, new Error("Python ML worker startup timed out")),
      STARTUP_TIMEOUT_MS,
    ),
    pending: null,
  };
  worker = state;

  lines.on("line", (line) => {
    let response: WorkerResponse;
    try {
      response = JSON.parse(line) as WorkerResponse;
    } catch {
      failWorker(state, new Error("Python ML worker returned invalid JSON"));
      return;
    }

    if (!state.ready) {
      if (response.ready === true) {
        state.ready = true;
        clearTimeout(state.startupTimeout);
        state.resolveReady();
        logger.success("ML", "Python ML worker siap; model sudah dimuat.");
      } else {
        failWorker(
          state,
          new Error(response.error || "Python ML worker gagal diinisialisasi"),
        );
      }
      return;
    }

    const pending = state.pending;
    if (!pending) {
      failWorker(state, new Error("Python ML worker returned an unexpected response"));
      return;
    }
    clearTimeout(pending.timeout);
    state.pending = null;
    if (response.error) {
      pending.reject(new Error(response.error));
    } else {
      pending.resolve(response as NativePredictionResult);
    }
  });

  child.stderr.on("data", (data: Buffer) => {
    const message = data.toString().trim();
    if (message) logger.ml(message);
  });

  child.once("error", (error) => {
    failWorker(state, new Error(`Gagal menjalankan Python ML worker: ${error.message}`));
  });
  child.once("exit", (code, signal) => {
    if (!state.failed) {
      failWorker(
        state,
        new Error(`Python ML worker berhenti (code ${code}, signal ${signal})`),
      );
    }
  });

  logger.ml(`Memulai Python ML worker (${pythonExecutable})...`);
  return state;
}

async function getReadyWorker(): Promise<MlWorker> {
  const state = startWorker();
  await state.readyPromise;
  if (worker !== state || state.failed) return getReadyWorker();
  return state;
}

function sendPrediction(
  state: MlWorker,
  imageBuffer: Buffer,
  model: PredictionModel,
): Promise<NativePredictionResult> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => failWorker(state, new Error("Prediksi melewati batas waktu")),
      PREDICTION_TIMEOUT_MS,
    );
    state.pending = { resolve, reject, timeout };
    const request = JSON.stringify({
      image: imageBuffer.toString("base64"),
      model,
    });
    state.child.stdin.write(`${request}\n`, "utf8", (error) => {
      if (error) failWorker(state, error);
    });
  });
}

// Dipakai /api/health: model dianggap siap kalau worker sudah memuat kedua model.
export function isMlReady(): boolean {
  return Boolean(worker?.ready && !worker.failed);
}

export async function startNativeMlWorker(): Promise<void> {
  await getReadyWorker();
}

export async function stopNativeMlWorker(): Promise<void> {
  const state = worker;
  if (!state) return;
  worker = null;
  state.failed = true;
  clearTimeout(state.startupTimeout);
  state.rejectReady(new Error("Python ML worker dihentikan"));
  if (state.pending) {
    clearTimeout(state.pending.timeout);
    state.pending.reject(new Error("Python ML worker dihentikan"));
    state.pending = null;
  }
  state.lines.close();
  state.child.kill();
}

export function runNativePrediction(
  imageBuffer: Buffer,
  model: PredictionModel = "resnet50",
): Promise<NativePredictionResult> {
  const prediction = predictionQueue.then(async () => {
    const state = await getReadyWorker();
    const result = await sendPrediction(state, imageBuffer, model);
    logger.success("ML", `Inferensi selesai dengan model ${model}.`);
    return result;
  });
  predictionQueue = prediction.then(
    () => undefined,
    () => undefined,
  );
  return prediction;
}
