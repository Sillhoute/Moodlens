import { useEffect, useRef, useState } from 'react';
import { predict } from '../api.js';
import { CameraIcon, UploadIcon } from './Icons.jsx';
import { AnnotatedImage, LivePreview, ResultPanel } from './ResultView.jsx';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_SNAPSHOT_WIDTH = 1280;
const LIVE_ANALYSIS_INTERVAL_MS = 350;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const cameraErrorMessage = (err) =>
  ({
    NotAllowedError: 'Akses kamera ditolak. Izinkan kamera pada browser lalu coba lagi.',
    NotFoundError: 'Kamera tidak ditemukan. Hubungkan kamera lalu coba lagi.',
    NotReadableError: 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.',
    OverconstrainedError: 'Kamera tidak mendukung pengaturan yang diminta. Coba perangkat kamera lain.',
    SecurityError: 'Webcam hanya bisa dipakai lewat localhost atau HTTPS.',
  })[err.name] ?? 'Kamera tidak dapat dibuka. Pastikan kamera tersedia dan tidak dipakai aplikasi lain.';

const captureSnapshot = (video) =>
  new Promise((resolve, reject) => {
    if (!video.videoWidth || !video.videoHeight) {
      reject(new Error('Kamera belum siap. Tunggu sampai video tampil lalu coba lagi.'));
      return;
    }
    const scale = Math.min(1, MAX_SNAPSHOT_WIDTH / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error('Browser tidak dapat menyiapkan gambar dari kamera.'));
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Browser tidak dapat mengambil frame dari kamera.'));
    }, 'image/jpeg', 0.85);
  });

function useAnalysis() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Hanya jawaban dari permintaan terakhir yang boleh ditampilkan.
  const latestRequest = useRef(0);

  const analyse = async (image, source) => {
    const requestId = ++latestRequest.current;
    setResult(null);
    setError('');
    setLoading(true);
    try {
      const response = await predict(image, source);
      if (requestId === latestRequest.current) setResult(response);
    } catch (err) {
      if (requestId === latestRequest.current) setError(err.message);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  };

  const reset = () => {
    latestRequest.current += 1;
    setResult(null);
    setError('');
    setLoading(false);
  };

  return { result, error, loading, analyse, reset, setError };
}

