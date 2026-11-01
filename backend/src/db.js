import pg from 'pg';

// Koneksi dibaca otomatis dari variabel PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE.
export const createPool = () => new pg.Pool();

export const migrate = (pool) =>
  pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          SERIAL PRIMARY KEY,
      title       VARCHAR(200) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status      VARCHAR(20) NOT NULL DEFAULT 'todo'
                  CHECK (status IN ('todo', 'in_progress', 'done')),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
