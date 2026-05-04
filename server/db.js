import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL || databaseUrl;

if (!databaseUrl && process.env.NODE_ENV === 'production') {
  throw new Error('DATABASE_URL is required in production.');
}

function createPool(connectionString = databaseUrl) {
  return new Pool({
    connectionString,
    max: 10,
    ssl: connectionString?.includes('supabase.com') ? { rejectUnauthorized: false } : undefined,
  });
}

const pool = databaseUrl ? createPool() : null;

async function readSqlFile(filename) {
  const filePath = path.resolve('server', filename);
  return fs.readFile(filePath, 'utf8');
}

function normalizeParams(params) {
  if (Array.isArray(params)) {
    return { sqlParams: params, named: false };
  }

  return { sqlParams: params ?? {}, named: true };
}

function translateSql(sql, params = {}) {
  const { sqlParams, named } = normalizeParams(params);
  const values = [];
  let translated = sql;

  if (named) {
    const indexes = new Map();
    translated = translated.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, key) => {
      if (!indexes.has(key)) {
        indexes.set(key, values.length + 1);
        values.push(sqlParams[key]);
      }

      return `$${indexes.get(key)}`;
    });
  } else {
    let index = 0;
    translated = translated.replace(/\?/g, () => {
      index += 1;
      return `$${index}`;
    });
    values.push(...sqlParams);
  }

  if (/^\s*insert\s+/i.test(translated) && !/\breturning\b/i.test(translated)) {
    translated = `${translated} RETURNING id`;
  }

  return { text: translated, values };
}

function mapResult(result) {
  if (result.command === 'SELECT' || result.rows.length > 0) {
    return result.rows;
  }

  return {
    rowCount: result.rowCount,
    affectedRows: result.rowCount,
  };
}

async function executeWith(client, sql, params = {}) {
  const statement = translateSql(sql, params);
  const result = await client.query(statement.text, statement.values);
  const mapped = mapResult(result);

  if (/^\s*insert\s+/i.test(statement.text)) {
    return [{ insertId: result.rows[0]?.id, rowCount: result.rowCount, affectedRows: result.rowCount }];
  }

  return [mapped];
}

export async function runMigrations() {
  const migrationPool = createPool(directUrl);

  try {
    const schema = await readSqlFile('master-schema.sql');
    await migrationPool.query(schema);

    if (process.env.ALLOW_DEFAULT_ADMIN_SEED === 'true') {
      await migrationPool.query(`
        INSERT INTO users (
          email, username, password_hash, full_name, phone, business_name, role, status, must_change_password
        )
        SELECT
          'admin@users.local',
          'admin',
          '$2b$10$/M.5BOEkn74ld2jNu8cRLO/Ezj3KpCGtE0Sy3sBWshpEmfRHMnJga',
          'Super Admin',
          '',
          'Ma boutique',
          'super_admin',
          'active',
          TRUE
        WHERE NOT EXISTS (
          SELECT 1 FROM users WHERE username = 'admin'
        );
      `);
    }
  } finally {
    await migrationPool.end();
  }
}

export async function query(sql, params = {}) {
  if (!pool) {
    throw new Error('DATABASE_URL is required.');
  }

  const statement = translateSql(sql, params);
  const result = await pool.query(statement.text, statement.values);
  return mapResult(result);
}

export async function transaction(run) {
  if (!pool) {
    throw new Error('DATABASE_URL is required.');
  }

  const client = await pool.connect();
  const connection = {
    execute: (sql, params = []) => executeWith(client, sql, params),
  };

  try {
    await client.query('BEGIN');
    const result = await run(connection);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
