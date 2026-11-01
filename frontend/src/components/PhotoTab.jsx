import { useEffect, useRef, useState } from 'react';
import { predict } from '../api.js';
import { FaceBoxes, FaceResults } from './FaceResults.jsx';

const MODEL_OPTIONS = [
  { value: 'resnet', label: 'ResNet50 (lebih akurat)', models: ['resnet'] },
  { value: 'vanilla', label: 'Custom Residual CNN (lebih ringan)', models: ['vanilla'] },
  { value: 'both', label: 'Bandingkan kedua model', models: ['vanilla', 'resnet'] },
];

export default function PhotoTab() {
  const [option, setOption] = useState('resnet');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Hanya jawaban dari permintaan terakhir yang boleh ditampilkan.
  const latestRequest = useRef(0);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file) return;
    const requestId = ++latestRequest.current;
    const { models } = MODEL_OPTIONS.find((item) => item.value === option);

    setResult(null);
    setError('');
    setLoading(true);
    predict(file, { models })
      .then((response) => {
        if (requestId === latestRequest.current) setResult(response);
      })
      .catch((err) => {
        if (requestId === latestRequest.current) setError(err.message);
      })
      .finally(() => {
        if (requestId === latestRequest.current) setLoading(false);
      });
  }, [file, option]);

  return (
    <div className="stack">
      <form className="card controls" onSubmit={(event) => event.preventDefault()}>
        <label>
          Foto wajah (JPEG, PNG, atau WebP, maksimal 5 MB)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setFile(event.target.files[0] ?? null)}
          />
        </label>
        <label>
          Model
          <select value={option} onChange={(event) => setOption(event.target.value)}>
            {MODEL_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {file && previewUrl && (
        <div className="result-layout">
          <div className="preview">
            <img src={previewUrl} alt="Foto yang dianalisis" />
            {result && <FaceBoxes faces={result.faces} image={result.image} />}
          </div>
          <div className="stack">
            {loading && <p className="muted">Menganalisis foto...</p>}
            {result?.faces.length === 0 && (
              <p className="notice">Wajah tidak terdeteksi. Coba foto dengan wajah menghadap ke depan dan pencahayaan yang cukup.</p>
            )}
            {result && <FaceResults result={result} />}
          </div>
        </div>
      )}

      <p className="muted small">
        Foto hanya diproses untuk prediksi dan tidak disimpan. Riwayat hanya menyimpan hasil dan skornya. Hasil ini membaca
        ekspresi di wajah, bukan perasaan seseorang.
      </p>
    </div>
  );
}
