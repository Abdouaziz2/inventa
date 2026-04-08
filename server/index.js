import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { query, runMigrations, transaction } from './db.js';
import {
  USER_ROLES,
  USER_STATUS,
  JEWELRY_CATEGORIES,
  JEWELRY_MATERIALS,
  JEWELRY_STATUSES,
  buildManagedLoginEmail,
  hashPassword,
  mapClientRow,
  mapDepositRow,
  mapJewelryRow,
  mapProfileRow,
  mapReservationRow,
  mapSaleRow,
  normalizeUsername,
  verifyPassword,
} from './utils.js';
import { requireAuth, requireSuperAdmin, signToken } from './auth.js';

const app = express();
const port = Number(process.env.API_PORT || 3001);
const uploadsDir = path.resolve('public', 'uploads');

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, uploadsDir),
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname) || '.png';
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

function handleError(response, error) {
  const message = error instanceof Error ? error.message : 'Erreur serveur';
  return response.status(500).json({ error: message });
}

function parseId(value) {
  return Number.parseInt(String(value), 10);
}

function ensureInSet(value, allowedValues, message) {
  if (!allowedValues.includes(value)) {
    throw new Error(message);
  }
}

function isSuperAdmin(user) {
  return user?.role === 'super_admin';
}

function getCompanyId(user) {
  return parseId(user?.companyId || user?.id);
}

function getScopeClause(user, alias = '') {
  if (isSuperAdmin(user)) {
    return { clause: '1 = 1', params: {} };
  }

  const prefix = alias ? `${alias}.` : '';
  return {
    clause: `${prefix}company_id = :companyId`,
    params: { companyId: getCompanyId(user) },
  };
}

async function createClientCode(connection) {
  const [rows] = await connection.execute('SELECT COUNT(*) AS total FROM clients');
  const total = Number(rows[0].total ?? 0) + 1;
  return `CL-${String(total).padStart(4, '0')}`;
}

async function createJewelryCode(connection) {
  let code = '';
  let exists = true;

  while (exists) {
    code = `JW-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
    const [rows] = await connection.execute(
      `SELECT id
       FROM jewelry
       WHERE code = ?
       LIMIT 1`,
      [code],
    );
    exists = Boolean(rows[0]);
  }

  return code;
}

function normalizeJewelryStatus(quantity, status) {
  if (quantity <= 0) return 'out_of_stock';
  if (status === 'out_of_stock') return 'available';
  return status || 'available';
}

app.post('/api/auth/login', async (request, response) => {
  const identifier = String(request.body.identifier ?? '').trim();
  const password = String(request.body.password ?? '');

  try {
    const rows = await query(
      `SELECT *
       FROM users
       WHERE username = :username OR email = :email
       LIMIT 1`,
      {
        username: normalizeUsername(identifier),
        email: identifier.toLowerCase(),
      }
    );

    const user = rows[0];
    if (!user) {
      return response.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutes = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      return response.status(423).json({ error: `Compte verrouillé. Réessayez dans ${minutes} minute(s).` });
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      const failedAttempts = Number(user.failed_login_attempts ?? 0) + 1;
      const shouldLock = failedAttempts >= 5;

      await query(
        `UPDATE users
         SET failed_login_attempts = :failedAttempts,
             locked_until = :lockedUntil
         WHERE id = :userId`,
        {
          failedAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null,
          userId: user.id,
        }
      );

      return response.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    if (user.status !== 'active') {
      return response.status(403).json({ error: 'Compte désactivé. Contactez l’administrateur.' });
    }

    await query(
      `UPDATE users
       SET failed_login_attempts = 0,
           locked_until = NULL
       WHERE id = :userId`,
      { userId: user.id }
    );

    return response.json({
      token: signToken(user.id),
      user: {
        id: String(user.id),
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        mustChangePassword: Boolean(user.must_change_password),
        companyId: user.company_id ? String(user.company_id) : null,
      },
    });
  } catch (error) {
    return handleError(response, error);
  }
});

app.get('/api/auth/me', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;
  return response.json({ user: request.user });
});

app.post('/api/auth/change-password', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  const password = String(request.body.password ?? '');
  if (password.length < 6) {
    return response.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  try {
    const passwordHash = await hashPassword(password);
    await query(
      `UPDATE users
       SET password_hash = :passwordHash,
           must_change_password = 0
       WHERE id = :userId`,
      {
        passwordHash,
        userId: parseId(request.user.id),
      }
    );

    const rows = await query(
      'SELECT id, email, username, full_name, role, must_change_password, company_id FROM users WHERE id = :userId',
      { userId: parseId(request.user.id) }
    );

    const user = rows[0];
    return response.json({
      user: {
        id: String(user.id),
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        mustChangePassword: Boolean(user.must_change_password),
        companyId: user.company_id ? String(user.company_id) : null,
      },
    });
  } catch (error) {
    return handleError(response, error);
  }
});

app.get('/api/profile', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const rows = await query('SELECT * FROM users WHERE id = :userId', { userId: parseId(request.user.id) });
    if (!rows[0]) {
      return response.status(404).json({ error: 'Profil introuvable' });
    }
    return response.json({ profile: mapProfileRow(rows[0]) });
  } catch (error) {
    return handleError(response, error);
  }
});

app.patch('/api/profile', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  const { full_name, business_name, phone, secondary_phone, address, logo } = request.body;

  try {
    await query(
      `UPDATE users
       SET full_name = :full_name,
           business_name = :business_name,
           phone = :phone,
           secondary_phone = :secondary_phone,
           address = :address,
           logo = :logo
       WHERE id = :userId`,
      {
        full_name,
        business_name,
        phone,
        secondary_phone,
        address,
        logo,
        userId: parseId(request.user.id),
      }
    );

    const rows = await query('SELECT * FROM users WHERE id = :userId', { userId: parseId(request.user.id) });
    return response.json({ profile: mapProfileRow(rows[0]) });
  } catch (error) {
    return handleError(response, error);
  }
});

app.post('/api/profile/logo', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  upload.single('logo')(request, response, async (uploadError) => {
    if (uploadError) {
      return response.status(400).json({ error: uploadError.message });
    }

    if (!request.file) {
      return response.status(400).json({ error: 'Aucun fichier envoyé' });
    }

    const logoUrl = `${request.protocol}://${request.get('host')}/uploads/${request.file.filename}`;

    try {
      await query('UPDATE users SET logo = :logo WHERE id = :userId', {
        logo: logoUrl,
        userId: parseId(request.user.id),
      });
      return response.json({ url: logoUrl });
    } catch (error) {
      return handleError(response, error);
    }
  });
});

