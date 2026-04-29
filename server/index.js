import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { query, runMigrations, transaction } from './db.js';
import { AppError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from './errors.js';
import {
  buildDocumentNumber,
  computeJewelryTotalPrice,
  computeReservationAmounts,
  computeSaleAmounts,
  ensureAvailableJewelryForReservation,
  ensureAvailableJewelryForSale,
  parseAmount,
  parseId,
  parseNonNegativeInteger,
  requireText,
} from './operations.js';
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
  mapSaleItemRow,
  mapSaleRow,
  mapWalletTransactionRow,
  normalizeUsername,
  verifyPassword,
} from './utils.js';
import { requireAuth, requireSuperAdmin, signToken } from './auth.js';

const app = express();
const port = Number(process.env.API_PORT || 3001);
const corsOrigin = process.env.CORS_ORIGIN;
const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : path.resolve('public', 'uploads');

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

app.use(cors(corsOrigin ? { origin: corsOrigin } : undefined));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use('/uploads', express.static(uploadsDir));

function handleError(response, error) {
  if (error instanceof AppError) {
    return response.status(error.statusCode).json({ error: error.message, code: error.code });
  }

  console.error('Unhandled API error:', error);
  return response.status(500).json({ error: 'Erreur serveur' });
}

function ensureInSet(value, allowedValues, message) {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(message);
  }
}

function isSuperAdmin(user) {
  return user?.role === 'super_admin';
}

