/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { guestStorage, HistoryRecord } from "@/lib/guestStorage";
import { fetchStats, fetchHistory } from "@/lib/services";
import { showToast } from "@/lib/toast";
import {
  ScanFace,
  Upload,
  Camera,
  Activity,
  History,
  ArrowRight,
  AlertTriangle,
  Lock,
  Clock,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

export default function OverviewPage() {
  const { data: session } = useSession();
  const [historyItems, setHistoryItems] = useState<HistoryRecord[]>([]);
  const [totalDetections, setTotalDetections] = useState<number>(0);
  const [topEmotion, setTopEmotion] = useState<string>("-");
  const [loading, setLoading] = useState(true);

  const loadOverviewData = async () => {
    setLoading(true);
    if (session) {
      try {
        const [historyRes, statsRes] = await Promise.all([
          fetchHistory(0, 5),
          fetchStats(14),
        ]);
        setHistoryItems(historyRes.data || []);
        setTotalDetections(statsRes.data?.total_prediksi || 0);
        setTopEmotion(statsRes.data?.emosi_dominan || "-");
      } catch {
        setHistoryItems([]);
      }
    } else {
      const localHistory = guestStorage.getHistory();
      setHistoryItems(localHistory.slice(0, 5));
      setTotalDetections(localHistory.length);

      if (localHistory.length > 0) {
        const counts: Record<string, number> = {};
        localHistory.forEach((item) => {
          counts[item.predictedEmotion] =
            (counts[item.predictedEmotion] || 0) + 1;
        });
        const sortedEmotions = Object.entries(counts).sort(
          (a, b) => b[1] - a[1],
        );
        setTopEmotion(sortedEmotions[0][0]);
      } else {
        setTopEmotion("-");
      }
    }
    setLoading(false);
  };

  // HANYA dipanggil sekali saat mount
  useEffect(() => {
    loadOverviewData();
  }, []);

  const handleRefresh = () => {
    loadOverviewData();
    showToast.success("Ringkasan diperbarui");
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-8 md:p-10 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
              <ScanFace className="h-3.5 w-3.5" />
              <span>FER-2013 Deep Learning Ensemble</span>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
              <span>Refresh</span>
            </button>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Pengenalan Ekspresi Wajah{" "}
            <span className="text-gradient-brand">Real-Time</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Sistem pengenalan ekspresi wajah berbasis kombinasi model Custom
            Residual CNN & ResNet50 Transfer Learning. Uji foto secara langsung
            atau simpan analisis riwayat Anda.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/prediction?mode=upload"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs md:text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all shadow-md"
            >
              <Upload className="h-4 w-4" />
              <span>Unggah Foto</span>
            </Link>
            <Link
              href="/prediction?mode=webcam"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/60 px-5 py-2.5 text-xs md:text-sm font-semibold text-foreground hover:bg-secondary transition-all"
            >
              <Camera className="h-4 w-4 text-accent-2" />
              <span>Kamera Langsung</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Banner Imbauan Guest */}
      {!session && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-warning/30 bg-warning/10 p-5 text-xs text-warning-foreground shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-bold text-sm text-foreground">
                Sesi Tamu (Data Sementara)
              </p>
              <p className="text-muted-foreground mt-0.5">
                Riwayat dan statistik deteksi tersimpan sementara di browser ini
                (`sessionStorage`) dan akan hilang jika tab ditutup.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-warning/20 hover:bg-warning/30 px-4 py-2 font-bold transition-colors whitespace-nowrap text-foreground"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Login untuk Simpan</span>
          </Link>
        </div>
      )}

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">
              Total Deteksi
            </span>
            <div className="text-2xl font-black text-foreground">
              {loading ? "..." : totalDetections}
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
              {loading ? "..." : topEmotion}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-2/10 text-accent-2">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-md flex items-center justify-between sm:col-span-2 md:col-span-1">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">
              Status Penyimpanan
            </span>
            <div className="text-sm font-bold text-foreground">
              {session ? (
                <span className="text-success flex items-center gap-1">
                  ● Database Tersambung
                </span>
              ) : (
                <span className="text-warning flex items-center gap-1">
                  ▲ Sesi Sementara (Browser)
                </span>
              )}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Ringkasan Riwayat Terbaru */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Aktivitas Terakhir
            </h2>
          </div>
          <Link
            href="/track"
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <span>Lihat Semua Track</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Memuat aktivitas...
          </div>
        ) : historyItems.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Belum ada aktivitas deteksi ekspresi.
            </p>
            <Link
              href="/prediction"
              className="inline-block text-xs font-semibold text-accent-2 hover:underline"
            >
              Coba Prediksi Sekarang &rarr;
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {historyItems.map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <span className="font-bold text-foreground capitalize">
                      {item.predictedEmotion}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      ({item.modelUsed || "Ensemble"})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="font-semibold text-success">
                    {(item.confidence * 100).toFixed(1)}%
                  </span>
                  <span>
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
