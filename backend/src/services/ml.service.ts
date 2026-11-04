import * as tf from "@tensorflow/tfjs";
import path from "path";

export const EMOTION_CLASSES = [
  "angry",
  "disgust",
  "fear",
  "happy",
  "sad",
  "surprise",
  "neutral",
];

export interface PredictionResult {
  topLabel: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export class EmotionClassifierService {
  private vanillaModel: tf.LayersModel | null = null;
  private resnetModel: tf.LayersModel | null = null;
  private isLoaded: boolean = false;

  async loadModels(modelBaseDir?: string): Promise<void> {
    if (this.isLoaded) return;

    const baseDir = modelBaseDir || path.join(process.cwd(), "src", "model");

    // Path model.json sesuai folder proyek
    const vanillaPath = `file://${path.join(baseDir, "vanila", "model.json")}`;
    const resnetPath = `file://${path.join(baseDir, "resnet", "model.json")}`;

    console.log("⚡ Memuat model ML TFJS...");
    this.vanillaModel = await tf.loadLayersModel(vanillaPath);
    this.resnetModel = await tf.loadLayersModel(resnetPath);
    this.isLoaded = true;
    console.log("✅ Model Vanilla CNN dan ResNet50 C2 berhasil dimuat.");
  }

  /**
   * Menginferensi ekspresi wajah dari 3D Tensor [H, W, 3]
   */
  predict(faceTensor: tf.Tensor3D): PredictionResult {
    if (!this.vanillaModel || !this.resnetModel) {
      throw new Error(
        "Model ML belum dimuat. Panggil loadModels() terlebih dahulu.",
      );
    }

    return tf.tidy(() => {
      // 1. Praproses untuk Model Vanilla CNN: (48x48, 1 Channel Grayscale, 0-255)
      const vanillaInput = tf.image
        .resizeBilinear(faceTensor, [48, 48])
        .mean(2) // RGB ke Grayscale: shape [48, 48]
        .expandDims(-1) // shape [48, 48, 1]
        .expandDims(0) // Batch shape [1, 48, 48, 1]
        .toFloat();

      // 2. Praproses untuk Model ResNet50 C2: (224x224, 3 Channel RGB, 0-255)
      const resnetInput = tf.image
        .resizeBilinear(faceTensor, [224, 224])
        .expandDims(0) // Batch shape [1, 224, 224, 3]
        .toFloat();

      // 3. Inferensi Ensemble (Rata-rata Probabilitas)
      const predVanilla = this.vanillaModel!.predict(vanillaInput) as tf.Tensor;
      const predResNet = this.resnetModel!.predict(resnetInput) as tf.Tensor;

      const ensembleTensor = tf.add(predVanilla, predResNet).div(2);
      const probsArray = Array.from(ensembleTensor.dataSync()); // Array Float 7 elemen

      // 4. Cari nilai probabilitas tertinggi & susun format output 7 kelas
      let maxConfidence = -1;
      let topIndex = 0;
      const probabilities: Record<string, number> = {};

      EMOTION_CLASSES.forEach((label, idx) => {
        const probVal = Number((probsArray[idx] || 0).toFixed(4));
        probabilities[label] = probVal;

        if (probVal > maxConfidence) {
          maxConfidence = probVal;
          topIndex = idx;
        }
      });

      return {
        topLabel: EMOTION_CLASSES[topIndex],
        confidence: maxConfidence,
        probabilities,
      };
    });
  }

  getIsLoaded(): boolean {
    return this.isLoaded;
  }
}

// Instance Singleton
export const mlService = new EmotionClassifierService();
