import {
  EMOTION_COLORS,
  EMOTION_LABELS,
  boxToPercent,
  faceColor,
  faceLabel,
  formatPercent,
  topProbabilities,
} from '../labels.js';

export function AnnotatedImage({ src, result, alt, scanning = false }) {
  return (
    <div className="preview">
      <img src={src} alt={alt} />
      {scanning && <div className="scanline" />}
      {result?.faces.map((face) => (
        <div
          key={face.index}
          className={face.jelas ? 'face-box' : 'face-box unclear'}
          style={{ ...boxToPercent(face.box, result.image_width, result.image_height), '--face': faceColor(face) }}
        >
          <i />
          <i />
          <i />
          <i />
          <span>
            {face.index + 1}. {faceLabel(face)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ProbabilityBars({ probabilities, count }) {
  return (
    <ul className="bars">
      {topProbabilities(probabilities, count).map(({ emotion, score }) => (
        <li key={emotion}>
          <span className="bar-label">
            <span className="dot" style={{ background: EMOTION_COLORS[emotion] }} />
            {EMOTION_LABELS[emotion]}
          </span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: formatPercent(score), '--fill': EMOTION_COLORS[emotion] }} />
          </span>
          <span className="bar-value">{formatPercent(score)}</span>
        </li>
      ))}
    </ul>
  );
}

function FaceCard({ face }) {
  const color = faceColor(face);
  return (
    <section className="card face-card" style={{ '--face': color }}>
      <div className="face-header">
        <h4>Wajah {face.index + 1}</h4>
        <span
          className="pill"
          style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
        >
          {face.jelas ? `Yakin ${formatPercent(face.confidence)}` : 'Di bawah ambang keyakinan'}
        </span>
      </div>
      <p className="top-emotion" style={{ color }}>
        {faceLabel(face)}
      </p>
      {!face.jelas && (
        <p className="muted small">
          Kemungkinan terbesar {EMOTION_LABELS[face.top_label]} ({formatPercent(face.confidence)}), tetapi model belum
          cukup yakin.
        </p>
      )}
      <ProbabilityBars probabilities={face.probabilities} count={3} />
    </section>
  );
}

export function ResultPanel({ result, loading }) {
  if (loading) {
    return (
      <div className="card">
        <p className="muted">Mendeteksi wajah dan menghitung probabilitas...</p>
      </div>
    );
  }
  if (!result) return null;

  return (
    <div className="stack">
      {result.n_faces === 0 ? (
        <p className="notice">{result.message}</p>
      ) : (
        <div className="summary-line">
          <span className="pill chip">{result.message}</span>
          <span className="pill chip">{Math.round(result.duration_ms)} ms</span>
        </div>
      )}
      {result.faces.map((face) => (
        <FaceCard key={face.index} face={face} />
      ))}
    </div>
  );
}
