import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './server/db.js';
import { apiRouter } from './server/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    // Initialize SQLite database and seed initial admin, classes, and students
    await getDb();
    console.log('[ARCHNA ACADEMY] SQLite Database initialized successfully.');

    const app = express();
    const PORT = parseInt(process.env.PORT || '3000', 10);

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Mount API router
    app.use('/api', apiRouter);

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        app: 'ARCHNA ACADEMY – Student Attendance Management Portal',
        timestamp: new Date().toISOString(),
      });
    });

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
