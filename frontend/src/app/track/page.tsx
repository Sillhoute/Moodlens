/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { guestStorage, HistoryRecord } from "@/lib/guestStorage";
import {
  fetchHistory,
  fetchStats,
  deleteHistoryItem,
  clearAllHistory,
} from "@/lib/services";
import { showToast } from "@/lib/toast";
import { handleError } from "@/lib/error";
import {
  Activity,
  History,
  Trash2,
  Calendar,
  TrendingUp,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Sparkles,
} from "lucide-react";

// Interface untuk struktur data face / wajah dari backend
interface FaceResult {
  index: number;
  box: { x: number; y: number; w: number; h: number };
  top_label: string;
  confidence: number;
  probabilities: Record<string, number>;
  jelas: boolean;
}

// Interface untuk item prediksi dari API backend
interface PredictionItem {
  id: number;
  source?: string;
  created_at: string;
  faces?: FaceResult[];
}

// Interface untuk response API history
interface HistoryApiResponse {
  total: number;
  items: PredictionItem[];
}

// Interface untuk response API stats
interface StatsApiResponse {
  total_prediksi: number;
  total_wajah: number;
  rata_rata_keyakinan: number | null;
  ekspresi_terbanyak: string | null;
  distribusi: Array<{ label: string; jumlah: number }>;
  tren_harian: Array<{ tanggal: string; jumlah: number }>;
}