app.get('/api/clients', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const scope = getScopeClause(request.user);
    const rows = await query(
      `SELECT *
       FROM clients
       WHERE ${scope.clause}
       ORDER BY created_at DESC`,
      scope.params,
    );
    return response.json({ clients: rows.map(mapClientRow) });
  } catch (error) {
    return handleError(response, error);
  }
});

app.get('/api/clients/:id', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const scope = getScopeClause(request.user);
    const rows = await query(
      `SELECT *
       FROM clients
       WHERE id = :id
         AND ${scope.clause}
       LIMIT 1`,
      { id: parseId(request.params.id), ...scope.params }
    );
    if (!rows[0]) {
      return response.status(404).json({ error: 'Client introuvable' });
    }
    return response.json({ client: mapClientRow(rows[0]) });
  } catch (error) {
    return handleError(response, error);
  }
});

app.post('/api/clients', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  const { name, phone, email } = request.body;

  try {
    const client = await transaction(async (connection) => {
      const code = await createClientCode(connection);
      const [result] = await connection.execute(
        `INSERT INTO clients (code, company_id, name, phone, email, balance, created_by)
         VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [code, getCompanyId(request.user), name, phone || '', email || null, parseId(request.user.id)]
      );
      const [rows] = await connection.execute('SELECT * FROM clients WHERE id = ?', [result.insertId]);
      return mapClientRow(rows[0]);
    });

    return response.status(201).json({ client });
  } catch (error) {
    return handleError(response, error);
  }
});

app.patch('/api/clients/:id/balance', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const scope = getScopeClause(request.user);
    await query(
      `UPDATE clients
       SET balance = :balance
       WHERE id = :id
         AND ${scope.clause}`,
      {
        balance: Number(request.body.balance ?? 0),
        id: parseId(request.params.id),
        ...scope.params,
      }
    );
    return response.json({ success: true });
  } catch (error) {
    return handleError(response, error);
  }
});

app.get('/api/jewelry', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const scope = getScopeClause(request.user);
    const rows = await query(
      `SELECT *
       FROM jewelry
       WHERE ${scope.clause}
       ORDER BY created_at DESC`,
      scope.params,
    );
    return response.json({ jewelry: rows.map(mapJewelryRow) });
  } catch (error) {
    return handleError(response, error);
  }
});

app.post('/api/jewelry', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  const payload = request.body;

  try {
    ensureInSet(payload.category || 'other', JEWELRY_CATEGORIES, 'Catégorie invalide');
    ensureInSet(payload.material_type || 'gold', JEWELRY_MATERIALS, 'Matière invalide');
    const quantity = Math.max(0, Number(payload.quantity ?? 0));
    const requestedStatus = String(payload.status || 'available');
    ensureInSet(normalizeJewelryStatus(quantity, requestedStatus), JEWELRY_STATUSES, 'Statut de bijou invalide');

    const result = await transaction(async (connection) => {
      const code = String(payload.code ?? '').trim() || (await createJewelryCode(connection));
      const [existingRows] = await connection.execute(
        `SELECT id
         FROM jewelry
         WHERE code = ?
           AND company_id = ?
         LIMIT 1`,
        [code, getCompanyId(request.user)],
      );

      if (existingRows[0]) {
        throw new Error('Ce code bijou existe deja.');
      }

      const [insertResult] = await connection.execute(
        `INSERT INTO jewelry (code, company_id, material_type, name, category, weight, price_per_gram, purchase_price, sale_price, quantity, status, photo, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code,
          getCompanyId(request.user),
          payload.material_type || 'gold',
          payload.name,
          payload.category || 'other',
          Number(payload.weight ?? 0),
          Number(payload.price_per_gram ?? 0),
          Number(payload.purchase_price ?? 0),
          Number(payload.sale_price ?? 0),
          quantity,
          normalizeJewelryStatus(quantity, requestedStatus),
          payload.photo || null,
          parseId(request.user.id),
        ],
      );

      return insertResult;
    });
    const rows = await query('SELECT * FROM jewelry WHERE id = :id', { id: result.insertId });
    return response.status(201).json({ jewelry: mapJewelryRow(rows[0]) });
  } catch (error) {
    return handleError(response, error);
  }
});