function Dropzone({ onFile, compact }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <label
      className={`dropzone${dragging ? ' dragging' : ''}${compact ? ' compact' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <span className="icon-bubble">
        <UploadIcon />
      </span>
      <strong>{compact ? 'Ganti foto' : 'Tarik foto ke sini, atau klik untuk memilih'}</strong>
      {!compact && <span className="muted small">JPG, PNG, atau WebP, maksimal 5 MB. Boleh berisi beberapa wajah.</span>}
      <input
        type="file"
        accept={IMAGE_TYPES.join(',')}
        onChange={(event) => {
          if (event.target.files[0]) onFile(event.target.files[0]);
          event.target.value = '';
        }}
      />
    </label>
  );
}

function UploadMode() {
  const [imageUrl, setImageUrl] = useState('');
  const { result, error, loading, analyse, reset, setError } = useAnalysis();

  useEffect(() => () => imageUrl && URL.revokeObjectURL(imageUrl), [imageUrl]);

  const handleFile = (file) => {
    reset();
    if (!IMAGE_TYPES.includes(file.type)) {
      setImageUrl('');
      setError('Format foto harus JPG, PNG, atau WebP');
      return;
    }
    setImageUrl(URL.createObjectURL(file));
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Ukuran foto maksimal 5 MB');
      return;
    }
    analyse(file, 'upload');
  };

  return (
    <div className="stack">
      <Dropzone onFile={handleFile} compact={Boolean(imageUrl)} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {imageUrl && (
        <div className="result-layout">
          <AnnotatedImage src={imageUrl} result={result} alt="Foto yang dianalisis" scanning={loading} />
          <ResultPanel result={result} loading={loading} />
        </div>
      )}
    </div>
  );
}

function WebcamMode() {
  const videoRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [liveResult, setLiveResult] = useState(null);
  const [liveError, setLiveError] = useState('');
  const [liveScanning, setLiveScanning] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState('');
  const { result, error, loading, analyse, reset } = useAnalysis();

  // Browser hanya mengizinkan kamera pada localhost atau HTTPS.
  const supported = Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(() => () => snapshotUrl && URL.revokeObjectURL(snapshotUrl), [snapshotUrl]);

  useEffect(() => {
    if (!running) return undefined;
    let stopped = false;
    let stream = null;
    let timer = null;
    const video = videoRef.current;

    const analyseFrames = async () => {
      if (stopped) return;
      setLiveScanning(true);
      let delay = LIVE_ANALYSIS_INTERVAL_MS;
      try {
        const snapshot = await captureSnapshot(video);
        const response = await predict(snapshot, 'webcam', { saveHistory: false });
        if (stopped) {
          return;
        }
        setLiveResult(response);
        setLiveError('');
      } catch (err) {
        if (!stopped) {
          setLiveError(err.message);
          delay = 1000;
        }
      } finally {
        if (!stopped) {
          setLiveScanning(false);
          timer = setTimeout(analyseFrames, delay);
        }
      }
    };

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (!video) throw new Error('Elemen video kamera tidak tersedia.');
        video.srcObject = stream;
        await video.play();

        const videoReadyAt = Date.now();
        while (!stopped && (!video.videoWidth || video.readyState < 2)) {
          if (Date.now() - videoReadyAt >= 10000) {
            throw new Error('Kamera menyala, tetapi belum mengirim video. Periksa izin kamera lalu coba lagi.');
          }
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
        if (!stopped) await analyseFrames();
      } catch (err) {
        if (stopped) return;
        setCameraError(cameraErrorMessage(err));
        setRunning(false);
      }
    };

    startCamera();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      if (video?.srcObject === stream) video.srcObject = null;
    };
  }, [running]);

  const handleCapture = async () => {
    const video = videoRef.current;
    try {
      const snapshot = await captureSnapshot(video);
      setSnapshotUrl(URL.createObjectURL(snapshot));
      analyse(snapshot, 'webcam');
    } catch (err) {
      setLiveError(err.message);
    }
  };

  const toggleCamera = () => {
    setCameraError('');
    if (running) {
      reset();
      setSnapshotUrl('');
      setLiveResult(null);
      setLiveError('');
      setLiveScanning(false);
    }
    setRunning((value) => !value);
  };

  if (!supported) {
    return <p className="notice">Webcam hanya bisa dipakai lewat localhost atau HTTPS. Gunakan mode Unggah foto.</p>;
  }

  if (!running) {
    return (
      <div className="stack">
        {cameraError && (
          <p className="error" role="alert">
            {cameraError}
          </p>
        )}
        <div className="card empty-state">
          <span className="icon-bubble">
            <CameraIcon size={26} />
          </span>
          <strong>Kamera belum menyala</strong>
          <p className="muted small">
            Ekspresi dianalisis langsung. Hasil hanya masuk riwayat saat Anda mengambil foto, bukan gambar aslinya.
          </p>
          <button type="button" className="primary" onClick={toggleCamera}>
            Nyalakan kamera
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="camera-actions">
        <button type="button" className="primary" onClick={handleCapture} disabled={loading}>
          <CameraIcon size={18} />
          {loading ? 'Menyimpan prediksi...' : 'Ambil foto dan simpan hasil'}
        </button>
        <button type="button" onClick={toggleCamera}>
          Matikan kamera
        </button>
      </div>

      {(error || liveError) && (
        <p className="error" role="alert">
          {error || liveError}
        </p>
      )}

      <div className="result-layout">
        <div className="stack">
          <LivePreview videoRef={videoRef} result={liveResult} scanning={liveScanning} />
          {snapshotUrl && (result || loading) && (
            <AnnotatedImage src={snapshotUrl} result={result} alt="Foto dari webcam" scanning={loading} />
          )}
        </div>
        <div className="stack">
          <p className="live-status">
            <span className="live-indicator" />
            {liveScanning ? 'Kamera aktif · menganalisis frame' : 'Kamera aktif · analisis real-time'}
          </p>
          <ResultPanel result={liveResult} loading={!liveResult} />
        </div>
      </div>
    </div>
  );
}

export default function RecognizeTab() {
  const [mode, setMode] = useState('upload');

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="page-header">
          <h2>Kenali Ekspresi</h2>
          <p>Hasil membaca ekspresi di wajah, bukan perasaan seseorang. Foto tidak disimpan.</p>
        </div>
        <div className="segmented" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'upload'}
            className={mode === 'upload' ? 'active' : ''}
            onClick={() => setMode('upload')}
          >
            <UploadIcon size={18} />
            Unggah foto
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'webcam'}
            className={mode === 'webcam' ? 'active' : ''}
            onClick={() => setMode('webcam')}
          >
            <CameraIcon size={18} />
            Webcam
          </button>
        </div>
      </div>

      {mode === 'upload' ? <UploadMode /> : <WebcamMode />}
    </div>
  );
}
