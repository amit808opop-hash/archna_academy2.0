import express, { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { getDb } from './db.js';
import { apiRouter } from './routes.js';

export function createApp(): Express {
  const app = express();

  // 1. Universal CORS middleware for Vercel, local dev, and custom domains
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, PATCH, OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, Origin'
      );
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, PATCH, OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, Origin'
      );
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // 2. Request body parsers & cookies
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // 3. Ensure database is initialized before any route executes (critical for Vercel serverless cold starts)
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getDb();
      next();
    } catch (err: any) {
      console.error('[ARCHNA ACADEMY] Database startup error:', err);
      res.status(503).json({ error: 'Database service initializing. Please try again shortly.' });
    }
  });

  // 4. Health check endpoint (both /api/health and /health)
  const healthCheck = (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      app: 'ARCHNA ACADEMY – Student Attendance Management Portal',
      timestamp: new Date().toISOString(),
    });
  };

  app.get('/api/health', healthCheck);
  app.get('/health', healthCheck);

  // 5. Mount API router on both '/api' and '/'
  // This guarantees all endpoints match whether Vercel rewrites to /api or strips the prefix
  app.use('/api', apiRouter);
  app.use(apiRouter);

  return app;
}
