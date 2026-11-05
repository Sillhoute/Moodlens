import { useState } from 'react';
import { login, register } from '../api.js';
import { CameraIcon, ShieldIcon, UsersIcon } from './Icons.jsx';
import ModelInfoTab from './ModelInfoTab.jsx';

const EMPTY_FORM = { username: '', password: '', full_name: '' };

const FEATURES = [
  { Icon: UsersIcon, title: 'Banyak wajah sekaligus', text: 'Setiap wajah dalam satu foto dikenali dan diberi nomor.' },
  { Icon: CameraIcon, title: 'Foto atau webcam', text: 'Unggah foto, atau ambil gambar langsung dari kamera.' },
  { Icon: ShieldIcon, title: 'Foto tidak disimpan', text: 'Hanya hasil prediksi yang tercatat di riwayat akun Anda.' },
];

export default function AuthPage({ onLogin, message }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(message);
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await register({ username: form.username, password: form.password, full_name: form.full_name || null });
      }
      onLogin(await login({ username: form.username, password: form.password }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack">
      <div className="auth-layout">
        <section className="hero">
          <span className="pill eyebrow">Ensemble CNN + ResNet50 · FER-2013</span>
          <h1>
            Kenali ekspresi wajah <span>dalam hitungan detik</span>
          </h1>
          <p className="hero-lead">
            Unggah foto atau gunakan webcam. Dua model deep learning menilai setiap wajah, lalu hasilnya digabung
            agar lebih akurat.
          </p>
          <ul className="feature-list">
            {FEATURES.map(({ Icon, title, text }) => (
              <li key={title}>
                <span className="icon-bubble">
                  <Icon />
                </span>
                <div>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="metric-strip">
            <div className="metric">
              <strong>65,1%</strong>
              <span>Akurasi ensemble</span>
            </div>
            <div className="metric">
              <strong>77,4%</strong>
              <span>Akurasi pada wajah yang dijawab</span>
            </div>
            <div className="metric">
              <strong>7</strong>
              <span>Ekspresi dikenali</span>
            </div>
          </div>
        </section>

        <section className="card auth-card">
          <div>
            <h2>{mode === 'login' ? 'Selamat datang kembali' : 'Buat akun baru'}</h2>
            <p className="muted small">
              {mode === 'login' ? 'Masuk untuk mulai mengenali ekspresi.' : 'Gratis, hanya butuh username dan password.'}
            </p>
          </div>

          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => switchMode('login')}
            >
              Masuk
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'active' : ''}
              onClick={() => switchMode('register')}
            >
              Daftar
            </button>
          </div>

          {notice && <p className="notice">{notice}</p>}

          <form className="form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label>
                Nama lengkap (opsional)
                <input
                  value={form.full_name}
                  maxLength={100}
                  onChange={update('full_name')}
                  autoComplete="name"
                  placeholder="Contoh: Nicholas Kosasih"
                />
              </label>
            )}
            <label>
              Username
              <input
                value={form.username}
                required
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9_.]+"
                title="Huruf, angka, titik, atau garis bawah"
                onChange={update('username')}
                autoComplete="username"
                placeholder="username"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={form.password}
                required
                minLength={mode === 'register' ? 8 : undefined}
                maxLength={72}
                onChange={update('password')}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                placeholder={mode === 'register' ? 'Minimal 8 karakter' : 'Password'}
              />
            </label>

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar dan masuk'}
            </button>
          </form>

          <p className="auth-footer">
            {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}&nbsp;
            <button type="button" className="link-button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Daftar sekarang' : 'Masuk'}
            </button>
          </p>
        </section>
      </div>

      <button type="button" className="link-button" onClick={() => setShowInfo((value) => !value)}>
        {showInfo ? 'Sembunyikan info model' : 'Lihat info model tanpa login'}
      </button>
      {showInfo && <ModelInfoTab />}
    </div>
  );
}
