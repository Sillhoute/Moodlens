import { createApp } from './app.js';
import { createPool, migrate } from './db.js';

const port = Number(process.env.PORT ?? 3000);
const pool = createPool();

await migrate(pool);

const server = createApp(pool).listen(port, () => {
  console.log(`TaskFlow backend berjalan pada port ${port}`);
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