app.patch('/api/jewelry/:id', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const jewelryId = parseId(request.params.id);
    const scope = getScopeClause(request.user);
    const rows = await query(
      `SELECT *
       FROM jewelry
       WHERE id = :id
         AND ${scope.clause}
       LIMIT 1`,
      { id: jewelryId, ...scope.params },
    );

    const current = rows[0];
    if (!current) {
      return response.status(404).json({ error: 'Bijou introuvable.' });
    }

    const nextCategory = request.body.category ?? current.category;
    ensureInSet(String(nextCategory), JEWELRY_CATEGORIES, 'Catégorie invalide');
    const nextMaterialType = request.body.material_type ?? current.material_type;
    ensureInSet(String(nextMaterialType), JEWELRY_MATERIALS, 'Matière invalide');

    const nextQuantity = Math.max(0, Number(request.body.quantity ?? current.quantity ?? 0));
    const nextStatus = normalizeJewelryStatus(nextQuantity, String(request.body.status ?? current.status));
    ensureInSet(nextStatus, JEWELRY_STATUSES, 'Statut de bijou invalide');

    const nextCode = String(request.body.code ?? current.code).trim();
    const duplicateRows = await query(
      `SELECT id
       FROM jewelry
       WHERE code = :code
         AND company_id = :companyId
         AND id <> :id
       LIMIT 1`,
      { code: nextCode, id: jewelryId, companyId: getCompanyId(request.user) },
    );

    if (duplicateRows[0]) {
      return response.status(409).json({ error: 'Ce code bijou existe deja.' });
    }

    await query(
      `UPDATE jewelry
       SET code = :code,
           material_type = :material_type,
           name = :name,
           category = :category,
           weight = :weight,
           price_per_gram = :price_per_gram,
           purchase_price = :purchase_price,
           sale_price = :sale_price,
           quantity = :quantity,
           status = :status,
           photo = :photo
       WHERE id = :id
         AND ${scope.clause}`,
      {
        id: jewelryId,
        code: nextCode,
        material_type: nextMaterialType,
        name: request.body.name ?? current.name,
        category: nextCategory,
        weight: Number(request.body.weight ?? current.weight ?? 0),
        price_per_gram: Number(request.body.price_per_gram ?? current.price_per_gram ?? 0),
        purchase_price: Number(request.body.purchase_price ?? current.purchase_price ?? 0),
        sale_price: Number(request.body.sale_price ?? current.sale_price ?? 0),
        quantity: nextQuantity,
        status: nextStatus,
        photo: request.body.photo ?? current.photo ?? null,
        ...scope.params,
      },
    );

    const updatedRows = await query('SELECT * FROM jewelry WHERE id = :id', { id: jewelryId });
    return response.json({ jewelry: mapJewelryRow(updatedRows[0]) });
  } catch (error) {
    return handleError(response, error);
  }
});

