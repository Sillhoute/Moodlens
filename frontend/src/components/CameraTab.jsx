import { useEffect, useRef, useState } from 'react';
import { predict } from '../api.js';
import { FaceBoxes, FaceResults } from './FaceResults.jsx';

const FRAME_WIDTH = 640;
const MIN_FRAME_INTERVAL_MS = 250;

const cameraErrorMessage = (err) =>
  err.name === 'NotAllowedError'
    ? 'Akses kamera ditolak. Izinkan kamera pada browser lalu coba lagi.'
    : 'Kamera tidak dapat dibuka. Pastikan kamera tersedia dan tidak dipakai aplikasi lain.';

const captureFrame = (video, canvas) =>
  new Promise((resolve) => {
    canvas.width = FRAME_WIDTH;
    canvas.height = Math.round((video.videoHeight / video.videoWidth) * FRAME_WIDTH);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(resolve, 'image/jpeg', 0.8);
  });

export default function CameraTab() {
  const videoRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Browser hanya mengizinkan kamera pada localhost atau HTTPS.
  const supported = Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(() => {
    if (!running) return undefined;

    let stopped = false;
    let stream = null;
    let timer = null;
    const canvas = document.createElement('canvas');

    const analyse = async () => {
      if (stopped) return;
      const started = performance.now();
      const video = videoRef.current;
      try {
        if (video?.videoWidth) {
          const frame = await captureFrame(video, canvas);
          const response = await predict(frame, { models: ['vanilla'], source: 'camera', save: false });
          if (!stopped) {
            setResult(response);
            setError('');
          }
        }
      } catch (err) {
        if (!stopped) setError(err.message);
      }
      // Frame berikutnya dikirim setelah jawaban diterima agar permintaan tidak menumpuk.
      if (!stopped) timer = setTimeout(analyse, Math.max(0, MIN_FRAME_INTERVAL_MS - (performance.now() - started)));
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((mediaStream) => {
        if (stopped) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = mediaStream;
        videoRef.current.srcObject = mediaStream;
        analyse();
      })
      .catch((err) => {
        if (stopped) return;
        setError(cameraErrorMessage(err));
        setRunning(false);
      });

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      setResult(null);
    };
  }, [running]);

  if (!supported) {
    return <p className="notice">Kamera hanya bisa dipakai lewat localhost atau HTTPS. Gunakan menu Foto pada alamat ini.</p>;
  }

  return (
    <div className="stack">
      <div className="card controls-row">
        <button type="button" className={running ? '' : 'primary'} onClick={() => setRunning((value) => !value)}>
          {running ? 'Hentikan kamera' : 'Nyalakan kamera'}
        </button>
        <span className="muted small">Memakai Custom Residual CNN karena lebih ringan. Frame kamera tidak disimpan.</span>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {running && (
        <div className="result-layout">
          <div className="preview">
            <video ref={videoRef} className="mirrored" autoPlay playsInline muted />
            {result && <FaceBoxes faces={result.faces} image={result.image} mirrored />}
          </div>
          <div className="stack">
            {result?.faces.length === 0 && <p className="notice">Wajah belum terdeteksi. Hadapkan wajah ke kamera.</p>}
            {result && <FaceResults result={result} />}
          </div>
        </div>
      )}
    </div>
  );
}
