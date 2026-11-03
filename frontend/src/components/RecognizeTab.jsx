import { useEffect, useRef, useState } from 'react';
import { predict } from '../api.js';
import { AnnotatedImage, ResultPanel } from './ResultView.jsx';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_SNAPSHOT_WIDTH = 1280;

const cameraErrorMessage = (err) =>
  err.name === 'NotAllowedError'
    ? 'Akses kamera ditolak. Izinkan kamera pada browser lalu coba lagi.'
    : 'Kamera tidak dapat dibuka. Pastikan kamera tersedia dan tidak dipakai aplikasi lain.';

const captureSnapshot = (video) =>
  new Promise((resolve) => {
    const scale = Math.min(1, MAX_SNAPSHOT_WIDTH / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(resolve, 'image/jpeg', 0.9);
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

function UploadMode() {
  const [imageUrl, setImageUrl] = useState('');
  const { result, error, loading, analyse, reset, setError } = useAnalysis();

  useEffect(() => () => imageUrl && URL.revokeObjectURL(imageUrl), [imageUrl]);

  const handleFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    reset();
    setImageUrl(URL.createObjectURL(file));
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Ukuran foto maksimal 5 MB');
      return;
    }
    analyse(file, 'upload');
  };

  return (
    <div className="stack">
      <label className="card file-picker">
        Pilih foto wajah (JPG, PNG, atau WebP, maksimal 5 MB). Foto boleh berisi beberapa wajah.
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {imageUrl && (
        <div className="result-layout">
          <AnnotatedImage src={imageUrl} result={result} alt="Foto yang dianalisis" />
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
  const [snapshotUrl, setSnapshotUrl] = useState('');
  const { result, error, loading, analyse, reset } = useAnalysis();

  // Browser hanya mengizinkan kamera pada localhost atau HTTPS.
  const supported = Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(() => () => snapshotUrl && URL.revokeObjectURL(snapshotUrl), [snapshotUrl]);

  useEffect(() => {
    if (!running) return undefined;
    let stopped = false;
    let stream = null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((mediaStream) => {
        if (stopped) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = mediaStream;
        videoRef.current.srcObject = mediaStream;
      })
      .catch((err) => {
        if (stopped) return;
        setCameraError(cameraErrorMessage(err));
        setRunning(false);
      });

    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [running]);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const snapshot = await captureSnapshot(video);
    setSnapshotUrl(URL.createObjectURL(snapshot));
    analyse(snapshot, 'webcam');
  };

  const toggleCamera = () => {
    setCameraError('');
    if (running) reset();
    setRunning((value) => !value);
  };

  if (!supported) {
    return <p className="notice">Webcam hanya bisa dipakai lewat localhost atau HTTPS. Gunakan mode Unggah foto.</p>;
  }

  return (
    <div className="stack">
      <div className="card controls-row">
        <button type="button" className={running ? '' : 'primary'} onClick={toggleCamera}>
          {running ? 'Matikan kamera' : 'Nyalakan kamera'}
        </button>
        {running && (
          <button type="button" className="primary" onClick={handleCapture} disabled={loading}>
            {loading ? 'Menganalisis...' : 'Ambil foto dan kenali'}
          </button>
        )}
        <span className="muted small">Setiap foto yang diambil disimpan hasilnya ke riwayat, bukan fotonya.</span>
      </div>

      {(cameraError || error) && (
        <p className="error" role="alert">
          {cameraError || error}
        </p>
      )}

      {running && (
        <div className="result-layout">
          <div className="stack">
            <div className="preview">
              <video ref={videoRef} className="mirrored" autoPlay playsInline muted />
            </div>
            {snapshotUrl && result && <AnnotatedImage src={snapshotUrl} result={result} alt="Foto dari webcam" />}
          </div>
          <ResultPanel result={result} loading={loading} />
        </div>
      )}
    </div>
  );
}

export default function RecognizeTab() {
  const [mode, setMode] = useState('upload');

  return (
    <div className="stack">
      <div className="segmented" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'upload'}
          className={mode === 'upload' ? 'active' : ''}
          onClick={() => setMode('upload')}
        >
          Unggah foto
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'webcam'}
          className={mode === 'webcam' ? 'active' : ''}
          onClick={() => setMode('webcam')}
        >
          Webcam
        </button>
      </div>

      {mode === 'upload' ? <UploadMode /> : <WebcamMode />}

      <p className="muted small">
        Foto hanya diproses untuk prediksi dan tidak disimpan. Hasil ini membaca ekspresi di wajah, bukan perasaan
        seseorang.
      </p>
    </div>
  );
}