export default function TrackPage() {
  // Pakai status login, bukan objek session. Objek session dibuat ulang setiap kali
  // getSession() dipanggil (di setiap request API), sehingga kalau session dijadikan
  // dependensi, data akan terus dimuat ulang tanpa henti.
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";

  // State Statistik
  const [statsDays, setStatsDays] = useState<number>(14);
  const [statsData, setStatsData] = useState<StatsApiResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // State Riwayat (History) dengan Pagination & Limit
  const [historyItems, setHistoryItems] = useState<HistoryRecord[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLimit, setHistoryLimit] = useState<number>(10);
  const [historyOffset, setHistoryOffset] = useState<number>(0);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Load Statistik
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    if (isLoggedIn) {
      try {
        const res = (await fetchStats(statsDays)) as StatsApiResponse;
        setStatsData(res);
      } catch (err) {
        handleError(err);
      }
    } else {
      // Statistik untuk Mode Guest dari sessionStorage
      const localHistory = guestStorage.getHistory();
      const totalPrediksi = localHistory.length;
      let totalConf = 0;
      const distMap: Record<string, number> = {
        angry: 0,
        disgust: 0,
        fear: 0,
        happy: 0,
        sad: 0,
        surprise: 0,
        neutral: 0,
      };

      localHistory.forEach((item) => {
        distMap[item.predictedEmotion] =
          (distMap[item.predictedEmotion] || 0) + 1;
        totalConf += item.confidence;
      });

      const avgConf =
        totalPrediksi > 0
          ? Number((totalConf / totalPrediksi).toFixed(4))
          : null;

      let topEmo: string | null = null;
      let maxCnt = -1;
      Object.entries(distMap).forEach(([emo, cnt]) => {
        if (cnt > maxCnt && cnt > 0) {
          maxCnt = cnt;
          topEmo = emo;
        }
      });

      // Filter tren harian sesuai statsDays
      const today = new Date();
      const tren: Array<{ tanggal: string; jumlah: number }> = [];
      for (let i = statsDays - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const count = localHistory.filter((item) =>
          item.createdAt.startsWith(dateStr),
        ).length;
        tren.push({ tanggal: dateStr, jumlah: count });
      }

      setStatsData({
        total_prediksi: totalPrediksi,
        total_wajah: totalPrediksi,
        rata_rata_keyakinan: avgConf,
        ekspresi_terbanyak: topEmo,
        distribusi: Object.entries(distMap).map(([label, jumlah]) => ({
          label,
          jumlah,
        })),
        tren_harian: tren,
      });
    }
    setStatsLoading(false);
  }, [isLoggedIn, statsDays]);

  // Load Riwayat
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    if (isLoggedIn) {
      try {
        const res = (await fetchHistory(
          historyOffset,
          historyLimit,
        )) as HistoryApiResponse;
        const formatted: HistoryRecord[] = (res.items || []).map((p) => ({
          id: String(p.id),
          imagePreview: "",
          predictedEmotion: p.faces?.[0]?.top_label || "neutral",
          confidence: p.faces?.[0]?.confidence || 0,
          modelUsed: p.source === "webcam" ? "Webcam Stream" : "Image Upload",
          createdAt: p.created_at,
        }));
        setHistoryItems(formatted);
        setHistoryTotal(res.total || 0);
      } catch (err) {
        handleError(err);
      }
    } else {
      // Mode Guest dari sessionStorage
      const localHistory = guestStorage.getHistory();
      setHistoryTotal(localHistory.length);
      const sliced = localHistory.slice(
        historyOffset,
        historyOffset + historyLimit,
      );
      setHistoryItems(sliced);
    }
    setHistoryLoading(false);
  }, [isLoggedIn, historyOffset, historyLimit]);

  // Tunggu status login diketahui dulu, agar data Guest tidak sempat tampil sebelum data akun.
  useEffect(() => {
    if (status !== "loading") loadStats();
  }, [loadStats, status]);

  useEffect(() => {
    if (status !== "loading") loadHistory();
  }, [loadHistory, status]);

  // Hapus Satu Riwayat
  const handleDeleteItem = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus riwayat ini?")) return;
    if (isLoggedIn) {
      try {
        await deleteHistoryItem(parseInt(id, 10));
        showToast.success("Riwayat berhasil dihapus");
        loadHistory();
        loadStats();
      } catch (err) {
        handleError(err);
      }
    } else {
      const current = guestStorage.getHistory();
      const updated = current.filter((item) => item.id !== id);
      sessionStorage.setItem("fer_guest_history", JSON.stringify(updated));
      showToast.success("Riwayat berhasil dihapus");
      loadHistory();
      loadStats();
    }
  };

  // Bersihkan Semua Riwayat
  const handleClearAll = async () => {
    if (
      !confirm(
        "PERINGATAN: Semua riwayat prediksi akan dihapus permanen. Lanjutkan?",
      )
    )
      return;
    if (isLoggedIn) {
      try {
        await clearAllHistory();
        showToast.success("Semua riwayat berhasil dibersihkan");
        loadHistory();
        loadStats();
      } catch (err) {
        handleError(err);
      }
    } else {
      guestStorage.clearHistory();
      showToast.success("Semua riwayat berhasil dibersihkan");
      loadHistory();
      loadStats();
    }
  };

  const totalPages = Math.ceil(historyTotal / historyLimit) || 1;
  const currentPage = Math.floor(historyOffset / historyLimit) + 1;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gradient-brand">
            Tracking & Analisis Statistik
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pantau rekam jejak ekspresi wajah dan statistik performa sistem
            secara komprehensif.
          </p>
        </div>

        {/* Filter Hari untuk Statistik */}
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-sm">
          <Calendar className="h-4 w-4 text-primary ml-2" />
          <span className="text-xs font-semibold text-muted-foreground">
            Periode:
          </span>
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => setStatsDays(days)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statsDays === days
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {days} Hari
            </button>
          ))}
        </div>
      </div>

      {/* Ringkasan Statistik Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">
              Total Prediksi
            </span>
            <div className="text-2xl font-black text-foreground">
              {statsLoading ? "..." : statsData?.total_prediksi || 0}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">
              Emosi Dominan
            </span>
            <div className="text-2xl font-black text-gradient-brand capitalize">
              {statsLoading ? "..." : statsData?.ekspresi_terbanyak || "-"}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-2/10 text-accent-2">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">
              Rata-rata Keyakinan
            </span>
            <div className="text-2xl font-black text-success">
              {statsLoading
                ? "..."
                : statsData?.rata_rata_keyakinan !== null &&
                    statsData?.rata_rata_keyakinan !== undefined
                  ? `${(statsData.rata_rata_keyakinan * 100).toFixed(1)}%`
                  : "-"}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">
              Total Wajah Dideteksi
            </span>
            <div className="text-2xl font-black text-foreground">
              {statsLoading ? "..." : statsData?.total_wajah || 0}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Distribusi Emosi & Tren Harian */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Distribusi Kelas FER */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span>Distribusi 7 Kelas Emosi ({statsDays} Hari Terakhir)</span>
          </h2>
          {statsLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Memuat statistik...
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {statsData?.distribusi.map((item) => {
                const total = statsData.total_wajah || 1;
                const percentage = ((item.jumlah / total) * 100).toFixed(1);
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize font-semibold text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="font-bold text-foreground">
                        {item.jumlah} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-brand transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tren Harian */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent-2" />
            <span>Aktivitas Prediksi Harian</span>
          </h2>
          {statsLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Memuat tren...
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {statsData?.tren_harian.map((day) => (
                <div
                  key={day.tanggal}
                  className="flex items-center justify-between py-2 border-b border-border/40 text-xs"
                >
                  <span className="text-muted-foreground font-medium">
                    {day.tanggal}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-32 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(
                            (day.jumlah /
                              Math.max(
                                ...statsData.tren_harian.map((d) => d.jumlah),
                                1,
                              )) *
                              100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="font-bold text-foreground w-6 text-right">
                      {day.jumlah}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabel Riwayat Prediksi */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <span>Daftar Riwayat Prediksi</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Menampilkan total {historyTotal} riwayat tersimpan.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Pilihan Limit */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium">Tampil:</span>
              <select
                value={historyLimit}
                onChange={(e) => {
                  setHistoryLimit(parseInt(e.target.value, 10));
                  setHistoryOffset(0);
                }}
                className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {[10, 20, 30, 50, 100].map((l) => (
                  <option key={l} value={l}>
                    {l} Data
                  </option>
                ))}
              </select>
            </div>

            {historyItems.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive hover:text-white transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Bersihkan Semua</span>
              </button>
            )}
          </div>
        </div>

        {historyLoading ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            Memuat riwayat...
          </div>
        ) : historyItems.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              Belum ada riwayat prediksi yang tercatat.
            </p>
            <Link
              href="/prediction"
              className="inline-block text-xs font-semibold text-primary hover:underline"
            >
              Lakukan Prediksi Sekarang &rarr;
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase font-semibold">
                  <th className="py-3 px-4">ID / Waktu</th>
                  <th className="py-3 px-4">Sumber</th>
                  <th className="py-3 px-4">Emosi Terdeteksi</th>
                  <th className="py-3 px-4">Keyakinan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {historyItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground">
                        #{item.id}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground">
                        {item.modelUsed}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-extrabold capitalize text-gradient-brand">
                        {item.predictedEmotion}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-success">
                      {(item.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors"
                        title="Hapus Riwayat"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {historyTotal > historyLimit && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Menampilkan {historyOffset + 1} -{" "}
              {Math.min(historyOffset + historyLimit, historyTotal)} dari{" "}
              {historyTotal} total data
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setHistoryOffset(Math.max(0, historyOffset - historyLimit))
                }
                disabled={historyOffset === 0}
                className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Sebelumnya</span>
              </button>
              <span className="text-xs font-bold text-foreground px-2">
                Hal {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setHistoryOffset(historyOffset + historyLimit)}
                disabled={historyOffset + historyLimit >= historyTotal}
                className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
              >
                <span>Berikutnya</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
