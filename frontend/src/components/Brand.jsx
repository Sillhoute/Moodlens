// Logo: dua lingkaran yang saling bertumpuk melambangkan ensemble dua model, dengan senyum di tengahnya.
export function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="0.5" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#logo-gradient)" />
      <circle cx="16" cy="20" r="9" fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="2" />
      <circle cx="24" cy="20" r="9" fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="2" />
      <path d="M16.5 22.5q3.5 3 7 0" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="17.5" cy="17.5" r="1.3" fill="#ffffff" />
      <circle cx="22.5" cy="17.5" r="1.3" fill="#ffffff" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <div className="wordmark">
      <Logo />
      <span>
        FER <strong>Ensemble</strong>
      </span>
    </div>
  );
}

// Titik dan garis tipis di latar belakang; posisinya tetap agar tampilan tidak berubah setiap kali dimuat.
const NODES = [
  [6, 12], [18, 28], [30, 8], [44, 22], [12, 52], [26, 66], [8, 84], [38, 78], [56, 60], [64, 14],
  [76, 30], [90, 10], [84, 52], [94, 70], [70, 86], [52, 94], [96, 92], [60, 40],
];
const LINKS = [
  [0, 1], [1, 2], [1, 3], [3, 9], [4, 5], [5, 7], [6, 7], [7, 8], [8, 17], [9, 10], [10, 11],
  [10, 17], [12, 13], [12, 17], [13, 16], [14, 15], [14, 8], [4, 1],
];

export function Backdrop() {
  return (
    <svg className="backdrop" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {LINKS.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={NODES.at(a)[0]}
          y1={NODES.at(a)[1]}
          x2={NODES.at(b)[0]}
          y2={NODES.at(b)[1]}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {NODES.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.35" />
      ))}
    </svg>
  );
}
