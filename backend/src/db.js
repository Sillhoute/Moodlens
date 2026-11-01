import pg from 'pg';

// Koneksi dibaca otomatis dari variabel PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE.
export const createPool = () => new pg.Pool();

// Riwayat hanya menyimpan hasil prediksi. Foto wajah tidak pernah masuk ke database.
export const migrate = (pool) =>
  pool.query(`
    CREATE TABLE IF NOT EXISTS predictions (
      id            SERIAL PRIMARY KEY,
      source        VARCHAR(20) NOT NULL,
      model         VARCHAR(20) NOT NULL,
      emotion       VARCHAR(20) NOT NULL,
      score         REAL NOT NULL,
      probabilities JSONB NOT NULL,
      latency_ms    REAL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
