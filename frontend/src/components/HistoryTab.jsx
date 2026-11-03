import { useEffect, useState } from 'react';
import { clearHistory, deleteHistoryItem, getHistory } from '../api.js';
import { SOURCE_LABELS, faceLabel } from '../labels.js';

const PAGE_SIZE = 20;
const dateFormat = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export default function HistoryTab() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (offset) => {
    setLoading(true);
    try {
      const page = await getHistory(offset, PAGE_SIZE);
      setItems((current) => (offset === 0 ? page.items : [...current, ...page.items]));
      setTotal(page.total);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(0);
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteHistoryItem(id);
      setItems((current) => current.filter((item) => item.id !== id));
      setTotal((current) => current - 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Hapus semua riwayat prediksi?')) return;
    try {
      await clearHistory();
      setItems([]);
      setTotal(0);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="stack">
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {!loading && total === 0 && !error && (
        <p className="notice">Belum ada riwayat. Kenali ekspresi dari foto atau webcam terlebih dahulu.</p>
      )}

      {total > 0 && (
        <section className="card">
          <div className="section-header">
            <h3>{total} prediksi tersimpan</h3>
            <button type="button" className="danger" onClick={handleClear}>
              Hapus semua
            </button>
          </div>
          <ul className="history-list">
            {items.map((item) => (
              <li key={item.id}>
                <div>
                  <p className="history-meta">
                    {dateFormat.format(new Date(item.created_at))} · {SOURCE_LABELS[item.source]} · {item.n_faces} wajah
                  </p>
                  <div className="chips">
                    {item.faces.map((face) => (
                      <span key={face.index} className={face.jelas ? 'chip' : 'chip muted-badge'}>
                        {face.index + 1}. {faceLabel(face)}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="danger small-button"
                  aria-label={`Hapus prediksi ${dateFormat.format(new Date(item.created_at))}`}
                  onClick={() => handleDelete(item.id)}
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
          {items.length < total && (
            <button type="button" onClick={() => load(items.length)} disabled={loading}>
              {loading ? 'Memuat...' : 'Muat lebih banyak'}
            </button>
          )}
        </section>
      )}

      {loading && items.length === 0 && <p className="muted">Memuat riwayat...</p>}
    </div>
  );
}
