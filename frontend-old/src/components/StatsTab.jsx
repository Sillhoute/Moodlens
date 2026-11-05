import { useEffect, useState } from 'react';
import { getStats } from '../api.js';
import { EMOTION_COLORS, EMOTION_LABELS, SOURCE_LABELS, formatNumber, formatPercent } from '../labels.js';
import { ChartIcon, HistoryIcon, ScanIcon, ShieldIcon, UsersIcon } from './Icons.jsx';

const RANGE_OPTIONS = [7, 14, 30];
const dayFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });

function StatCard({ Icon, label, value }) {
  return (
    <div className="card stat-card">
      <span className="icon-bubble">
        <Icon />
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
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

  const header = (
    <div className="page-header">
      <h2>Statistik</h2>
      <p>Ringkasan semua prediksi di akun Anda.</p>
    </div>
  );

  if (error) {
    return (
      <div className="stack">
        {header}
        <p className="error" role="alert">
          {error}
        </p>
      </div>
    );
  }
  if (!stats) return <p className="muted">Memuat statistik...</p>;
  if (stats.total_prediksi === 0) {
    return (
      <div className="stack">
        {header}
        <div className="card empty-state">
          <span className="icon-bubble">
            <ChartIcon size={26} />
          </span>
          <strong>Belum ada data</strong>
          <p className="muted small">Statistik muncul setelah Anda mengenali ekspresi.</p>
        </div>
      </div>
    );
  }

  const maxFaces = Math.max(...stats.distribusi.map((row) => row.jumlah), 1);
  const maxDaily = Math.max(...stats.tren_harian.map((row) => row.jumlah), 1);

  return (
    <div className="stack">
      {header}

      <div className="stat-grid">
        <StatCard Icon={HistoryIcon} label="Total prediksi" value={formatNumber(stats.total_prediksi)} />
        <StatCard Icon={UsersIcon} label="Total wajah" value={formatNumber(stats.total_wajah)} />
        <StatCard Icon={ScanIcon} label="Wajah dengan ekspresi jelas" value={formatNumber(stats.wajah_jelas)} />
        <StatCard
          Icon={ShieldIcon}
          label="Rata-rata keyakinan"
          value={stats.rata_rata_keyakinan === null ? '-' : formatPercent(stats.rata_rata_keyakinan)}
        />
      </div>

      <div className="two-columns">
        <section className="card">
          <div className="section-header">
            <h3>Distribusi ekspresi</h3>
            {stats.ekspresi_terbanyak && (
              <span
                className="pill"
                style={{
                  color: EMOTION_COLORS[stats.ekspresi_terbanyak],
                  background: `color-mix(in srgb, ${EMOTION_COLORS[stats.ekspresi_terbanyak]} 14%, transparent)`,
                }}
              >
                Terbanyak: {EMOTION_LABELS[stats.ekspresi_terbanyak]}
              </span>
            )}
          </div>
          <ul className="bars">
            {stats.distribusi.map((row) => (
              <li key={row.label}>
                <span className="bar-label">
                  <span className="dot" style={{ background: EMOTION_COLORS[row.label] }} />
                  {EMOTION_LABELS[row.label]}
                </span>
                <span className="bar-track">
                  <span
                    className="bar-fill"
                    style={{ width: `${(row.jumlah / maxFaces) * 100}%`, '--fill': EMOTION_COLORS[row.label] }}
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
                <span
                  className={row.jumlah > 0 ? 'trend-bar' : 'trend-bar empty'}
                  style={{ height: `${(row.jumlah / maxDaily) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="trend-axis">
            <span>{dayFormat.format(new Date(stats.tren_harian[0].tanggal))}</span>
            <span>{dayFormat.format(new Date(stats.tren_harian.at(-1).tanggal))}</span>
          </div>
          <div className="chips" style={{ marginTop: 16 }}>
            {Object.entries(stats.per_sumber).map(([source, count]) => (
              <span key={source} className="pill chip">
                {SOURCE_LABELS[source] ?? source}: {count}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
