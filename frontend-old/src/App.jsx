import { useEffect, useState } from 'react';
import { getMe, hasToken, logout, onUnauthorized } from './api.js';
import AuthPage from './components/AuthPage.jsx';
import { Backdrop, Wordmark } from './components/Brand.jsx';
import HistoryTab from './components/HistoryTab.jsx';
import { ChartIcon, ChipIcon, HistoryIcon, LogoutIcon, ScanIcon } from './components/Icons.jsx';
import ModelInfoTab from './components/ModelInfoTab.jsx';
import RecognizeTab from './components/RecognizeTab.jsx';
import StatsTab from './components/StatsTab.jsx';
import { initials } from './labels.js';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'local';

const TABS = [
  { id: 'recognize', label: 'Kenali', Icon: ScanIcon, Component: RecognizeTab },
  { id: 'history', label: 'Riwayat', Icon: HistoryIcon, Component: HistoryTab },
  { id: 'stats', label: 'Statistik', Icon: ChartIcon, Component: StatsTab },
  { id: 'model', label: 'Info Model', Icon: ChipIcon, Component: ModelInfoTab },
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
    <div className="shell">
      <Backdrop />
      <div className="gradient-bar" />

      <header className="topbar">
        <div className="container topbar-inner">
          <Wordmark />
          {user && (
            <>
              <nav className="nav" aria-label="Menu utama">
                {TABS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={id === activeId ? 'active' : ''}
                    aria-current={id === activeId ? 'page' : undefined}
                    onClick={() => setActiveId(id)}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </nav>
              <div className="user-menu">
                <span className="avatar" aria-hidden="true">
                  {initials(user)}
                </span>
                <span className="user-name">{user.full_name || user.username}</span>
                <button type="button" className="ghost icon-button" onClick={handleLogout} title="Keluar">
                  <LogoutIcon size={18} />
                  <span className="sr-only">Keluar</span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="container">
        {checking ? (
          <p className="muted">Memuat...</p>
        ) : user ? (
          <Component />
        ) : (
          <AuthPage onLogin={handleLogin} message={sessionMessage} />
        )}
      </main>

      <footer>
        <div className="container footer-inner">
          <span>FER Ensemble · UTS Deep Learning dan DevOps</span>
          <span>
            Versi deploy: <code>{APP_VERSION}</code>
          </span>
        </div>
      </footer>
    </div>
  );
}
