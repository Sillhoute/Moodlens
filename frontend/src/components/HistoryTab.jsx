import { useEffect, useState } from 'react';
import { clearHistory, deleteHistoryItem, getHistory } from '../api.js';
import { SOURCE_LABELS, faceColor, faceLabel } from '../labels.js';
import { CameraIcon, HistoryIcon, TrashIcon, UploadIcon } from './Icons.jsx';

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
      <div className="toolbar">
        <div className="page-header">
          <h2>Riwayat</h2>
          <p>{total > 0 ? `${total} prediksi tersimpan di akun Anda.` : 'Prediksi Anda akan muncul di sini.'}</p>
        </div>
        {total > 0 && (
          <button type="button" className="danger" onClick={handleClear}>
            <TrashIcon size={18} />
            Hapus semua
          </button>
        )}
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {!loading && total === 0 && !error && (
        <div className="card empty-state">
          <span className="icon-bubble">
            <HistoryIcon size={26} />
          </span>
          <strong>Belum ada riwayat</strong>
          <p className="muted small">Kenali ekspresi dari foto atau webcam terlebih dahulu.</p>
        </div>
      )}

      {items.length > 0 && (
        <ul className="history-list">
          {items.map((item) => {
            const SourceIcon = item.source === 'webcam' ? CameraIcon : UploadIcon;
            return (
              <li key={item.id} className="history-item">
                <span className="icon-bubble">
                  <SourceIcon />
                </span>
                <div className="history-body">
                  <div className="history-meta">
                    <span>{dateFormat.format(new Date(item.created_at))}</span>
                    <span>{SOURCE_LABELS[item.source]}</span>
                    <span>{item.n_faces} wajah</span>
                  </div>
                  <div className="chips">
                    {item.faces.map((face) => (
                      <span key={face.index} className="pill chip">
                        <span className="dot" style={{ background: faceColor(face) }} />
                        {face.index + 1}. {faceLabel(face)}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="ghost danger icon-button"
                  title="Hapus"
                  aria-label={`Hapus prediksi ${dateFormat.format(new Date(item.created_at))}`}
                  onClick={() => handleDelete(item.id)}
                >
                  <TrashIcon size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 0 && items.length < total && (
        <button type="button" onClick={() => load(items.length)} disabled={loading}>
          {loading ? 'Memuat...' : 'Muat lebih banyak'}
        </button>
      )}

      {loading && items.length === 0 && <p className="muted">Memuat riwayat...</p>}
    </div>
  );
}
