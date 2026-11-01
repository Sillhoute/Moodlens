import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createPool, migrate } from '../src/db.js';
import { MlError } from '../src/ml.js';

const pool = createPool();
const IMAGE = Buffer.from('gambar');

const probabilities = { angry: 0, disgust: 0, fear: 0, happy: 0.9, neutral: 0.1, sad: 0, surprise: 0 };
const faceResult = (emotion = 'happy') => ({ emotion, score: 0.9, probabilities });

// Layanan model diganti dengan versi palsu; integrasi aslinya diuji di ml-service dan smoke test.
const fakeMl = {
  healthy: true,
  response: null,
  error: null,
  lastCall: null,
  async predict(buffer, mimetype, models) {
    this.lastCall = { buffer, mimetype, models };
    if (this.error) throw this.error;
    return this.response;
  },
  async isHealthy() {
    return this.healthy;
  },
};

const app = createApp({ pool, ml: fakeMl });

const send = (fields = {}, type = 'image/jpeg') => {
  const req = request(app)
    .post('/api/predictions')
    .attach('image', IMAGE, { filename: 'foto.jpg', contentType: type });
  for (const [name, value] of Object.entries(fields)) req.field(name, value);
  return req;
};

before(() => migrate(pool));
after(() => pool.end());
beforeEach(async () => {
  await pool.query('TRUNCATE predictions RESTART IDENTITY');
  fakeMl.healthy = true;
  fakeMl.error = null;
  fakeMl.lastCall = null;
  fakeMl.response = {
    image: { width: 100, height: 100 },
    faces: [{ box: { x: 1, y: 2, width: 50, height: 50 }, results: { resnet: faceResult() } }],
    latency_ms: { resnet: 12.5 },
  };
});

test('GET /api/health melaporkan ok saat database dan model siap', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.database, true);
  assert.equal(res.body.model, true);
});

test('GET /api/health menjawab 503 saat layanan model mati', async () => {
  fakeMl.healthy = false;
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 503);
  assert.equal(res.body.model, false);
});

test('POST /api/predictions meneruskan gambar ke model dan menyimpan hasil', async () => {
  const res = await send();
  assert.equal(res.status, 200);
  assert.equal(res.body.saved, 1);
  assert.equal(res.body.faces[0].results.resnet.emotion, 'happy');
  assert.deepEqual(fakeMl.lastCall.buffer, IMAGE);
  assert.deepEqual(fakeMl.lastCall.models, ['resnet']);

  const { rows } = await pool.query('SELECT * FROM predictions');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source, 'upload');
  assert.equal(rows[0].model, 'resnet');
  assert.equal(rows[0].emotion, 'happy');
  assert.equal(rows[0].latency_ms, 12.5);
  assert.deepEqual(rows[0].probabilities, probabilities);
});

test('Mode bandingkan menyimpan satu baris per model untuk setiap wajah', async () => {
  fakeMl.response.faces[0].results.vanilla = faceResult('neutral');
  fakeMl.response.latency_ms.vanilla = 3;
  const res = await send({ models: 'vanilla,resnet' });
  assert.equal(res.body.saved, 2);
  assert.deepEqual(fakeMl.lastCall.models, ['vanilla', 'resnet']);
});

test('save=false tidak menulis riwayat, untuk frame kamera', async () => {
  const res = await send({ source: 'camera', save: 'false', models: 'vanilla' });
  assert.equal(res.status, 200);
  assert.equal(res.body.saved, 0);
  const { rows } = await pool.query('SELECT id FROM predictions');
  assert.equal(rows.length, 0);
});

test('Gambar tanpa wajah tidak menulis riwayat', async () => {
  fakeMl.response = { image: { width: 10, height: 10 }, faces: [], latency_ms: {} };
  const res = await send();
  assert.equal(res.status, 200);
  assert.equal(res.body.saved, 0);
});

test('Permintaan tidak valid ditolak sebelum sampai ke model', async () => {
  const noFile = await request(app).post('/api/predictions').field('models', 'resnet');
  assert.equal(noFile.status, 400);
  assert.equal((await send({ models: 'mobilenet' })).status, 400);
  assert.equal((await send({ source: 'lainnya' })).status, 400);
  assert.equal((await send({}, 'application/pdf')).status, 415);
  assert.equal(fakeMl.lastCall, null);
});

test('Gambar lebih dari 5 MB ditolak', async () => {
  const res = await request(app)
    .post('/api/predictions')
    .attach('image', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'besar.jpg', contentType: 'image/jpeg' });
  assert.equal(res.status, 413);
});

test('Kesalahan dari layanan model diteruskan dengan status yang sesuai', async () => {
  fakeMl.error = new MlError(400, 'Gambar tidak dapat dibaca');
  const invalid = await send();
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.message, 'Gambar tidak dapat dibaca');

  fakeMl.error = new MlError(503, 'Layanan model tidak dapat dihubungi');
  assert.equal((await send()).status, 503);
});

test('Riwayat dan statistik mengikuti prediksi yang tersimpan, lalu bisa dihapus', async () => {
  await send();
  await send();
  fakeMl.response.faces[0].results.resnet = faceResult('sad');
  await send();

  const history = await request(app).get('/api/predictions');
  assert.deepEqual(history.body.map((row) => row.emotion), ['sad', 'happy', 'happy']);

  const stats = await request(app).get('/api/predictions/stats');
  assert.deepEqual(stats.body, [
    { emotion: 'happy', count: 2 },
    { emotion: 'sad', count: 1 },
  ]);

  assert.equal((await request(app).delete('/api/predictions')).status, 204);
  assert.deepEqual((await request(app).get('/api/predictions')).body, []);
});
