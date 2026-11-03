import { useEffect, useState } from 'react';
import { getMe, hasToken, logout, onUnauthorized } from './api.js';
import AuthPage from './components/AuthPage.jsx';
import HistoryTab from './components/HistoryTab.jsx';
import ModelInfoTab from './components/ModelInfoTab.jsx';
import RecognizeTab from './components/RecognizeTab.jsx';
import StatsTab from './components/StatsTab.jsx';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'local';

const TABS = [
  { id: 'recognize', label: 'Kenali Ekspresi', Component: RecognizeTab },
  { id: 'history', label: 'Riwayat', Component: HistoryTab },
  { id: 'stats', label: 'Statistik', Component: StatsTab },
  { id: 'model', label: 'Info Model', Component: ModelInfoTab },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(hasToken());
  const [activeId, setActiveId] = useState('recognize');
  const [sessionMessage, setSessionMessage] = useState('');

  useEffect(() => {
    onUnauthorized(() => {
      setUser(null);
      setSessionMessage('Sesi login sudah berakhir. Silakan masuk lagi.');
    });
    if (!hasToken()) return;
    getMe()
      .then(setUser)
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setSessionMessage('');
    setActiveId('recognize');
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  const { Component } = TABS.find((tab) => tab.id === activeId);

  return (
    <div className="page">
<<<<<<< HEAD
      <header className="hero">
        <div className="brand-mark" aria-hidden="true">M</div>
        <div className="hero-copy">
          <p className="eyebrow">STUDIO ANALISIS EKSPRESI</p>
          <h1>MoodLens<span>.</span></h1>
          <p className="hero-description">
            Kenali ekspresi wajah dengan bantuan model deep learning.
          </p>
        </div>
        <div className="hero-note">
          <span className="status-dot" aria-hidden="true" />
          <span>Privasi tetap terjaga</span>
        </div>
=======
      <header className="app-header">
        <div>
          <h1>FER Ensemble</h1>
          <p>Pengenalan ekspresi wajah dengan ensemble CNN dan ResNet50.</p>
        </div>
        {user && (
          <div className="user-menu">
            <span>{user.full_name || user.username}</span>
            <button type="button" onClick={handleLogout}>
              Keluar
            </button>
          </div>
        )}
>>>>>>> 9cf66ed2e2d59d54fa13e0b2f0d78ea92ae2a6b3
      </header>

      {checking ? (
        <p className="muted">Memuat...</p>
      ) : user ? (
        <>
          <nav className="tabs" aria-label="Menu utama">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={tab.id === activeId ? 'tab active' : 'tab'}
                aria-current={tab.id === activeId ? 'page' : undefined}
                onClick={() => setActiveId(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <main>
            <Component />
          </main>
        </>
      ) : (
        <AuthPage onLogin={handleLogin} message={sessionMessage} />
      )}

      <footer>Versi deploy: {APP_VERSION}</footer>
    </div>
  );
}
