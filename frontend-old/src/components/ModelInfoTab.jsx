import { useEffect, useState } from 'react';
import { getModelInfo } from '../api.js';
import { formatNumber, formatPercent } from '../labels.js';

export default function ModelInfoTab() {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getModelInfo()
      .then(setInfo)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  }
  if (!info) return <p className="muted">Memuat info model...</p>;

  const detector = info.deteksi_wajah;
  const ensemble = info.hasil_verifikasi.Ensemble;

  return (
    <div className="stack">
      <div className="page-header">
        <h2>Info Model</h2>
        <p>{info.nama}</p>
      </div>

      <div className="metric-grid">
        <div className="card metric-card featured">
          <strong>{formatPercent(ensemble.akurasi)}</strong>
          <span>Akurasi ensemble</span>
        </div>
        <div className="card metric-card">
          <strong>{ensemble.macro_f1.toFixed(3)}</strong>
          <span>Macro F1 ensemble</span>
        </div>
        <div className="card metric-card">
          <strong>{formatPercent(info.tau_0_5.akurasi_dijawab)}</strong>
          <span>Akurasi pada wajah yang dijawab (τ = {info.tau})</span>
        </div>
        <div className="card metric-card">
          <strong>{formatPercent(info.tau_0_5.cakupan)}</strong>
          <span>Wajah yang dijawab model</span>
        </div>
      </div>

      <div className="two-columns">
        <section className="card">
          <h3>Perbandingan model</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Akurasi</th>
                  <th>Macro F1</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(info.hasil_verifikasi).map(([name, metrics]) => (
                  <tr key={name} className={name === 'Ensemble' ? 'highlight' : undefined}>
                    <td>{name}</td>
                    <td>{formatPercent(metrics.akurasi)}</td>
                    <td>{metrics.macro_f1.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 style={{ marginTop: 24 }}>Komponen ensemble</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Komponen</th>
                  <th>Parameter</th>
                  <th>Ukuran</th>
                </tr>
              </thead>
              <tbody>
                {info.komponen.map((component) => (
                  <tr key={component.nama}>
                    <td>{component.nama}</td>
                    <td>{formatNumber(component.parameter)}</td>
                    <td>{component.ukuran_mb} MB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h3>Cara kerja</h3>
          <ol className="steps">
            <li>
              {detector.metode} mencari wajah dengan skor minimal {detector.skor_min} dan ukuran minimal{' '}
              {detector.ukuran_min_px} piksel.
            </li>
            <li>Setiap wajah dipotong persegi, lalu diubah ke {detector.resize}.</li>
            <li>Kedua model menghitung probabilitas 7 ekspresi, lalu hasilnya {info.ensemble}.</li>
            <li>
              Jika probabilitas tertinggi di bawah τ = {info.tau}, wajah ditampilkan sebagai ekspresi kurang jelas.
            </li>
          </ol>
          <p className="muted small" style={{ marginTop: 20 }}>
            Dataset: {info.dataset}. Waktu CPU sekitar {info.cpu_ms_per_wajah} ms per wajah.
          </p>
        </section>
      </div>
    </div>
  );
}
