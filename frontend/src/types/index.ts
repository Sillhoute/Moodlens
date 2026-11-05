// --- USER & AUTH TYPES ---
export interface User {
  id: number;
  username: string;
  createdAt?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
  message?: string;
}

// --- PREDICTION TYPES ---
export interface FaceBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PredictionFace {
  index: number;
  box: FaceBox;
  top_label: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface PredictionResult {
  id: number | null;
  source: string;
  created_at: string | Date;
  image_width: number;
  image_height: number;
  n_faces: number;
  duration_ms: number;
  faces: PredictionFace[];
  message?: string;
}

// --- HISTORY TYPES ---
export interface HistoryFaceItem {
  index: number;
  box: FaceBox;
  top_label: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface HistoryItem {
  id: number;
  source: string;
  created_at: string;
  image_width: number;
  image_height: number;
  n_faces: number;
  duration_ms: number;
  faces: HistoryFaceItem[];
}

export interface HistoryResponse {
  total: number;
  items: HistoryItem[];
}

// --- STATS TYPES ---
export interface EmotionDistribution {
  label: string;
  jumlah: number;
}

export interface DailyTrend {
  tanggal: string;
  jumlah: number;
}

export interface StatsResponse {
  total_prediksi: number;
  total_wajah: number;
  rata_rata_keyakinan: number | null;
  per_sumber: Record<string, number>;
  distribusi: EmotionDistribution[];
  ekspresi_terbanyak: string | null;
  tren_harian: DailyTrend[];
}
