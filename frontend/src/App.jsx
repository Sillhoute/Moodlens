import { useEffect, useState } from 'react';
import { getHealth } from './api.js';
import AboutTab from './components/AboutTab.jsx';
import CameraTab from './components/CameraTab.jsx';
import HistoryTab from './components/HistoryTab.jsx';
import PhotoTab from './components/PhotoTab.jsx';

const TABS = [
  { id: 'photo', label: 'Foto', Component: PhotoTab },
  { id: 'camera', label: 'Kamera', Component: CameraTab },
  { id: 'history', label: 'Riwayat', Component: HistoryTab },
  { id: 'about', label: 'Tentang Model', Component: AboutTab },
];

export default function App() {
  const [activeId, setActiveId] = useState('photo');
  const [version, setVersion] = useState('');

  useEffect(() => {
    getHealth()
      .then((health) => setVersion(health.version))
      .catch(() => {});
  }, []);

  const { Component } = TABS.find((tab) => tab.id === activeId);

  return (
    <div className="page">
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
      </header>

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

      <footer>Versi deploy: {version || '-'}</footer>
    </div>
  );
}
