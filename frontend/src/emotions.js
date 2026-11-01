export const EMOTION_LABELS = {
  angry: 'Marah',
  disgust: 'Jijik',
  fear: 'Takut',
  happy: 'Senang',
  neutral: 'Netral',
  sad: 'Sedih',
  surprise: 'Terkejut',
};

export const MODEL_LABELS = {
  vanilla: 'Custom Residual CNN',
  resnet: 'ResNet50',
};

export const topEmotions = (probabilities, count = 3) =>
  Object.entries(probabilities)
    .map(([emotion, score]) => ({ emotion, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);

export const formatPercent = (score) => `${(score * 100).toFixed(1)}%`;

// Posisi kotak wajah dalam persen agar tetap pas saat gambar diskalakan oleh CSS.
// Pratinjau kamera ditampilkan seperti cermin, sehingga kotaknya ikut dibalik.
export const boxToPercent = (box, image, { mirrored = false } = {}) => {
  const left = (box.x / image.width) * 100;
  const width = (box.width / image.width) * 100;
  return {
    left: `${mirrored ? 100 - left - width : left}%`,
    top: `${(box.y / image.height) * 100}%`,
    width: `${width}%`,
    height: `${(box.height / image.height) * 100}%`,
  };
};
