import { useEffect, useState } from 'react';
import { getStats } from '../api.js';
import { EMOTION_LABELS, SOURCE_LABELS, formatNumber, formatPercent } from '../labels.js';

const RANGE_OPTIONS = [7, 14, 30];
const dayFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });

function StatCard({ label, value }) {
  return (
    <div className="card stat-card">
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function StatsTab() {
  const [days, setDays] = useState(14);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getStats(days)
      .then((data) => active && setStats(data))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [days]);

  if (error) {
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  }
  if (!stats) return <p className="muted">Memuat statistik...</p>;
  if (stats.total_prediksi === 0) {
    return <p className="notice">Belum ada data. Statistik muncul setelah Anda mengenali ekspresi.</p>;
  }

  const maxFaces = Math.max(...stats.distribusi.map((row) => row.jumlah), 1);
  const maxDaily = Math.max(...stats.tren_harian.map((row) => row.jumlah), 1);

  return (
    <div className="stack">
      <div className="stat-grid">
        <StatCard label="Total prediksi" value={formatNumber(stats.total_prediksi)} />
        <StatCard label="Total wajah" value={formatNumber(stats.total_wajah)} />
        <StatCard label="Wajah dengan ekspresi jelas" value={formatNumber(stats.wajah_jelas)} />
        <StatCard
          label="Rata-rata keyakinan"
          value={stats.rata_rata_keyakinan === null ? '-' : formatPercent(stats.rata_rata_keyakinan)}
        />
      </div>

      <section className="card">
        <h3>
          Distribusi ekspresi
          {stats.ekspresi_terbanyak && (
            <span className="muted small"> · terbanyak: {EMOTION_LABELS[stats.ekspresi_terbanyak]}</span>
          )}
        </h3>
        <ul className="bars">
          {stats.distribusi.map((row) => (
            <li key={row.label}>
              <span className="bar-label">{EMOTION_LABELS[row.label]}</span>
              <span className="bar-track">
                <span
                  className={row.label === 'kurang_jelas' ? 'bar-fill unclear' : 'bar-fill'}
                  style={{ width: `${(row.jumlah / maxFaces) * 100}%` }}
                />
              </span>
              <span className="bar-value">{row.jumlah}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="section-header">
          <h3>Prediksi per hari</h3>
          <select value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="Rentang hari">
            {RANGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} hari terakhir
              </option>
            ))}
          </select>
        </div>
        <div className="trend" role="img" aria-label={`Jumlah prediksi per hari selama ${days} hari terakhir`}>
          {stats.tren_harian.map((row) => (
            <div key={row.tanggal} className="trend-column" title={`${row.tanggal}: ${row.jumlah} prediksi`}>
              <span className="trend-value">{row.jumlah > 0 ? row.jumlah : ''}</span>
              <span className="trend-bar" style={{ height: `${(row.jumlah / maxDaily) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="trend-axis muted small">
          <span>{dayFormat.format(new Date(stats.tren_harian[0].tanggal))}</span>
          <span>{dayFormat.format(new Date(stats.tren_harian.at(-1).tanggal))}</span>
        </div>
        <p className="muted small">
          Per sumber:{' '}
          {Object.entries(stats.per_sumber)
            .map(([source, count]) => `${SOURCE_LABELS[source] ?? source} ${count}`)
            .join(', ')}
        </p>
      </section>
    </div>
  );
}
