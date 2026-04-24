import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL não está definida. O backend exige Postgres.');
  process.exit(1);
}

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const isPostgres = true;
console.log('Usando Postgres (DATABASE_URL detectado)');

function normalizeSql(sql) {
  return sql;
}

// DB HELPERS
const dbRun = async (sql, params = []) => {
  const finalSql = normalizeSql(sql);
  const isInsert = /^\s*INSERT\b/i.test(finalSql);
  const hasReturning = /RETURNING\s+\w+/i.test(finalSql);
  const sqlWithReturning =
    isInsert && !hasReturning ? `${finalSql} RETURNING id` : finalSql;

  const res = await pgPool.query(sqlWithReturning, params);
  if (isInsert) return { lastID: res.rows[0].id };
  return res;
};

const dbGet = async (sql, params = []) => {
  const finalSql = normalizeSql(sql);
  const res = await pgPool.query(finalSql, params);
  return res.rows[0] || null;
};

const dbAll = async (sql, params = []) => {
  const finalSql = normalizeSql(sql);
  const res = await pgPool.query(finalSql, params);
  return res.rows || [];
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

    console.log('Tabelas inicializadas');

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
      console.log('Admin padrão criado');
    }
  } catch (err) {
    console.error('Erro ao inicializar tabelas:', err);
  }
}

export { dbRun, dbGet, dbAll, initDb };
