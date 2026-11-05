import { PythonShell } from "python-shell";
import path from "path";
import fs from "fs";

export async function runNativePrediction(imageBuffer: Buffer): Promise<any> {
  const tempFilePath = path.join(process.cwd(), `temp_${Date.now()}.jpg`);
  fs.writeFileSync(tempFilePath, imageBuffer);

  try {
    const options = {
      mode: "text" as const,
      pythonPath: "python", // Pastikan path python di sistem kamu sesuai
      scriptPath: path.join(process.cwd(), "src", "services"),
      args: [tempFilePath],
    };

    const results = await PythonShell.run("predict_worker.py", options);
    if (!results || results.length === 0) {
      throw new Error("Worker Python tidak mengembalikan hasil.");
    }

    const parsedResult = JSON.parse(results[results.length - 1]);
    return parsedResult;
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath); // Bersihkan file temp otomatis
    }
  }
}
