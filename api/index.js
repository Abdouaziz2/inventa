import { app } from '../server/index.js';
import { ensureMigrations } from '../server/db.js';

export default async function handler(request, response) {
  try {
    await ensureMigrations();
  } catch (error) {
    console.error('Unable to prepare database schema:', error);
    return response.status(500).json({ error: 'Base de données non prête. Vérifiez DATABASE_URL et DIRECT_URL dans Vercel.' });
  }

  return app(request, response);
}
