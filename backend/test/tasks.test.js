import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createPool, migrate } from '../src/db.js';

const pool = createPool();
const app = createApp(pool);

before(() => migrate(pool));
beforeEach(() => pool.query('TRUNCATE tasks RESTART IDENTITY'));
after(() => pool.end());

test('GET /api/health melaporkan status ok saat database terhubung', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('POST /api/tasks membuat tugas dengan status awal todo', async () => {
  const res = await request(app)
    .post('/api/tasks')
    .send({ title: '  Siapkan laporan  ', description: 'UTS DevOps' });
  assert.equal(res.status, 201);
  assert.equal(res.body.title, 'Siapkan laporan');
  assert.equal(res.body.description, 'UTS DevOps');
  assert.equal(res.body.status, 'todo');
});

test('POST /api/tasks menolak judul kosong dan judul terlalu panjang', async () => {
  const empty = await request(app).post('/api/tasks').send({ title: '   ' });
  assert.equal(empty.status, 400);
  const tooLong = await request(app).post('/api/tasks').send({ title: 'a'.repeat(201) });
  assert.equal(tooLong.status, 400);
});

test('GET /api/tasks menampilkan tugas terbaru lebih dulu', async () => {
  await request(app).post('/api/tasks').send({ title: 'Pertama' });
  await request(app).post('/api/tasks').send({ title: 'Kedua' });
  const res = await request(app).get('/api/tasks');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.map((task) => task.title), ['Kedua', 'Pertama']);
});

test('PATCH /api/tasks/:id mengubah status tanpa mengubah kolom lain', async () => {
  const created = await request(app).post('/api/tasks').send({ title: 'Deploy', description: 'CD' });
  const res = await request(app).patch(`/api/tasks/${created.body.id}`).send({ status: 'done' });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'done');
  assert.equal(res.body.title, 'Deploy');
  assert.equal(res.body.description, 'CD');
});

test('PATCH /api/tasks/:id menolak status tidak valid dan id yang tidak ada', async () => {
  const created = await request(app).post('/api/tasks').send({ title: 'Deploy' });
  const invalid = await request(app).patch(`/api/tasks/${created.body.id}`).send({ status: 'selesai' });
  assert.equal(invalid.status, 400);
  const missing = await request(app).patch('/api/tasks/9999').send({ status: 'done' });
  assert.equal(missing.status, 404);
  const malformed = await request(app).patch('/api/tasks/abc').send({ status: 'done' });
  assert.equal(malformed.status, 404);
});

test('DELETE /api/tasks/:id menghapus tugas', async () => {
  const created = await request(app).post('/api/tasks').send({ title: 'Hapus saya' });
  const res = await request(app).delete(`/api/tasks/${created.body.id}`);
  assert.equal(res.status, 204);
  const again = await request(app).delete(`/api/tasks/${created.body.id}`);
  assert.equal(again.status, 404);
});

test('JSON yang rusak dijawab 400, bukan 500', async () => {
  const res = await request(app)
    .post('/api/tasks')
    .set('Content-Type', 'application/json')
    .send('{"title":');
  assert.equal(res.status, 400);
});
