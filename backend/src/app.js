import express from 'express';
import multer from 'multer';
import { MlError } from './ml.js';

const MODELS = ['vanilla', 'resnet'];
const SOURCES = ['upload', 'camera'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const clientError = (status, message) => Object.assign(new Error(message), { status, expose: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (IMAGE_TYPES.includes(file.mimetype)) return callback(null, true);
    callback(clientError(415, 'Format gambar harus JPEG, PNG, atau WebP'));
  },
});

const parseModels = (value) => {
  const models = [...new Set(String(value ?? 'resnet').split(',').map((name) => name.trim()))];
  return models.every((name) => MODELS.includes(name)) ? models : null;
};

const toHistoryRows = (result, source) =>
  result.faces.flatMap((face) =>
    Object.entries(face.results).map(([model, prediction]) => ({
      source,
      model,
      emotion: prediction.emotion,
      score: prediction.score,
      probabilities: prediction.probabilities,
      latency_ms: result.latency_ms?.[model] ?? null,
    })),
  );

export const createApp = ({ pool, ml }) => {
  const app = express();

  // Dipakai oleh healthcheck container dan smoke test pada tahap deploy.
  app.get('/api/health', async (_req, res) => {
    const [database, model] = await Promise.all([
      pool.query('SELECT 1').then(() => true, () => false),
      ml.isHealthy(),
    ]);
    res.status(database && model ? 200 : 503).json({
      status: database && model ? 'ok' : 'error',
      database,
      model,
      version: process.env.APP_VERSION ?? 'dev',
    });
  });

  app.post('/api/predictions', upload.single('image'), async (req, res) => {
    if (!req.file) throw clientError(400, 'Gambar wajib dikirim');

    const models = parseModels(req.body.models);
    if (!models) throw clientError(400, `Model harus salah satu dari: ${MODELS.join(', ')}`);

    const source = req.body.source ?? 'upload';
    if (!SOURCES.includes(source)) throw clientError(400, `Sumber harus salah satu dari: ${SOURCES.join(', ')}`);

    const result = await ml.predict(req.file.buffer, req.file.mimetype, models);

    const rows = req.body.save === 'false' ? [] : toHistoryRows(result, source);
    if (rows.length > 0) {
      await pool.query(
        `INSERT INTO predictions (source, model, emotion, score, probabilities, latency_ms)
         SELECT source, model, emotion, score, probabilities, latency_ms
         FROM jsonb_to_recordset($1::jsonb) AS row(
           source text, model text, emotion text, score real, probabilities jsonb, latency_ms real
         )`,
        [JSON.stringify(rows)],
      );
    }
    res.json({ ...result, saved: rows.length });
  });

  app.get('/api/predictions', async (_req, res) => {
    const { rows } = await pool.query('SELECT * FROM predictions ORDER BY created_at DESC, id DESC LIMIT 50');
    res.json(rows);
  });

  app.get('/api/predictions/stats', async (_req, res) => {
    const { rows } = await pool.query(
      'SELECT emotion, COUNT(*)::int AS count FROM predictions GROUP BY emotion ORDER BY count DESC, emotion',
    );
    res.json(rows);
  });

  app.delete('/api/predictions', async (_req, res) => {
    await pool.query('DELETE FROM predictions');
    res.status(204).end();
  });

  app.use((_req, res) => res.status(404).json({ message: 'Endpoint tidak ditemukan' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran gambar maksimal 5 MB' : 'Unggahan tidak valid';
      return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message });
    }
    if (err instanceof MlError || err.expose) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  });

  return app;
};