app.patch('/api/jewelry/:id/status', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const jewelryId = parseId(request.params.id);
    const scope = getScopeClause(request.user);
    const rows = await query(
      `SELECT quantity
       FROM jewelry
       WHERE id = :id
         AND ${scope.clause}
       LIMIT 1`,
      { id: jewelryId, ...scope.params },
    );

    if (!rows[0]) {
      return response.status(404).json({ error: 'Bijou introuvable.' });
    }

    const quantity = Math.max(0, Number(request.body.quantity ?? rows[0].quantity ?? 0));
    const status = normalizeJewelryStatus(quantity, String(request.body.status));
    ensureInSet(status, JEWELRY_STATUSES, 'Statut de bijou invalide');

    await query(
      `UPDATE jewelry
       SET status = :status,
           quantity = :quantity
       WHERE id = :id
         AND ${scope.clause}`,
      {
        status,
        quantity,
        id: jewelryId,
        ...scope.params,
      }
    );

    const updatedRows = await query('SELECT * FROM jewelry WHERE id = :id', { id: jewelryId });
    return response.json({ jewelry: mapJewelryRow(updatedRows[0]) });
  } catch (error) {
    return handleError(response, error);
  }
});

app.get('/api/deposits', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const scope = getScopeClause(request.user, 'd');
    const rows = await query(
      `SELECT d.*, c.name AS client_name, c.code AS client_code
       FROM deposits d
       INNER JOIN clients c ON c.id = d.client_id
       WHERE (:clientId IS NULL OR d.client_id = :clientId)
         AND ${scope.clause}
       ORDER BY d.created_at DESC`,
      {
        clientId: request.query.clientId ? parseId(request.query.clientId) : null,
        ...scope.params,
      }
    );
    return response.json({ deposits: rows.map(mapDepositRow) });
  } catch (error) {
    return handleError(response, error);
  }
});

app.post('/api/deposits', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const scope = getScopeClause(request.user);
    const clientRows = await query(
      `SELECT id
       FROM clients
       WHERE id = :clientId
         AND ${scope.clause}
       LIMIT 1`,
      { clientId: parseId(request.body.client_id), ...scope.params }
    );

    if (!clientRows[0]) {
      return response.status(403).json({ error: 'Client hors de votre entreprise.' });
    }

    const result = await query(
      `INSERT INTO deposits (company_id, client_id, amount, note, created_by)
       VALUES (:company_id, :client_id, :amount, :note, :created_by)`,
      {
        company_id: getCompanyId(request.user),
        client_id: parseId(request.body.client_id),
        amount: Number(request.body.amount ?? 0),
        note: request.body.note || null,
        created_by: parseId(request.user.id),
      }
    );

    const rows = await query(
      `SELECT d.*, c.name AS client_name, c.code AS client_code
       FROM deposits d
       INNER JOIN clients c ON c.id = d.client_id
       WHERE d.id = :id`,
      { id: result.insertId }
    );
    return response.status(201).json({ deposit: mapDepositRow(rows[0]) });
  } catch (error) {
    return handleError(response, error);
  }
});

app.get('/api/sales', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const scope = getScopeClause(request.user, 's');
    const rows = await query(
      `SELECT s.*, c.name AS client_name, c.code AS client_code, j.name AS jewelry_name
       FROM sales s
       INNER JOIN clients c ON c.id = s.client_id
       INNER JOIN jewelry j ON j.id = s.jewelry_id
       WHERE (:clientId IS NULL OR s.client_id = :clientId)
         AND ${scope.clause}
       ORDER BY s.created_at DESC`,
      {
        clientId: request.query.clientId ? parseId(request.query.clientId) : null,
        ...scope.params,
      }
    );
    return response.json({ sales: rows.map(mapSaleRow) });
  } catch (error) {
    return handleError(response, error);
  }
});

