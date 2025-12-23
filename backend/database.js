import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlitePath = path.join(__dirname, 'database.db');

// Detectar uso de Postgres via DATABASE_URL
const isPostgres = !!process.env.DATABASE_URL;

let sqliteDb = null;
let pgPool = null;

if (isPostgres) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('✓ Usando Postgres (DATABASE_URL detectado)');
} else {
  sqliteDb = new sqlite3.Database(sqlitePath, (err) => {
    if (err) console.error('Erro ao conectar ao SQLite:', err);
    else console.log('✓ Conectado ao SQLite');
  });
}

/**
 * Normaliza SQL:
 * - Postgres → mantém $1, $2...
 * - SQLite  → converte $1, $2... para ?
 */
function normalizeSql(sql) {
  if (isPostgres) return sql;
  return sql.replace(/\$\d+/g, '?');
}

// DB HELPERS
const dbRun = async (sql, params = []) => {
  const finalSql = normalizeSql(sql);

  if (isPostgres) {
    const isInsert = /^\s*INSERT\b/i.test(finalSql);
    const hasReturning = /RETURNING\s+\w+/i.test(finalSql);
    const sqlWithReturning =
      isInsert && !hasReturning ? `${finalSql} RETURNING id` : finalSql;

    const res = await pgPool.query(sqlWithReturning, params);
    if (isInsert) return { lastID: res.rows[0].id };
    return res;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(finalSql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
};

const dbGet = async (sql, params = []) => {
  const finalSql = normalizeSql(sql);

  if (isPostgres) {
    const res = await pgPool.query(finalSql, params);
    return res.rows[0] || null;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(finalSql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }
};

const dbAll = async (sql, params = []) => {
  const finalSql = normalizeSql(sql);

  if (isPostgres) {
    const res = await pgPool.query(finalSql, params);
    return res.rows || [];
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(finalSql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
};

// INIT DATABASE
async function initDb() {
  try {
    await dbRun(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        nome TEXT NOT NULL,
        criado_em ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbRun(`
      CREATE TABLE IF NOT EXISTS produtos (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL,
        preco ${isPostgres ? 'NUMERIC' : 'REAL'},
        criado_em ${isPostgres ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbRun(`
      CREATE TABLE IF NOT EXISTS cores (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        hex TEXT NOT NULL
      )
    `);

    await dbRun(`
      CREATE TABLE IF NOT EXISTS galeria (
        id ${isPostgres ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${isPostgres ? '' : 'AUTOINCREMENT'},
        cor_id INTEGER NOT NULL REFERENCES cores(id) ON DELETE CASCADE,
        url TEXT NOT NULL
      )
    `);

    console.log('✓ Tabelas inicializadas');

    // Criar admin padrão se não existir
    const adminExistente = await dbGet(
      'SELECT * FROM usuarios WHERE email = $1',
      ['admin@kpr.com']
    );

    if (!adminExistente) {
      const senhaHash = await bcrypt.hash('admin123', 10);
      await dbRun(
        'INSERT INTO usuarios (email, senha, nome) VALUES ($1, $2, $3)',
        ['admin@kpr.com', senhaHash, 'Admin']
      );
      console.log('✓ Admin padrão criado: admin@kpr.com / admin123');
    }
  } catch (err) {
    console.error('Erro ao inicializar tabelas:', err);
  }
}

export { sqliteDb as db, dbRun, dbGet, dbAll, initDb };
