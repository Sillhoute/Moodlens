import { useEffect, useRef, useState } from 'react';
import { predict } from '../api.js';
import { CameraIcon, UploadIcon } from './Icons.jsx';
import { AnnotatedImage, ResultPanel } from './ResultView.jsx';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_SNAPSHOT_WIDTH = 1280;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
    if (running) {
      reset();
      setSnapshotUrl('');
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
          <p className="muted small">Setiap foto yang diambil disimpan hasilnya ke riwayat, bukan fotonya.</p>
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
          {loading ? 'Menganalisis...' : 'Ambil foto dan kenali'}
        </button>
        <button type="button" onClick={toggleCamera}>
          Matikan kamera
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="result-layout">
        <div className="stack">
          <div className="preview">
            <video ref={videoRef} className="mirrored" autoPlay playsInline muted />
          </div>
          {snapshotUrl && (result || loading) && (
            <AnnotatedImage src={snapshotUrl} result={result} alt="Foto dari webcam" scanning={loading} />
          )}
        </div>
        <ResultPanel result={result} loading={loading} />
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
