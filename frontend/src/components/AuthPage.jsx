import { useState } from 'react';
import { login, register } from '../api.js';
import ModelInfoTab from './ModelInfoTab.jsx';

const EMPTY_FORM = { username: '', password: '', full_name: '' };

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
      <section className="card auth-card">
        <div className="segmented" role="tablist">
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
              <input value={form.full_name} maxLength={100} onChange={update('full_name')} autoComplete="name" />
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
            />
            {mode === 'register' && <small className="muted">Minimal 8 karakter</small>}
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
      </section>

      <button type="button" className="link-button" onClick={() => setShowInfo((value) => !value)}>
        {showInfo ? 'Sembunyikan info model' : 'Lihat info model tanpa login'}
      </button>
      {showInfo && <ModelInfoTab />}
    </div>
  );
}
