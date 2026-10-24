import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './server/db.js';
import { createApp } from './server/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    // Initialize SQLite database and seed initial admin, classes, and students
    await getDb();
    console.log('[ARCHNA ACADEMY] SQLite Database initialized successfully.');

    const app = createApp();
    const PORT = parseInt(process.env.PORT || '3000', 10);

    if (process.env.NODE_ENV === 'production') {
      const distPath = path.resolve(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[ARCHNA ACADEMY] Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('[ARCHNA ACADEMY] Server startup failure:', error);
    process.exit(1);
  }
}

startServer();
