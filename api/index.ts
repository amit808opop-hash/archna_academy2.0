import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../server/app.js';
import { getDb } from '../server/db.js';

// Instantiate the Express application
const app = createApp();

// Asynchronously warm up the SQLite database and seed initial accounts
let initPromise: Promise<any> | null = null;
function ensureInitialized() {
  if (!initPromise) {
    initPromise = getDb().catch((err) => {
      console.warn('[Vercel Serverless] DB initialization warning:', err);
    });
  }
  return initPromise;
}

// Vercel Serverless Function Handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureInitialized();
  return app(req, res);
}
