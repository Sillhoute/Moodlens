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
      <header>
        <h1>MoodLens</h1>
        <p>Pengenalan ekspresi wajah dengan dua model deep learning.</p>
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
