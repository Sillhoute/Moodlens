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

  return (
    <div className="stack">
      <section className="card">
        <h3>{info.nama}</h3>
        <p className="small">
          Hasil akhir adalah {info.ensemble}. Ambang keyakinan τ = {info.tau}: {info.aturan_tau}.
        </p>
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
        <p className="muted small">
          Dengan τ = {info.tau}, model menjawab {formatPercent(info.tau_0_5.cakupan)} wajah, dan akurasinya pada wajah
          yang dijawab {formatPercent(info.tau_0_5.akurasi_dijawab)}.
        </p>
      </section>

      <section className="card">
        <h3>Komponen ensemble</h3>
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
        <ol>
          <li>
            {detector.metode} mencari wajah dengan skor minimal {detector.skor_min} dan ukuran minimal{' '}
            {detector.ukuran_min_px} piksel.
          </li>
          <li>Setiap wajah dipotong persegi, diubah ke {detector.resize}.</li>
          <li>Kedua model menghitung probabilitas 7 ekspresi, lalu hasilnya dirata-rata.</li>
          <li>Jika probabilitas tertinggi di bawah τ, hasil ditampilkan sebagai ekspresi kurang jelas.</li>
        </ol>
        <p className="muted small">
          Dataset: {info.dataset}. Waktu CPU sekitar {info.cpu_ms_per_wajah} ms per wajah.
        </p>
      </section>
    </div>
  );
}
