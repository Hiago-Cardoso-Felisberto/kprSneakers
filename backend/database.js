import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Erro ao conectar ao banco:', err);
  else console.log('✓ Conectado ao SQLite');
});

// Promisify para usar async/await
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

// Inicializar tabelas
async function initDb() {
  try {
    // Tabela de usuários (admin)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        nome TEXT NOT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de produtos
    await dbRun(`
      CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL,
        preco REAL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de cores (associadas a produtos)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS cores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER NOT NULL,
        nome TEXT NOT NULL,
        hex TEXT NOT NULL,
        FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
      )
    `);

    // Tabela de imagens da galeria (associadas a cores)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS galeria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cor_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        FOREIGN KEY (cor_id) REFERENCES cores(id) ON DELETE CASCADE
      )
    `);

    console.log('✓ Tabelas inicializadas');

    // Criar admin padrão se não existir
    const adminExistente = await dbGet('SELECT * FROM usuarios WHERE email = ?', ['admin@kpr.com']);
    if (!adminExistente) {
      const senhaHash = await bcrypt.hash('admin123', 10);
      await dbRun(
        'INSERT INTO usuarios (email, senha, nome) VALUES (?, ?, ?)',
        ['admin@kpr.com', senhaHash, 'Admin']
      );
      console.log('✓ Admin padrão criado: admin@kpr.com / admin123');
    }
  } catch (err) {
    console.error('Erro ao inicializar tabelas:', err);
  }
}

export { db, dbRun, dbGet, dbAll, initDb };
