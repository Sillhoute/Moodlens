import { EMOTION_LABELS, boxToPercent, faceLabel, formatPercent, topProbabilities } from '../labels.js';

export function AnnotatedImage({ src, result, alt }) {
  return (
    <div className="preview">
      <img src={src} alt={alt} />
      {result?.faces.map((face) => (
        <div
          key={face.index}
          className={face.jelas ? 'face-box' : 'face-box unclear'}
          style={boxToPercent(face.box, result.image_width, result.image_height)}
        >
          <span>
            {face.index + 1}. {faceLabel(face)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function FaceCards({ result }) {
  return result.faces.map((face) => (
    <section className="card" key={face.index}>
      <div className="face-header">
        <h3>Wajah {face.index + 1}</h3>
        <span className={face.jelas ? 'badge' : 'badge muted-badge'}>
          {face.jelas ? `Yakin ${formatPercent(face.confidence)}` : 'Di bawah ambang keyakinan'}
        </span>
      </div>
      <p className="top-emotion">{faceLabel(face)}</p>
      {!face.jelas && (
        <p className="muted small">
          Kemungkinan terbesar {EMOTION_LABELS[face.top_label]} ({formatPercent(face.confidence)}), tetapi belum
          cukup yakin.
        </p>
      )}
      <ul className="bars">
        {topProbabilities(face.probabilities).map(({ emotion, score }) => (
          <li key={emotion}>
            <span className="bar-label">{EMOTION_LABELS[emotion]}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: formatPercent(score) }} />
            </span>
            <span className="bar-value">{formatPercent(score)}</span>
          </li>
        ))}
      </ul>
    </section>
  ));
}

export function ResultPanel({ result, loading }) {
  return (
    <div className="stack">
      {loading && <p className="muted">Menganalisis foto...</p>}
      {result && (
        <p className={result.n_faces === 0 ? 'notice' : 'muted small'}>
          {result.message} Diproses dalam {Math.round(result.duration_ms)} ms.
        </p>
      )}
      {result && <FaceCards result={result} />}
    </div>
  );
}
