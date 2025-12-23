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
  pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  console.log('✓ Usando Postgres (DATABASE_URL detectado)');
} else {
  sqliteDb = new sqlite3.Database(sqlitePath, (err) => {
    if (err) console.error('Erro ao conectar ao SQLite:', err);
    else console.log('✓ Conectado ao SQLite');
  });
}

// dbRun/dbGet/dbAll com comportamento unificado
const dbRun = async (sql, params = []) => {
  if (isPostgres) {
    // Em inserts, adicionar RETURNING id se não existir
    const isInsert = /^\s*INSERT\b/i.test(sql);
    const hasReturning = /RETURNING\s+\w+/i.test(sql);
    const finalSql = isInsert && !hasReturning ? `${sql} RETURNING id` : sql;
    const res = await pgPool.query(finalSql, params);
    if (isInsert) return { lastID: res.rows[0].id };
    return res;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
};

const dbGet = async (sql, params = []) => {
  if (isPostgres) {
    const res = await pgPool.query(sql, params);
    return res.rows[0] || null;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }
};

const dbAll = async (sql, params = []) => {
  if (isPostgres) {
    const res = await pgPool.query(sql, params);
    return res.rows || [];
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
};

// Inicializar tabelas conforme o banco
async function initDb() {
  try {
    if (isPostgres) {
      // Postgres schema
      await dbRun(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          senha TEXT NOT NULL,
          nome TEXT NOT NULL,
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await dbRun(`
        CREATE TABLE IF NOT EXISTS produtos (
          id SERIAL PRIMARY KEY,
          nome TEXT NOT NULL,
          tipo TEXT NOT NULL,
          preco NUMERIC,
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await dbRun(`
        CREATE TABLE IF NOT EXISTS cores (
          id SERIAL PRIMARY KEY,
          produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
          nome TEXT NOT NULL,
          hex TEXT NOT NULL
        )
      `);

      await dbRun(`
        CREATE TABLE IF NOT EXISTS galeria (
          id SERIAL PRIMARY KEY,
          cor_id INTEGER NOT NULL REFERENCES cores(id) ON DELETE CASCADE,
          url TEXT NOT NULL
        )
      `);
    } else {
      // SQLite schema
      await dbRun(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          senha TEXT NOT NULL,
          nome TEXT NOT NULL,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await dbRun(`
        CREATE TABLE IF NOT EXISTS produtos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          tipo TEXT NOT NULL,
          preco REAL,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await dbRun(`
        CREATE TABLE IF NOT EXISTS cores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          produto_id INTEGER NOT NULL,
          nome TEXT NOT NULL,
          hex TEXT NOT NULL,
          FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
        )
      `);

      await dbRun(`
        CREATE TABLE IF NOT EXISTS galeria (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cor_id INTEGER NOT NULL,
          url TEXT NOT NULL,
          FOREIGN KEY (cor_id) REFERENCES cores(id) ON DELETE CASCADE
        )
      `);
    }

    console.log('✓ Tabelas inicializadas');

    // Criar admin padrão se não existir
    let adminExistente;

    if (isPostgres) {
      adminExistente = await dbGet(
        'SELECT * FROM usuarios WHERE email = $1',
        ['admin@kpr.com']
      );
    } else {
      adminExistente = await dbGet(
        'SELECT * FROM usuarios WHERE email = ?',
        ['admin@kpr.com']
      );
    }
    
    if (!adminExistente) {
      const senhaHash = await bcrypt.hash('admin123', 10);
      if (isPostgres) {
        await dbRun('INSERT INTO usuarios (email, senha, nome) VALUES ($1, $2, $3)', ['admin@kpr.com', senhaHash, 'Admin']);
      } else {
        await dbRun('INSERT INTO usuarios (email, senha, nome) VALUES (?, ?, ?)', ['admin@kpr.com', senhaHash, 'Admin']);
      }
      console.log('✓ Admin padrão criado: admin@kpr.com / admin123');
    }
  } catch (err) {
    console.error('Erro ao inicializar tabelas:', err);
  }
}

export { sqliteDb as db, dbRun, dbGet, dbAll, initDb };
