-- Skema database aplikasi FER Ensemble (PostgreSQL 16).
-- Dijalankan otomatis SEKALI saat volume database masih kosong (folder /docker-entrypoint-initdb.d).
-- Demi privasi, foto wajah tidak disimpan; yang disimpan hanya hasil prediksi.

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    full_name     VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,                 -- bcrypt, bukan password asli
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS predictions (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    source       VARCHAR(10) NOT NULL CHECK (source IN ('upload', 'webcam')),
    image_width  INTEGER,
    image_height INTEGER,
    n_faces      INTEGER     NOT NULL CHECK (n_faces >= 0),
    duration_ms  DOUBLE PRECISION,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_predictions_user_id ON predictions (user_id);
CREATE INDEX IF NOT EXISTS ix_predictions_user_waktu ON predictions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS prediction_faces (
    id            SERIAL PRIMARY KEY,
    prediction_id INTEGER          NOT NULL REFERENCES predictions (id) ON DELETE CASCADE,
    face_index    SMALLINT         NOT NULL,
    box_x         INTEGER          NOT NULL,
    box_y         INTEGER          NOT NULL,
    box_w         INTEGER          NOT NULL,
    box_h         INTEGER          NOT NULL,
    label         VARCHAR(10),                           -- NULL = "ekspresi kurang jelas" (keyakinan < tau)
    top_label     VARCHAR(10)      NOT NULL,
    confidence    DOUBLE PRECISION NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    probabilities JSONB            NOT NULL              -- probabilitas ketujuh kelas
);
CREATE INDEX IF NOT EXISTS ix_prediction_faces_prediction_id ON prediction_faces (prediction_id);

-- View ringkasan untuk laporan / pemeriksaan cepat lewat psql
CREATE OR REPLACE VIEW v_ringkasan_ekspresi AS
SELECT u.username,
       COALESCE(f.label, 'kurang_jelas') AS ekspresi,
       COUNT(*)                          AS jumlah_wajah,
       ROUND(AVG(f.confidence)::numeric, 3) AS rata_keyakinan
FROM prediction_faces f
JOIN predictions p ON p.id = f.prediction_id
JOIN users u       ON u.id = p.user_id
GROUP BY u.username, COALESCE(f.label, 'kurang_jelas');
