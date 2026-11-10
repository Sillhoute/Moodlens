/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  Suspense,
} from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { guestStorage } from "@/lib/guestStorage";
import { predictImage } from "@/lib/services";
import { showToast } from "@/lib/toast";
import { handleError } from "@/lib/error";
import { PredictionResult } from "@/types";
import {
  Upload,
  Camera,
  Video,
  ScanFace,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Layers,
  VideoOff,
  Play,
  Square,
  Loader2,
  CameraIcon,
  ShieldAlert,
  Info,
  RotateCcw,
} from "lucide-react";

const LIVE_INTERVAL_MS = 50;
const LIVE_FRAME_WIDTH = 640;

function FaceBoxOverlay({
  faces,
  imageWidth,
  imageHeight,
  fit,
  mirrored = false,
}: {
  faces: PredictionResult["faces"];
  imageWidth: number;
  imageHeight: number;
  fit: "meet" | "slice";
  mirrored?: boolean;
}) {
  const fontSize = Math.max(14, imageWidth * 0.025);

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full pointer-events-none"
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      preserveAspectRatio={`xMidYMid ${fit}`}
    >
      {faces.map((face) => {
        const left = mirrored
          ? imageWidth - face.box.x - face.box.w
          : face.box.x;
        return (
          <g key={face.index}>
            <rect
              x={left}
              y={face.box.y}
              width={face.box.w}
              height={face.box.h}
              fill="rgba(124, 58, 237, 0.12)"
              stroke="#8b5cf6"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
              rx="4"
            />
            <text
              x={left}
              y={Math.max(fontSize, face.box.y - fontSize * 0.4)}
              fill="#ffffff"
              fontSize={fontSize}
              fontWeight="700"
              paintOrder="stroke"
              stroke="#6d28d9"
              strokeWidth="4"
              strokeLinejoin="round"
            >
              #{face.index + 1} {face.top_label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function PredictionContent() {
  // Pakai status login, bukan objek session: objek session dibuat ulang di setiap request,
  // sehingga loop webcam akan ter-reset dan mengirim request tanpa jeda.
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  const searchParams = useSearchParams();

  const initialMode = searchParams.get("mode");
  const defaultTab =
    initialMode === "webcam" || initialMode === "realtime"
      ? "realtime"
      : initialMode === "capture"
        ? "capture"
        : "upload";

  const [activeTab, setActiveTab] = useState<"upload" | "capture" | "realtime">(
    defaultTab,
  );

  const [selectedModel, setSelectedModel] = useState<
    "ensemble" | "vanilla" | "resnet50"
  >("ensemble");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const [isRealtime, setIsRealtime] = useState(false);
  const isAnalyzingRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  const stopRealtime = useCallback(() => {
    setIsRealtime(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    isAnalyzingRef.current = false;
  }, []);

  const stopCamera = useCallback(() => {
    stopRealtime();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, [stopRealtime]);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch {
      showToast.error(
        "Gagal mengakses kamera. Pastikan izin kamera telah diberikan.",
      );
      setIsCameraActive(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    stopCamera();
    setPreviewUrl(null);
    setPrediction(null);
    return () => {
      stopCamera();
    };
  }, [activeTab, stopCamera]);

  const captureSnapshot = useCallback(
    (realtime = false): Promise<File | null> => {
      return new Promise((resolve) => {
        const video = videoRef.current;
        if (!video || !video.videoWidth || video.readyState < 2) {
          return resolve(null);
        }

        const scale = realtime
          ? Math.min(1, LIVE_FRAME_WIDTH / video.videoWidth)
          : 1;
        const canvas =
          captureCanvasRef.current ?? document.createElement("canvas");
        captureCanvasRef.current = canvas;
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);

        ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (!realtime) {
          setPreviewUrl(canvas.toDataURL("image/jpeg", 0.9));
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], "snapshot.jpg", {
                type: "image/jpeg",
              });
              resolve(file);
            } else {
              resolve(null);
            }
          },
          "image/jpeg",
          realtime ? 0.8 : 0.9,
        );
      });
    },
    [],
  );

  const runAnalysis = useCallback(
    async (isLooping = false) => {
      if (isAnalyzingRef.current && isLooping) return;

      let fileToUpload: File | null = null;
      let source: "upload" | "webcam" = "upload";

      if (activeTab === "upload") {
        if (!selectedFile) return;
        fileToUpload = selectedFile;
        source = "upload";
      } else if (activeTab === "capture") {
        fileToUpload = await captureSnapshot();
        source = "webcam";
        stopCamera();
      } else {
        fileToUpload = await captureSnapshot(true);
        source = "webcam";
      }

      if (!fileToUpload) return;

      isAnalyzingRef.current = true;
      if (!isLooping) setIsAnalyzing(true);

      try {
        const saveHistory = Boolean(isLoggedIn && !isLooping);
        const result = await predictImage(
          fileToUpload,
          source,
          saveHistory,
          selectedModel,
        );
        setPrediction(result);

        if (!isLoggedIn && !isLooping && result.n_faces > 0) {
          const mainFace = result.faces[0];
          if (mainFace && previewUrl) {
            guestStorage.addHistory({
              imagePreview: previewUrl,
              predictedEmotion: mainFace.top_label,
              confidence: mainFace.confidence,
              modelUsed:
                selectedModel === "resnet50"
                  ? "ResNet50"
                  : selectedModel === "vanilla"
                    ? "Vanilla CNN"
                    : "Ensemble",
            });
          }
        }
      } catch (err) {
        if (!isLooping) handleError(err);
      } finally {
        isAnalyzingRef.current = false;
        if (!isLooping) setIsAnalyzing(false);
      }
    },
    [
      activeTab,
      captureSnapshot,
      previewUrl,
      selectedFile,
      selectedModel,
      isLoggedIn,
      stopCamera,
    ],
  );

  useEffect(() => {
    let isActive = true;

    const loop = async () => {
      if (
        !isActive ||
        !isRealtime ||
        activeTab !== "realtime" ||
        !isCameraActive
      ) {
        return;
      }
      await runAnalysis(true);
      if (isActive && isRealtime) {
        timerRef.current = setTimeout(loop, LIVE_INTERVAL_MS);
      }
    };

    if (isRealtime && isCameraActive && activeTab === "realtime") {
      loop();
    }

    return () => {
      isActive = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRealtime, isCameraActive, activeTab, runAnalysis]);

  const toggleRealtime = () => {
    if (!isCameraActive) {
      showToast.error("Buka kamera terlebih dahulu.");
      return;
    }
    if (isRealtime) {
      stopRealtime();
      showToast.info("Deteksi Real-Time dihentikan.");
    } else {
      setIsRealtime(true);
      showToast.success("Deteksi Real-Time diaktifkan.");
    }
  };

  const handleReset = () => {
    stopCamera();
    setSelectedFile(null);
    setPreviewUrl(null);
    setPrediction(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast.error("Unggah berkas gambar yang valid (JPG, PNG, WebP).");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    setPrediction(null);
  };

  const mainFace =
    prediction?.faces && prediction.faces.length > 0
      ? prediction.faces[0]
      : null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gradient-brand">
            Prediction Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deteksi 7 jenis ekspresi wajah menggunakan model Deep Learning.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-sm self-start md:self-auto">
          <Layers className="h-4 w-4 text-primary ml-2" />
          <span className="text-xs font-semibold text-muted-foreground mr-1 hidden sm:inline">
            Model:
          </span>
          <button
            onClick={() => setSelectedModel("ensemble")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedModel === "ensemble"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Ensemble (63%)
          </button>
          <button
            onClick={() => setSelectedModel("resnet50")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedModel === "resnet50"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ResNet50 (62%)
          </button>
          <button
            onClick={() => setSelectedModel("vanilla")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedModel === "vanilla"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Vanilla CNN (51%)
          </button>
        </div>
      </div>

      <div className="flex rounded-2xl border border-border bg-card p-1 shadow-md max-w-lg mx-auto">
        <button
          onClick={() => setActiveTab("upload")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "upload"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="h-4 w-4" />
          <span>Unggah Berkas</span>
        </button>
        <button
          onClick={() => setActiveTab("capture")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "capture"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Camera className="h-4 w-4" />
          <span>Ambil Foto</span>
        </button>
        <button
          onClick={() => setActiveTab("realtime")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "realtime"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Video className="h-4 w-4" />
          <span>Real-Time</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ScanFace className="h-4 w-4 text-accent-2" />
              <span>
                {activeTab === "upload"
                  ? "Unggah Berkas Gambar"
                  : activeTab === "capture"
                    ? "Kamera (Ambil Foto)"
                    : "Kamera (Real-Time Streaming)"}
              </span>
            </span>
            {activeTab === "realtime" && isRealtime && (
              <span className="flex items-center gap-1.5 rounded-full bg-success/20 px-2.5 py-0.5 text-[10px] font-bold text-success animate-pulse">
                ● Live Real-Time
              </span>
            )}
          </h2>

          {activeTab === "upload" && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center min-h-[260px] transition-all cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/10"
                  : previewUrl
                    ? "border-border/60 bg-black/20"
                    : "border-border hover:border-primary/50 bg-secondary/20"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />

              {previewUrl ? (
                <div className="relative w-full h-64 rounded-xl overflow-hidden group flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview Wajah"
                    className="max-w-full max-h-full object-contain rounded-xl"
                  />
                  {prediction && (
                    <FaceBoxOverlay
                      faces={prediction.faces}
                      imageWidth={prediction.image_width}
                      imageHeight={prediction.image_height}
                      fit="meet"
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Tarik & letakkan foto di sini, atau klik untuk memilih
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Format terdukung: JPG, PNG, WebP (Maksimal 5MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "capture" && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-border">
                {previewUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Captured Snapshot"
                      className="w-full h-full object-contain"
                    />
                    {prediction && (
                      <FaceBoxOverlay
                        faces={prediction.faces}
                        imageWidth={prediction.image_width}
                        imageHeight={prediction.image_height}
                        fit="meet"
                      />
                    )}
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover -scale-x-100 ${
                      !isCameraActive ? "hidden" : ""
                    }`}
                  />
                )}

                {!isCameraActive && !previewUrl && (
                  <div className="text-center p-6 space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/50 text-muted-foreground">
                      <VideoOff className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Kamera Sedang Tertutup
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Klik tombol &quot;Buka Kamera&quot; di bawah untuk mulai
                        memotret.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {isCameraActive ? (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 py-2.5 text-xs font-bold text-destructive hover:bg-destructive hover:text-white transition-colors"
                  >
                    <VideoOff className="h-3.5 w-3.5" />
                    <span>Tutup Kamera</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      setPrediction(null);
                      startCamera();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 py-2.5 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Buka Kamera</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === "realtime" && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-border">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover -scale-x-100 ${
                    !isCameraActive ? "hidden" : ""
                  }`}
                />

                {isCameraActive && prediction && (
                  <FaceBoxOverlay
                    faces={prediction.faces}
                    imageWidth={prediction.image_width}
                    imageHeight={prediction.image_height}
                    fit="slice"
                    mirrored
                  />
                )}

                {!isCameraActive && (
                  <div className="text-center p-6 space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/50 text-muted-foreground">
                      <VideoOff className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Kamera Real-Time Tertutup
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Klik tombol &quot;Buka Kamera&quot; di bawah untuk
                        mengaktifkan streaming.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {isCameraActive ? (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="flex items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 py-2.5 text-xs font-bold text-destructive hover:bg-destructive hover:text-white transition-colors"
                  >
                    <VideoOff className="h-3.5 w-3.5" />
                    <span>Tutup Kamera</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 py-2.5 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Buka Kamera</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleRealtime}
                  disabled={!isCameraActive}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all disabled:opacity-40 ${
                    isRealtime
                      ? "bg-destructive text-white shadow-md animate-pulse"
                      : "bg-success text-white hover:opacity-90 shadow-sm"
                  }`}
                >
                  {isRealtime ? (
                    <>
                      <Square className="h-3.5 w-3.5 fill-current" />
                      <span>Stop Realtime</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Mulai Realtime</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab !== "realtime" && (
            <div className="flex gap-3 pt-2">
              {activeTab === "capture" && isCameraActive && !previewUrl && (
                <button
                  onClick={() => runAnalysis(false)}
                  disabled={isAnalyzing}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Memotret & Menganalisis...</span>
                    </>
                  ) : (
                    <>
                      <CameraIcon className="h-4 w-4" />
                      <span>Ambil Foto & Analisis</span>
                    </>
                  )}
                </button>
              )}

              {activeTab === "upload" && (
                <button
                  onClick={() => runAnalysis(false)}
                  disabled={isAnalyzing || !selectedFile}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Menganalisis...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Analisis & Simpan</span>
                    </>
                  )}
                </button>
              )}

              {previewUrl && (
                <button
                  onClick={handleReset}
                  disabled={isAnalyzing}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 text-xs font-semibold text-foreground hover:bg-secondary hover:text-primary transition-colors py-3 shadow-sm"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Ambil / Unggah Foto Ulang</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-xl space-y-4 min-h-[360px]">
          <h2 className="text-base font-bold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Hasil Analisis Ekspresi</span>
            </span>
            {isRealtime && (
              <span className="text-[11px] font-medium text-success flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> Streaming
              </span>
            )}
          </h2>

          {/* Indikator Loading / Skeleton saat Menganalisis */}
          {isAnalyzing ? (
            <div className="h-64 rounded-2xl border border-primary/30 bg-primary/5 flex flex-col items-center justify-center text-center p-6 space-y-4 animate-pulse">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-foreground tracking-wide">
                  Model Deep Learning Sedang Bekerja...
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Mengekstrak fitur wajah & mencocokkan matriks ekspresi 7
                  kelas.
                </p>
              </div>
              <div className="w-48 h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-indeterminate w-full origin-left" />
              </div>
            </div>
          ) : !prediction ? (
            <div className="h-64 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ScanFace className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Belum Ada Data Prediksi
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
                  {activeTab === "realtime"
                    ? "Aktifkan kamera dan tekan tombol Mulai Realtime untuk melihat analisis langsung."
                    : activeTab === "capture"
                      ? "Buka kamera terlebih dahulu, lalu ambil foto untuk memulai deteksi ekspresi."
                      : "Unggah berkas foto wajah untuk menampilkan hasil klasifikasi Deep Learning."}
                </p>
              </div>
            </div>
          ) : prediction.n_faces === 0 ? (
            <div className="h-64 rounded-2xl border border-warning/30 bg-warning/10 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/20 text-warning">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  Wajah Tidak Terdeteksi
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
                  {prediction.message ||
                    "Pastikan wajah menghadap lurus ke arah lensa dengan pencahayaan yang cukup."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {mainFace && (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Hasil Dominan ({prediction.n_faces} Wajah)
                    </span>
                    <h3 className="text-2xl font-black text-gradient-brand capitalize">
                      {mainFace.top_label}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Tingkat Kepercayaan
                    </span>
                    <div className="text-xl font-extrabold text-success">
                      {(mainFace.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}

              {mainFace && mainFace.probabilities && (
                <div className="space-y-2.5 pt-1">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-primary" />
                    Distribusi Probabilitas (7 Kelas FER):
                  </span>
                  {Object.entries(mainFace.probabilities).map(
                    ([emotion, prob]) => {
                      const percentage = (prob * 100).toFixed(1);
                      return (
                        <div key={emotion} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="capitalize font-semibold text-muted-foreground">
                              {emotion}
                            </span>
                            <span className="font-bold text-foreground">
                              {percentage}%
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
                    },
                  )}
                </div>
              )}

              <div className="pt-2">
                {isLoggedIn ? (
                  <div className="rounded-xl border border-success/30 bg-success/10 p-3 flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <p className="text-[11px] text-success font-medium leading-relaxed">
                      {isRealtime
                        ? "Mode Realtime aktif · Frame streaming tidak disimpan berulang ke database akun."
                        : "Hasil analisis telah berhasil disimpan secara permanen ke riwayat akun Anda."}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    <p className="text-[11px] text-warning font-medium leading-relaxed">
                      Hasil prediksi disimpan sementara di memori browser
                      (sessionStorage). Silakan masuk ke akun untuk menyimpannya
                      secara permanen.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PredictionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <PredictionContent />
    </Suspense>
  );
}
