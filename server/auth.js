import jwt from 'jsonwebtoken';
import { query } from './db.js';
import { mapUserRow } from './utils.js';
import { AuthenticationError, ForbiddenError } from './errors.js';

const jwtSecret = process.env.JWT_SECRET || 'change-me-in-production';
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && jwtSecret === 'change-me-in-production') {
  throw new Error('JWT_SECRET must be configured in production.');
}

export function signToken(userId) {
  return jwt.sign(
    { userId: String(userId) },
    jwtSecret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'gems-flow-suite',
      audience: 'gems-flow-suite',
    },
  );
}

export async function loadAuthenticatedUser(userId) {
  const rows = await query(
    `SELECT id, email, username, full_name, role, status, must_change_password, company_id
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
    const payload = jwt.verify(token, jwtSecret, {
      issuer: 'gems-flow-suite',
      audience: 'gems-flow-suite',
    });
    const user = await loadAuthenticatedUser(payload.userId);

    if (!user) {
      throw new AuthenticationError('Session invalide');
    }

    if (user.status !== 'active') {
      throw new ForbiddenError("Compte désactivé. Contactez l'administrateur.");
    }

    request.user = user;
    return null;
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return reply.status(error.statusCode).json({ error: error.message });
    }

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
