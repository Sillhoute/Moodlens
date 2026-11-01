import express from 'express';

const STATUSES = ['todo', 'in_progress', 'done'];
const MAX_TITLE_LENGTH = 200;

const validateTitle = (title) => {
  if (typeof title !== 'string' || title.trim() === '') return 'Judul tugas wajib diisi';
  if (title.trim().length > MAX_TITLE_LENGTH) return `Judul maksimal ${MAX_TITLE_LENGTH} karakter`;
  return null;
};

const validateTaskFields = ({ title, description, status }) => {
  if (title !== undefined) {
    const error = validateTitle(title);
    if (error) return error;
  }
  if (description !== undefined && typeof description !== 'string') {
    return 'Deskripsi harus berupa teks';
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    return `Status harus salah satu dari: ${STATUSES.join(', ')}`;
  }
  return null;
};

export const createApp = (pool) => {
  const app = express();
  app.use(express.json());

  // Id di luar format angka tidak mungkin ada di tabel, jadi langsung dijawab 404.
  app.param('id', (_req, res, next, id) => {
    if (/^\d{1,9}$/.test(id)) return next();
    res.status(404).json({ message: 'Tugas tidak ditemukan' });
  });

  // Dipakai oleh healthcheck container dan smoke test pada tahap deploy.
  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', version: process.env.APP_VERSION ?? 'dev' });
    } catch {
      res.status(503).json({ status: 'error', message: 'Database tidak dapat diakses' });
    }
  });

  app.get('/api/tasks', async (_req, res) => {
    const { rows } = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC, id DESC');
    res.json(rows);
  });

  app.post('/api/tasks', async (req, res) => {
    const { title, description = '' } = req.body ?? {};
    const error = validateTitle(title) ?? validateTaskFields({ description });
    if (error) return res.status(400).json({ message: error });

    const { rows } = await pool.query(
      'INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *',
      [title.trim(), description.trim()],
    );
    res.status(201).json(rows[0]);
  });

  app.patch('/api/tasks/:id', async (req, res) => {
    const { title, description, status } = req.body ?? {};
    const error = validateTaskFields({ title, description, status });
    if (error) return res.status(400).json({ message: error });

    const { rows } = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [title?.trim(), description?.trim(), status, req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Tugas tidak ditemukan' });
    res.json(rows[0]);
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ message: 'Tugas tidak ditemukan' });
    res.status(204).end();
  });

  app.use((_req, res) => res.status(404).json({ message: 'Endpoint tidak ditemukan' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.status && err.status < 500) {
      return res.status(err.status).json({ message: 'Permintaan tidak valid' });
    }
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  });

  return app;
};
