import { createApp } from './app.js';
import { createPool, migrate } from './db.js';
import { createMlClient } from './ml.js';

const port = Number(process.env.PORT ?? 3000);
const pool = createPool();
const ml = createMlClient(process.env.ML_URL ?? 'http://localhost:8000');

await migrate(pool);

const server = createApp({ pool, ml }).listen(port, () => {
  console.log(`MoodLens backend berjalan pada port ${port}`);
});

// docker stop mengirim SIGTERM; tutup koneksi dengan rapi agar deploy tidak memutus request.
const shutdown = () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
