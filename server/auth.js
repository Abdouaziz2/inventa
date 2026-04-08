import jwt from 'jsonwebtoken';
import { query } from './db.js';
import { mapUserRow } from './utils.js';

const jwtSecret = process.env.JWT_SECRET || 'change-me-in-production';

export function signToken(userId) {
  return jwt.sign({ userId: String(userId) }, jwtSecret, { expiresIn: '7d' });
}

export async function loadAuthenticatedUser(userId) {
  const rows = await query(
    `SELECT id, email, username, full_name, role, must_change_password, company_id
     FROM users
     WHERE id = :userId`,
    { userId }
  );

  const row = rows[0];
  return row ? mapUserRow(row) : null;
}

export async function requireAuth(request, reply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).json({ error: 'Non autorisé' });
  }

  try {
    const token = authHeader.slice('Bearer '.length);
    const payload = jwt.verify(token, jwtSecret);
    const user = await loadAuthenticatedUser(payload.userId);

    if (!user) {
      return reply.status(401).json({ error: 'Session invalide' });
    }

    request.user = user;
    return null;
  } catch {
    return reply.status(401).json({ error: 'Session invalide' });
  }
}

export async function requireSuperAdmin(request, reply) {
  const authResult = await requireAuth(request, reply);
  if (authResult) {
    return authResult;
  }

  if (request.user?.role !== 'super_admin') {
    return reply.status(403).json({ error: 'Accès réservé au Super Admin' });
  }

  return null;
}
