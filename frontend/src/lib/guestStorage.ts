export interface HistoryRecord {
  id: string;
  imagePreview: string; // Base64 / URL gambar
  predictedEmotion: string;
  confidence: number;
  modelUsed: string;
  createdAt: string;
}

const GUEST_HISTORY_KEY = "fer_guest_history";

export const guestStorage = {
  getHistory(): HistoryRecord[] {
    if (typeof window === "undefined") return [];
    try {
      const data = sessionStorage.getItem(GUEST_HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addHistory(record: Omit<HistoryRecord, "id" | "createdAt">): HistoryRecord {
    const history = this.getHistory();
    const newRecord: HistoryRecord = {
      ...record,
      id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    // Simpan maksimal 20 item terbaru agar tidak membebani sessionStorage
    const updatedHistory = [newRecord, ...history].slice(0, 20);
    sessionStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(updatedHistory));
    return newRecord;
  },

  clearHistory(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(GUEST_HISTORY_KEY);
  },
};
