import { useEffect, useState } from 'react';
import { clearHistory, getHistory, getStats } from '../api.js';
import { EMOTION_LABELS, MODEL_LABELS, formatPercent } from '../emotions.js';

const dateFormat = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export default function HistoryTab() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getHistory(), getStats()])
      .then(([historyRows, statsRows]) => {
        setHistory(historyRows);
        setStats(statsRows);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleClear = async () => {
    if (!window.confirm('Hapus semua riwayat prediksi?')) return;
    try {
      await clearHistory();
      setHistory([]);
      setStats([]);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="muted">Memuat riwayat...</p>;

  const total = stats.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="stack">
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {!error && total === 0 && <p className="notice">Belum ada riwayat. Analisis foto di menu Foto terlebih dahulu.</p>}

      {total > 0 && (
        <>
          <section className="card">
            <h3>Ringkasan ekspresi ({total} prediksi)</h3>
            <ul className="bars">
              {stats.map((row) => (
                <li key={row.emotion}>
                  <span className="bar-label">{EMOTION_LABELS[row.emotion]}</span>
                  <span className="bar-track">
                    <span className="bar-fill" style={{ width: formatPercent(row.count / total) }} />
                  </span>
                  <span className="bar-value">{row.count}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <div className="section-header">
              <h3>50 prediksi terakhir</h3>
              <button type="button" className="danger" onClick={handleClear}>
                Hapus semua
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Model</th>
                    <th>Ekspresi</th>
                    <th>Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id}>
                      <td>{dateFormat.format(new Date(row.created_at))}</td>
                      <td>{MODEL_LABELS[row.model]}</td>
                      <td>{EMOTION_LABELS[row.emotion]}</td>
                      <td>{formatPercent(row.score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
