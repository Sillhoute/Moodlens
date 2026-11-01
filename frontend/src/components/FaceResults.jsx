import { EMOTION_LABELS, MODEL_LABELS, boxToPercent, formatPercent, topEmotions } from '../emotions.js';

export function FaceBoxes({ faces, image, mirrored = false }) {
  return faces.map((face, index) => (
    <div key={index} className="face-box" style={boxToPercent(face.box, image, { mirrored })}>
      <span>{index + 1}</span>
    </div>
  ));
}

function ModelResult({ model, result, latency }) {
  return (
    <div className="model-result">
      <h4>
        {MODEL_LABELS[model]}
        {latency !== undefined && <small>{Math.round(latency)} ms</small>}
      </h4>
      <p className="top-emotion">{EMOTION_LABELS[result.emotion]}</p>
      <ul className="bars">
        {topEmotions(result.probabilities).map(({ emotion, score }) => (
          <li key={emotion}>
            <span className="bar-label">{EMOTION_LABELS[emotion]}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: formatPercent(score) }} />
            </span>
            <span className="bar-value">{formatPercent(score)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FaceResults({ result }) {
  return result.faces.map((face, index) => (
    <section className="card" key={index}>
      <h3>Wajah {index + 1}</h3>
      <div className="model-grid">
        {Object.entries(face.results).map(([model, modelResult]) => (
          <ModelResult key={model} model={model} result={modelResult} latency={result.latency_ms[model]} />
        ))}
      </div>
    </section>
  ));
}
