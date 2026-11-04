import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { mlService } from "./services/ml.service";

const PORT = parseInt(process.env.PORT || "8000", 10);

async function start() {
  try {
    // Memuat Model ML sebelum server mendengarkan port
    await mlService.loadModels();

    app.listen(PORT, () => {
      console.log(
        `🚀 Server Backend TS Express berjalan di http://localhost:${PORT}`,
      );
    });
  } catch (error) {
    console.error("❌ Gagal menjalankan server:", error);
    process.exit(1);
  }
}

start();