function buildUploadUrl(request, filename) {
  return `${request.protocol}://${request.get('host')}/uploads/${filename}`;
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

async function insertWalletTransaction(connection, {
  companyId,
  clientId,
  operationType,
  operationId = null,
  documentNumber,
  amount,
  balanceBefore,
  balanceAfter,
  createdBy,
}) {
  await connection.execute(
    `INSERT INTO wallet_transactions (
        company_id,
        client_id,
        operation_type,
        operation_id,
        document_number,
        amount,
        balance_before,
        balance_after,
        created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId,
      clientId,
      operationType,
      operationId,
      documentNumber,
      amount,
      balanceBefore,
      balanceAfter,
      createdBy,
    ],
  );
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

    const logoUrl = buildUploadUrl(request, request.file.filename);

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

app.post('/api/jewelry/photo', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  upload.single('photo')(request, response, async (uploadError) => {
    if (uploadError) {
      return response.status(400).json({ error: uploadError.message });
    }

    if (!request.file) {
      return response.status(400).json({ error: 'Aucun fichier envoyé' });
    }

    return response.json({ url: buildUploadUrl(request, request.file.filename) });
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
    const clientId = parseId(request.params.id, 'Client invalide.');
    const scope = getScopeClause(request.user);
    const rows = await query(
      `SELECT *
       FROM clients
       WHERE id = :id
         AND ${scope.clause}
       LIMIT 1`,
      { id: clientId, ...scope.params }
    );
    if (!rows[0]) {
      throw new NotFoundError('Client introuvable');
    }
    return response.json({ client: mapClientRow(rows[0]) });
  } catch (error) {
    return handleError(response, error);
  }
});

app.post('/api/clients', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const name = requireText(request.body.name, 'Le nom du client est obligatoire.');
    const phone = String(request.body.phone ?? '').trim();
    const email = String(request.body.email ?? '').trim() || null;
    const client = await transaction(async (connection) => {
      const code = await createClientCode(connection);
      const [result] = await connection.execute(
        `INSERT INTO clients (code, company_id, name, phone, email, balance, created_by)
         VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [code, getCompanyId(request.user), name, phone, email, parseId(request.user.id)]
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
    const clientId = parseId(request.params.id, 'Client invalide.');
    const nextBalance = parseAmount(request.body.balance, 'Le solde doit être positif ou nul.', {
      min: 0,
      allowZero: true,
    });

    await transaction(async (connection) => {
      const [clientRows] = await connection.execute(
        `SELECT id, balance
         FROM clients
         WHERE id = ?
           AND company_id = ?
         LIMIT 1
         FOR UPDATE`,
        [clientId, getCompanyId(request.user)],
      );

      const client = clientRows[0];
      if (!client) {
        throw new NotFoundError('Client introuvable.');
      }

      const previousBalance = Number(client.balance ?? 0);
      await connection.execute(
        `UPDATE clients
         SET balance = ?
         WHERE id = ?`,
        [nextBalance, clientId],
      );

      if (previousBalance !== nextBalance) {
        const delta = Number((nextBalance - previousBalance).toFixed(2));
        await insertWalletTransaction(connection, {
          companyId: getCompanyId(request.user),
          clientId,
          operationType: delta >= 0 ? 'balance_adjustment_credit' : 'balance_adjustment_debit',
          documentNumber: buildDocumentNumber('ADJ', Date.now()),
          amount: delta,
          balanceBefore: previousBalance,
          balanceAfter: nextBalance,
          createdBy: parseId(request.user.id),
        });
      }
    });

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
    const name = requireText(payload.name, 'Le nom du bijou est obligatoire.');
    ensureInSet(payload.category || 'other', JEWELRY_CATEGORIES, 'Catégorie invalide');
    ensureInSet(payload.material_type || 'gold', JEWELRY_MATERIALS, 'Matière invalide');
    const quantity = parseNonNegativeInteger(payload.quantity ?? 0, 'Quantité invalide.');
    const requestedStatus = String(payload.status || 'available');
    ensureInSet(normalizeJewelryStatus(quantity, requestedStatus), JEWELRY_STATUSES, 'Statut de bijou invalide');
    const weight = parseAmount(payload.weight ?? 0, 'Poids invalide.', { min: 0, allowZero: true });
    const pricePerGram = parseAmount(payload.price_per_gram ?? 0, 'Prix au gramme invalide.', {
      min: 0,
      allowZero: true,
    });
    const purchasePrice = parseAmount(payload.purchase_price ?? 0, "Prix d'achat invalide.", {
      min: 0,
      allowZero: true,
    });
    const salePrice = computeJewelryTotalPrice(weight, pricePerGram);

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
        throw new ConflictError('Ce code bijou existe deja.');
      }

      const [insertResult] = await connection.execute(
        `INSERT INTO jewelry (code, company_id, material_type, name, category, weight, price_per_gram, purchase_price, sale_price, quantity, status, photo, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code,
          getCompanyId(request.user),
          payload.material_type || 'gold',
          name,
          payload.category || 'other',
          weight,
          pricePerGram,
          purchasePrice,
          salePrice,
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
      throw new NotFoundError('Bijou introuvable.');
    }

    const nextCategory = request.body.category ?? current.category;
    ensureInSet(String(nextCategory), JEWELRY_CATEGORIES, 'Catégorie invalide');
    const nextMaterialType = request.body.material_type ?? current.material_type;
    ensureInSet(String(nextMaterialType), JEWELRY_MATERIALS, 'Matière invalide');

    const nextQuantity = parseNonNegativeInteger(
      request.body.quantity ?? current.quantity ?? 0,
      'Quantité invalide.',
    );
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
      throw new ConflictError('Ce code bijou existe deja.');
    }

    const nextWeight = parseAmount(request.body.weight ?? current.weight ?? 0, 'Poids invalide.', {
      min: 0,
      allowZero: true,
    });
    const nextPricePerGram = parseAmount(
      request.body.price_per_gram ?? current.price_per_gram ?? 0,
      'Prix au gramme invalide.',
      { min: 0, allowZero: true },
    );

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
        name: requireText(request.body.name ?? current.name, 'Le nom du bijou est obligatoire.'),
        category: nextCategory,
        weight: nextWeight,
        price_per_gram: nextPricePerGram,
        purchase_price: parseAmount(
          request.body.purchase_price ?? current.purchase_price ?? 0,
          "Prix d'achat invalide.",
          { min: 0, allowZero: true },
        ),
        sale_price: computeJewelryTotalPrice(nextWeight, nextPricePerGram),
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
      throw new NotFoundError('Bijou introuvable.');
    }

    const quantity = parseNonNegativeInteger(request.body.quantity ?? rows[0].quantity ?? 0, 'Quantité invalide.');
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
    const clientId = request.query.clientId ? parseId(request.query.clientId) : null;
    const clientFilter = clientId ? 'd.client_id = :clientId AND' : '';
    const rows = await query(
      `SELECT d.*, c.name AS client_name, c.code AS client_code
       FROM deposits d
       INNER JOIN clients c ON c.id = d.client_id
       WHERE ${clientFilter} ${scope.clause}
       ORDER BY d.created_at DESC`,
      {
        ...(clientId ? { clientId } : {}),
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
    const clientId = parseId(request.body.client_id, 'Client invalide.');
    const amount = parseAmount(request.body.amount, 'Le montant du dépôt doit être supérieur à 0.', {
      min: 0,
      allowZero: false,
    });
    const note = String(request.body.note ?? '').trim() || null;
    const companyId = getCompanyId(request.user);
    const userId = parseId(request.user.id);

    const deposit = await transaction(async (connection) => {
      const [clientRows] = await connection.execute(
        `SELECT id, balance
         FROM clients
         WHERE id = ?
           AND company_id = ?
         LIMIT 1
         FOR UPDATE`,
        [clientId, companyId],
      );

      const client = clientRows[0];
      if (!client) {
        throw new ForbiddenError('Client hors de votre entreprise.');
      }

      const previousBalance = Number(client.balance ?? 0);

      const [result] = await connection.execute(
        `INSERT INTO deposits (company_id, client_id, amount, document_number, note, created_by)
         VALUES (?, ?, ?, '', ?, ?)`,
        [companyId, clientId, amount, note, userId],
      );

      const documentNumber = buildDocumentNumber('DEP', result.insertId);
      await connection.execute(
        `UPDATE deposits
         SET document_number = ?
         WHERE id = ?`,
        [documentNumber, result.insertId],
      );

      await connection.execute(
        `UPDATE clients
         SET balance = balance + ?
         WHERE id = ?`,
        [amount, clientId],
      );

      await insertWalletTransaction(connection, {
        companyId,
        clientId,
        operationType: 'deposit_credit',
        operationId: result.insertId,
        documentNumber,
        amount,
        balanceBefore: previousBalance,
        balanceAfter: Number((previousBalance + amount).toFixed(2)),
        createdBy: userId,
      });

      const [rows] = await connection.execute(
        `SELECT d.*, c.name AS client_name, c.code AS client_code
         FROM deposits d
         INNER JOIN clients c ON c.id = d.client_id
         WHERE d.id = ?`,
        [result.insertId],
      );

      return mapDepositRow(rows[0]);
    });

    return response.status(201).json({ deposit });
  } catch (error) {
    return handleError(response, error);
  }
});

app.get('/api/sales', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const scope = getScopeClause(request.user, 's');
    const clientId = request.query.clientId ? parseId(request.query.clientId) : null;
    const clientFilter = clientId ? 's.client_id = :clientId AND' : '';
    const rows = await query(
      `SELECT s.*, c.name AS client_name, c.code AS client_code, j.name AS jewelry_name
       FROM sales s
       INNER JOIN clients c ON c.id = s.client_id
       LEFT JOIN jewelry j ON j.id = s.jewelry_id
       WHERE ${clientFilter} ${scope.clause}
       ORDER BY s.created_at DESC`,
      {
        ...(clientId ? { clientId } : {}),
        ...scope.params,
      }
    );
    const sales = rows.map(mapSaleRow);
    if (sales.length === 0) {
      return response.json({ sales });
    }

    const saleIds = sales.map((sale) => Number(sale.id));
    const placeholders = saleIds.map(() => '?').join(',');
    const itemRows = await query(
      `SELECT *
       FROM sale_items
       WHERE sale_id IN (${placeholders})
       ORDER BY id ASC`,
      saleIds,
    );
    const itemsBySaleId = new Map();
    itemRows.map(mapSaleItemRow).forEach((item) => {
      const items = itemsBySaleId.get(item.sale_id) ?? [];
      items.push(item);
      itemsBySaleId.set(item.sale_id, items);
    });

    return response.json({
      sales: sales.map((sale) => ({
        ...sale,
        items: itemsBySaleId.get(sale.id) ?? [],
      })),
    });
  } catch (error) {
    return handleError(response, error);
  }
});

app.post('/api/sales', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const clientId = parseId(request.body.client_id, 'Client invalide.');
    const rawItems = Array.isArray(request.body.items)
      ? request.body.items
      : request.body.jewelry_id
        ? [{ jewelry_id: request.body.jewelry_id, quantity: 1 }]
        : [];

    if (rawItems.length === 0) {
      throw new ValidationError('Ajoutez au moins un bijou a la facture.');
    }

    const saleItemsInput = rawItems.map((item) => ({
      jewelryId: parseId(item.jewelry_id, 'Bijou invalide.'),
      quantity: parseNonNegativeInteger(item.quantity ?? 1, 'Quantite invalide.'),
    }));

    if (saleItemsInput.some((item) => item.quantity <= 0)) {
      throw new ValidationError('La quantite vendue doit etre superieure a 0.');
    }

    const duplicateJewelryId = saleItemsInput.find((item, index) =>
      saleItemsInput.some((candidate, candidateIndex) => candidateIndex !== index && candidate.jewelryId === item.jewelryId),
    );

    if (duplicateJewelryId) {
      throw new ValidationError('Un bijou ne peut apparaitre qu une seule fois dans la facture.');
    }

    const paidCashInput = parseAmount(request.body.paid_cash ?? 0, 'Montant especes invalide.', {
      min: 0,
      allowZero: true,
    });
    const paidMobileMoney = parseAmount(request.body.paid_mobile_money ?? 0, 'Montant mobile money invalide.', {
      min: 0,
      allowZero: true,
    });
    const paidCard = parseAmount(request.body.paid_card ?? 0, 'Montant carte invalide.', {
      min: 0,
      allowZero: true,
    });
    const paidOther = parseAmount(request.body.paid_other ?? 0, 'Montant autre invalide.', {
      min: 0,
      allowZero: true,
    });
    const useBalance = Boolean(request.body.use_balance);
    const addChangeToBalance = Boolean(request.body.add_change_to_balance);
    const companyId = getCompanyId(request.user);
    const userId = parseId(request.user.id);

    const sale = await transaction(async (connection) => {
      const [clientRows] = await connection.execute(
        `SELECT id, balance
         FROM clients
         WHERE id = ?
           AND company_id = ?
         LIMIT 1
         FOR UPDATE`,
        [clientId, companyId],
      );

      if (!clientRows[0]) {
        throw new ForbiddenError('Operation interdite hors de votre entreprise.');
      }

      const client = clientRows[0];
      const previousBalance = Number(client.balance ?? 0);
      const saleLineItems = [];

      for (const inputItem of saleItemsInput) {
        const [jewelryRows] = await connection.execute(
          `SELECT id, code, material_type, name, sale_price, weight, price_per_gram, quantity, status
           FROM jewelry
           WHERE id = ?
             AND company_id = ?
           LIMIT 1
           FOR UPDATE`,
          [inputItem.jewelryId, companyId],
        );

        const jewelry = jewelryRows[0];
        if (!jewelry) {
          throw new ForbiddenError('Operation interdite hors de votre entreprise.');
        }

        ensureAvailableJewelryForSale(jewelry);

        if (Number(jewelry.quantity ?? 0) < inputItem.quantity) {
          throw new ConflictError(`Stock insuffisant pour ${jewelry.name}.`);
        }

        const unitPrice =
          Number(jewelry.weight ?? 0) > 0 && Number(jewelry.price_per_gram ?? 0) > 0
            ? computeJewelryTotalPrice(jewelry.weight, jewelry.price_per_gram)
            : jewelry.sale_price;
        const lineTotal = Number((unitPrice * inputItem.quantity).toFixed(2));

        saleLineItems.push({
          jewelry,
          quantity: inputItem.quantity,
          unitPrice,
          lineTotal,
        });
      }

      const totalPrice = Number(saleLineItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
      if (totalPrice <= 0) {
        throw new ValidationError('Le total de la facture doit etre superieur a 0.');
      }

      const paidFromBalance = useBalance ? Math.min(previousBalance, totalPrice) : 0;
      const receivedTotal = Number((paidFromBalance + paidCashInput + paidMobileMoney + paidCard + paidOther).toFixed(2));
      const overpaidAmount = Math.max(0, Number((receivedTotal - totalPrice).toFixed(2)));
      const changeToBalance = addChangeToBalance ? overpaidAmount : 0;
      const changeAmount = addChangeToBalance ? 0 : overpaidAmount;
      const remainingAmount = Math.max(0, Number((totalPrice - receivedTotal).toFixed(2)));
      const balanceAfterSale = Number((previousBalance - paidFromBalance + changeToBalance).toFixed(2));

      const [insertResult] = await connection.execute(
        `INSERT INTO sales (
            company_id,
            client_id,
            jewelry_id,
            document_number,
            total_price,
            paid_from_balance,
            paid_cash,
            paid_mobile_money,
            paid_card,
            paid_other,
            remaining_amount,
            change_amount,
            change_to_balance,
            created_by
         )
         VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,
          clientId,
          saleLineItems[0].jewelry.id,
          totalPrice,
          paidFromBalance,
          paidCashInput,
          paidMobileMoney,
          paidCard,
          paidOther,
          remainingAmount,
          changeAmount,
          changeToBalance,
          userId,
        ],
      );

      const documentNumber = buildDocumentNumber('FAC', insertResult.insertId);
      await connection.execute(
        `UPDATE sales
         SET document_number = ?
         WHERE id = ?`,
        [documentNumber, insertResult.insertId],
      );

      if (paidFromBalance > 0) {
        await insertWalletTransaction(connection, {
          companyId,
          clientId,
          operationType: 'sale_balance_debit',
          operationId: insertResult.insertId,
          documentNumber,
          amount: -paidFromBalance,
          balanceBefore: previousBalance,
          balanceAfter: Number((previousBalance - paidFromBalance).toFixed(2)),
          createdBy: userId,
        });
      }

      if (changeToBalance > 0) {
        await insertWalletTransaction(connection, {
          companyId,
          clientId,
          operationType: 'balance_adjustment_credit',
          operationId: insertResult.insertId,
          documentNumber,
          amount: changeToBalance,
          balanceBefore: Number((previousBalance - paidFromBalance).toFixed(2)),
          balanceAfter: balanceAfterSale,
          createdBy: userId,
        });
      }

      if (paidFromBalance > 0 || changeToBalance > 0) {
        await connection.execute(
          `UPDATE clients
           SET balance = ?
           WHERE id = ?`,
          [balanceAfterSale, clientId],
        );
      }

      for (const item of saleLineItems) {
        await connection.execute(
          `INSERT INTO sale_items (
              sale_id,
              jewelry_id,
              jewelry_code,
              jewelry_name,
              material_type,
              weight,
              price_per_gram,
              quantity,
              line_total
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            insertResult.insertId,
            item.jewelry.id,
            item.jewelry.code,
            item.jewelry.name,
            item.jewelry.material_type,
            item.jewelry.weight,
            item.jewelry.price_per_gram,
            item.quantity,
            item.lineTotal,
          ],
        );

        const nextQuantity = Number(item.jewelry.quantity ?? 0) - item.quantity;
        await connection.execute(
          `UPDATE jewelry
           SET quantity = ?,
               status = ?
           WHERE id = ?`,
          [Math.max(0, nextQuantity), nextQuantity <= 0 ? 'out_of_stock' : 'available', item.jewelry.id],
        );
      }

      const [rows] = await connection.execute(
        `SELECT s.*, c.name AS client_name, c.code AS client_code, j.name AS jewelry_name
         FROM sales s
         INNER JOIN clients c ON c.id = s.client_id
         LEFT JOIN jewelry j ON j.id = s.jewelry_id
         WHERE s.id = ?
         LIMIT 1`,
        [insertResult.insertId],
      );

      const [itemRows] = await connection.execute(
        `SELECT *
         FROM sale_items
         WHERE sale_id = ?
         ORDER BY id ASC`,
        [insertResult.insertId],
      );

      return {
        ...mapSaleRow(rows[0]),
        items: itemRows.map(mapSaleItemRow),
      };
    });

    return response.status(201).json({ sale });
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
    const clientId = parseId(request.body.client_id, 'Client invalide.');
    const jewelryId = parseId(request.body.jewelry_id, 'Bijou invalide.');
    const depositAmount = parseAmount(
      request.body.deposit_amount,
      "Le montant de l'acompte doit être supérieur à 0.",
      { min: 0, allowZero: false },
    );
    const companyId = getCompanyId(request.user);
    const userId = parseId(request.user.id);

    const reservation = await transaction(async (connection) => {
      const [clientRows] = await connection.execute(
        `SELECT id
         FROM clients
         WHERE id = ?
           AND company_id = ?
         LIMIT 1`,
        [clientId, companyId],
      );

      const [jewelryRows] = await connection.execute(
        `SELECT id, sale_price, weight, price_per_gram, quantity, status
         FROM jewelry
         WHERE id = ?
           AND company_id = ?
         LIMIT 1
         FOR UPDATE`,
        [jewelryId, companyId],
      );

      if (!clientRows[0] || !jewelryRows[0]) {
        throw new ForbiddenError('Operation interdite hors de votre entreprise.');
      }

      const jewelry = jewelryRows[0];
      ensureAvailableJewelryForReservation(jewelry);
      const computedSalePrice =
        Number(jewelry.weight ?? 0) > 0 && Number(jewelry.price_per_gram ?? 0) > 0
          ? computeJewelryTotalPrice(jewelry.weight, jewelry.price_per_gram)
          : jewelry.sale_price;
      const { depositAmount: normalizedDepositAmount, remainingAmount } = computeReservationAmounts(
        computedSalePrice,
        depositAmount,
      );

      const [result] = await connection.execute(
        `INSERT INTO reservations (
            company_id,
            client_id,
            jewelry_id,
            document_number,
            deposit_amount,
            remaining_amount,
            created_by
         )
         VALUES (?, ?, ?, '', ?, ?, ?)`,
        [companyId, clientId, jewelryId, normalizedDepositAmount, remainingAmount, userId],
      );

      const documentNumber = buildDocumentNumber('RES', result.insertId);
      await connection.execute(
        `UPDATE reservations
         SET document_number = ?
         WHERE id = ?`,
        [documentNumber, result.insertId],
      );

      await connection.execute(
        `UPDATE jewelry
         SET status = 'reserved'
         WHERE id = ?`,
        [jewelryId],
      );

      const [rows] = await connection.execute(
        `SELECT r.*, c.name AS client_name, c.code AS client_code, j.name AS jewelry_name
         FROM reservations r
         INNER JOIN clients c ON c.id = r.client_id
         INNER JOIN jewelry j ON j.id = r.jewelry_id
         WHERE r.id = ?
         LIMIT 1`,
        [result.insertId],
      );

      return mapReservationRow(rows[0]);
    });

    return response.status(201).json({ reservation });
  } catch (error) {
    return handleError(response, error);
  }
});

app.get('/api/wallet-transactions', async (request, response) => {
  const authResult = await requireAuth(request, response);
  if (authResult) return authResult;

  try {
    const scope = getScopeClause(request.user, 'w');
    const clientId = request.query.clientId ? parseId(request.query.clientId) : null;
    const clientFilter = clientId ? 'w.client_id = :clientId AND' : '';
    const rows = await query(
      `SELECT w.*, c.name AS client_name, c.code AS client_code
       FROM wallet_transactions w
       INNER JOIN clients c ON c.id = w.client_id
       WHERE ${clientFilter} ${scope.clause}
       ORDER BY w.created_at DESC, w.id DESC`,
      {
        ...(clientId ? { clientId } : {}),
        ...scope.params,
      },
    );
    return response.json({ wallet_transactions: rows.map(mapWalletTransactionRow) });
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
            ?, ?, ?, ?, ?, ?, 'active', false, ?
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
    if (error?.code === '23505' || (error instanceof Error && error.message.includes('Duplicate'))) {
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

app.use((error, _request, response, next) => {
  if (error?.type === 'entity.too.large') {
    return response.status(413).json({
      error: 'Charge utile trop volumineuse. Utilisez les endpoints d upload pour les images.',
    });
  }

  return next(error);
});

async function startServer() {
  await runMigrations();
  app.listen(port, () => {
    console.log(`API locale disponible sur http://localhost:${port}`);
    console.log('Schema MySQL verifie automatiquement au demarrage.');
  });
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  startServer().catch((error) => {
    console.error('Impossible de demarrer l API locale:', error);
    process.exit(1);
  });
}

export { app, startServer };
