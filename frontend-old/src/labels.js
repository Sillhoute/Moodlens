export const EMOTION_LABELS = {
  angry: 'Marah',
  disgust: 'Jijik',
  fear: 'Takut',
  happy: 'Senang',
  neutral: 'Netral',
  sad: 'Sedih',
  surprise: 'Terkejut',
  kurang_jelas: 'Kurang jelas',
};

// Satu warna per ekspresi agar kotak wajah, grafik, dan riwayat mudah dicocokkan.
export const EMOTION_COLORS = {
  angry: '#f87171',
  disgust: '#a3e635',
  fear: '#c084fc',
  happy: '#facc15',
  neutral: '#94a3b8',
  sad: '#60a5fa',
  surprise: '#fb923c',
  kurang_jelas: '#64748b',
};

export const SOURCE_LABELS = { upload: 'Unggah foto', webcam: 'Webcam' };

// Wajah dengan keyakinan di bawah ambang tau dikirim backend dengan label null.
export const faceLabel = (face) => (face.label ? EMOTION_LABELS[face.label] : EMOTION_LABELS.kurang_jelas);

export const faceColor = (face) => EMOTION_COLORS[face.label ?? 'kurang_jelas'];

export const topProbabilities = (probabilities, count = 3) =>
  Object.entries(probabilities)
    .map(([emotion, score]) => ({ emotion, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);

export const formatPercent = (score) => `${(score * 100).toFixed(1)}%`;

export const formatNumber = (value) => new Intl.NumberFormat('id-ID').format(value);

export const initials = (user) =>
  (user.full_name || user.username)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

// Posisi kotak wajah dalam persen agar tetap pas saat gambar diskalakan oleh CSS.
export const boxToPercent = (box, width, height, { mirrored = false } = {}) => ({
  left: `${((mirrored ? width - box.x - box.w : box.x) / width) * 100}%`,
  top: `${(box.y / height) * 100}%`,
  width: `${(box.w / width) * 100}%`,
  height: `${(box.h / height) * 100}%`,
});
