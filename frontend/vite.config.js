import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Saat development tanpa container, /api diteruskan ke backend lokal.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
