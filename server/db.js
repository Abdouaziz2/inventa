import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

const mysqlConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
};

const masterDatabase = process.env.MYSQL_DATABASE || 'gems_flow_suite';
const pool = mysql.createPool({
  ...mysqlConfig,
  database: masterDatabase,
});

async function readSqlFile(filename) {
  const filePath = path.resolve('server', filename);
  return fs.readFile(filePath, 'utf8');
}

export async function runMigrations() {
  const bootstrapConnection = await mysql.createConnection({
    ...mysqlConfig,
    multipleStatements: true,
  });

  try {
    const schema = await readSqlFile('master-schema.sql');
    await bootstrapConnection.query(schema);
  } finally {
    await bootstrapConnection.end();
  }
}

export async function query(sql, params = {}) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function transaction(run) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await run(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