app.post('/api/sales', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const companyId = getCompanyId(request.user);
    const result = await transaction(async (connection) => {
      const [clientRows] = await connection.execute(
        `SELECT id
         FROM clients
         WHERE id = ?
           AND company_id = ?
         LIMIT 1`,
        [parseId(request.body.client_id), companyId],
      );

      const [jewelryRows] = await connection.execute(
        `SELECT id, quantity, status
         FROM jewelry
         WHERE id = ?
           AND company_id = ?
         LIMIT 1
         FOR UPDATE`,
        [parseId(request.body.jewelry_id), companyId],
      );

      if (!clientRows[0] || !jewelryRows[0]) {
        throw new Error('Operation interdite hors de votre entreprise.');
      }

      const jewelry = jewelryRows[0];
      const nextQuantity = Number(jewelry.quantity ?? 0) - 1;

      if (Number(jewelry.quantity ?? 0) <= 0 || jewelry.status === 'out_of_stock') {
        throw new Error('Ce bijou est en rupture de stock.');
      }

      const [insertResult] = await connection.execute(
        `INSERT INTO sales (company_id, client_id, jewelry_id, total_price, paid_from_balance, paid_cash, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,
          parseId(request.body.client_id),
          parseId(request.body.jewelry_id),
          Number(request.body.total_price ?? 0),
          Number(request.body.paid_from_balance ?? 0),
          Number(request.body.paid_cash ?? 0),
          parseId(request.user.id),
        ],
      );

      await connection.execute(
        `UPDATE jewelry
         SET quantity = ?,
             status = ?
         WHERE id = ?`,
        [Math.max(0, nextQuantity), nextQuantity <= 0 ? 'out_of_stock' : 'available', parseId(request.body.jewelry_id)],
      );

      return insertResult;
    });
    const rows = await query(
      `SELECT s.*, c.name AS client_name, c.code AS client_code, j.name AS jewelry_name
       FROM sales s
       INNER JOIN clients c ON c.id = s.client_id
       INNER JOIN jewelry j ON j.id = s.jewelry_id
       WHERE s.id = :id
         AND ${getScopeClause(request.user, 's').clause}`,
      { id: result.insertId, ...getScopeClause(request.user, 's').params }
    );
    return response.status(201).json({ sale: mapSaleRow(rows[0]) });
  } catch (error) {
    return handleError(response, error);
  }
});

app.get('/api/reservations', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const scope = getScopeClause(request.user, 'r');
    const rows = await query(
      `SELECT r.*, c.name AS client_name, c.code AS client_code, j.name AS jewelry_name
       FROM reservations r
       INNER JOIN clients c ON c.id = r.client_id
       INNER JOIN jewelry j ON j.id = r.jewelry_id
       WHERE ${scope.clause}
       ORDER BY r.created_at DESC`,
      scope.params
    );
    return response.json({ reservations: rows.map(mapReservationRow) });
  } catch (error) {
    return handleError(response, error);
  }
});

app.post('/api/reservations', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const scope = getScopeClause(request.user);
    const [clientRows, jewelryRows] = await Promise.all([
      query(
        `SELECT id
         FROM clients
         WHERE id = :clientId
           AND ${scope.clause}
         LIMIT 1`,
        { clientId: parseId(request.body.client_id), ...scope.params }
      ),
      query(
        `SELECT id
         FROM jewelry
         WHERE id = :jewelryId
           AND ${scope.clause}
         LIMIT 1`,
        { jewelryId: parseId(request.body.jewelry_id), ...scope.params }
      ),
    ]);

    if (!clientRows[0] || !jewelryRows[0]) {
      return response.status(403).json({ error: 'Operation interdite hors de votre entreprise.' });
    }

    const result = await query(
      `INSERT INTO reservations (company_id, client_id, jewelry_id, deposit_amount, remaining_amount, created_by)
       VALUES (:company_id, :client_id, :jewelry_id, :deposit_amount, :remaining_amount, :created_by)`,
      {
        company_id: getCompanyId(request.user),
        client_id: parseId(request.body.client_id),
        jewelry_id: parseId(request.body.jewelry_id),
        deposit_amount: Number(request.body.deposit_amount ?? 0),
        remaining_amount: Number(request.body.remaining_amount ?? 0),
        created_by: parseId(request.user.id),
      }
    );
    const rows = await query(
      `SELECT r.*, c.name AS client_name, c.code AS client_code, j.name AS jewelry_name
       FROM reservations r
       INNER JOIN clients c ON c.id = r.client_id
       INNER JOIN jewelry j ON j.id = r.jewelry_id
       WHERE r.id = :id
         AND ${scope.clause}`,
      { id: result.insertId, ...scope.params }
    );
    return response.status(201).json({ reservation: mapReservationRow(rows[0]) });
  } catch (error) {
    return handleError(response, error);
  }
});

app.get('/api/admin/users', async (request, response) => {
  const authResult = await requireSuperAdmin(request, response);
  if (authResult) return authResult;

  try {
    const rows = await query(
      `SELECT id, full_name, username, email, phone, status, role, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    return response.json({
      users: rows.map((row) => ({
        id: String(row.id),
        full_name: row.full_name,
        username: row.username,
        email: row.email,
        phone: row.phone ?? '',
        status: row.status,
        role: row.role,
        created_at: row.created_at,
      })),
    });
  } catch (error) {
    return handleError(response, error);
  }
});

app.post('/api/admin/users', async (request, response) => {
  const authResult = await requireSuperAdmin(request, response);
  if (authResult) return authResult;

  const username = normalizeUsername(String(request.body.username ?? ''));
  const password = String(request.body.password ?? '');
  const role = String(request.body.role ?? 'admin');

  if (username.length < 3) {
    return response.status(400).json({ error: "Le nom d'utilisateur doit contenir au moins 3 caractères." });
  }
  if (password.length < 6) {
    return response.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  try {
    ensureInSet(role, USER_ROLES, 'Rôle invalide');
    const passwordHash = await hashPassword(password);
    const result = await transaction(async (connection) => {
      const [insertResult] = await connection.execute(
        `INSERT INTO users (
            email, username, password_hash, full_name, phone, role, status, must_change_password, business_name
         ) VALUES (
            ?, ?, ?, ?, ?, ?, 'active', 0, ?
         )`,
        [
          buildManagedLoginEmail(username),
          username,
          passwordHash,
          request.body.full_name,
          request.body.phone || '',
          role,
          request.body.full_name,
        ],
      );

      if (role !== 'super_admin') {
        await connection.execute('UPDATE users SET company_id = ? WHERE id = ?', [insertResult.insertId, insertResult.insertId]);
      }

      return insertResult;
    });

    return response.status(201).json({ success: true, user_id: String(result.insertId), username });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Duplicate')) {
      return response.status(400).json({ error: "Ce nom d'utilisateur existe déjà." });
    }
    return handleError(response, error);
  }
});

app.patch('/api/admin/users/:id/status', async (request, response) => {
  const authResult = await requireSuperAdmin(request, response);
  if (authResult) return authResult;

  try {
    ensureInSet(String(request.body.status), USER_STATUS, 'Statut invalide');
    await query('UPDATE users SET status = :status WHERE id = :id', {
      status: request.body.status,
      id: parseId(request.params.id),
    });
    return response.json({ success: true });
  } catch (error) {
    return handleError(response, error);
  }
});

app.patch('/api/admin/users/:id/password', async (request, response) => {
  const authResult = await requireSuperAdmin(request, response);
  if (authResult) return authResult;

  const newPassword = String(request.body.new_password ?? '');
  if (newPassword.length < 6) {
    return response.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  try {
    const passwordHash = await hashPassword(newPassword);
    await query(
      `UPDATE users
       SET password_hash = :passwordHash,
           must_change_password = 0
       WHERE id = :id`,
      {
        passwordHash,
        id: parseId(request.params.id),
      }
    );
    return response.json({ success: true });
  } catch (error) {
    return handleError(response, error);
  }
});

app.delete('/api/admin/users/:id', async (request, response) => {
  const authResult = await requireSuperAdmin(request, response);
  if (authResult) return authResult;

  try {
    await query('DELETE FROM users WHERE id = :id', { id: parseId(request.params.id) });
    return response.json({ success: true });
  } catch (error) {
    return handleError(response, error);
  }
});

async function startServer() {
  await runMigrations();
  app.listen(port, () => {
    console.log(`API locale disponible sur http://localhost:${port}`);
    console.log('Schema MySQL verifie automatiquement au demarrage.');
  });
}

startServer().catch((error) => {
  console.error('Impossible de demarrer l API locale:', error);
  process.exit(1);
});
