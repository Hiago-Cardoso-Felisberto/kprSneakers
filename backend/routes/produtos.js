import express from 'express';
import { dbGet, dbAll, dbRun, isPostgres } from '../database.js';
import { verificarToken } from '../auth.js';

const router = express.Router();

// Helper de placeholders
const p = (n) => isPostgres ? `$${n}` : '?';

// GET: Listar todos os produtos
router.get('/', async (req, res) => {
  try {
    const produtos = await dbAll('SELECT * FROM produtos ORDER BY id DESC');

    const produtosCompletos = await Promise.all(
      produtos.map(async (prod) => {
        const cores = await dbAll(
          `SELECT * FROM cores WHERE produto_id = ${p(1)}`,
          [prod.id]
        );

        const coresCompletas = await Promise.all(
          cores.map(async (cor) => {
            const galeria = await dbAll(
              `SELECT url FROM galeria WHERE cor_id = ${p(1)}`,
              [cor.id]
            );

            return {
              nome: cor.nome,
              hex: cor.hex,
              gallery: galeria.map(g => g.url)
            };
          })
        );

        return { ...prod, cores: coresCompletas };
      })
    );

    res.json(produtosCompletos);
  } catch (err) {
    console.error('Erro ao listar produtos:', err);
    res.status(500).json({ erro: 'Erro ao listar produtos' });
  }
});

// GET: Produto por ID
router.get('/:id', async (req, res) => {
  try {
    const produto = await dbGet(
      `SELECT * FROM produtos WHERE id = ${p(1)}`,
      [req.params.id]
    );

    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    const cores = await dbAll(
      `SELECT * FROM cores WHERE produto_id = ${p(1)}`,
      [produto.id]
    );

    const coresCompletas = await Promise.all(
      cores.map(async (cor) => {
        const galeria = await dbAll(
          `SELECT url FROM galeria WHERE cor_id = ${p(1)}`,
          [cor.id]
        );

        return {
          nome: cor.nome,
          hex: cor.hex,
          gallery: galeria.map(g => g.url)
        };
      })
    );

    res.json({ ...produto, cores: coresCompletas });
  } catch (err) {
    console.error('Erro ao buscar produto:', err);
    res.status(500).json({ erro: 'Erro ao buscar produto' });
  }
});

// POST: Criar produto
router.post('/', verificarToken, async (req, res) => {
  try {
    if (req.usuario.email !== 'admin@kpr.com') {
      return res.status(403).json({ erro: 'Apenas o admin pode criar produtos' });
    }

    const { nome, tipo, preco, cores } = req.body;

    if (!nome || !tipo || !Array.isArray(cores) || cores.length === 0) {
      return res.status(400).json({ erro: 'Nome, tipo e cores são obrigatórios' });
    }

    const insertProduto = isPostgres
      ? `INSERT INTO produtos (nome, tipo, preco) VALUES ($1, $2, $3) RETURNING id`
      : `INSERT INTO produtos (nome, tipo, preco) VALUES (?, ?, ?)`;

    const result = await dbRun(insertProduto, [nome, tipo, preco || null]);
    const produtoId = isPostgres ? result.rows[0].id : result.lastID;

    for (const cor of cores) {
      const insertCor = isPostgres
        ? `INSERT INTO cores (produto_id, nome, hex) VALUES ($1, $2, $3) RETURNING id`
        : `INSERT INTO cores (produto_id, nome, hex) VALUES (?, ?, ?)`;

      const corResult = await dbRun(insertCor, [produtoId, cor.nome, cor.hex]);
      const corId = isPostgres ? corResult.rows[0].id : corResult.lastID;

      if (Array.isArray(cor.gallery)) {
        for (const url of cor.gallery) {
          await dbRun(
            `INSERT INTO galeria (cor_id, url) VALUES (${p(1)}, ${p(2)})`,
            [corId, url]
          );
        }
      }
    }

    res.status(201).json({ mensagem: 'Produto criado com sucesso', produtoId });
  } catch (err) {
    console.error('Erro ao criar produto:', err);
    res.status(500).json({ erro: 'Erro ao criar produto' });
  }
});

// PUT: Atualizar produto
router.put('/:id', verificarToken, async (req, res) => {
  try {
    if (req.usuario.email !== 'admin@kpr.com') {
      return res.status(403).json({ erro: 'Apenas o admin pode atualizar produtos' });
    }

    const produto = await dbGet(
      `SELECT id FROM produtos WHERE id = ${p(1)}`,
      [req.params.id]
    );

    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    await dbRun(
      `UPDATE produtos SET nome = ${p(1)}, tipo = ${p(2)}, preco = ${p(3)} WHERE id = ${p(4)}`,
      [req.body.nome, req.body.tipo, req.body.preco || null, req.params.id]
    );

    await dbRun(
      `DELETE FROM cores WHERE produto_id = ${p(1)}`,
      [req.params.id]
    );

    res.json({ mensagem: 'Produto atualizado com sucesso' });
  } catch (err) {
    console.error('Erro ao atualizar produto:', err);
    res.status(500).json({ erro: 'Erro ao atualizar produto' });
  }
});

// DELETE: Deletar produto
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    if (req.usuario.email !== 'admin@kpr.com') {
      return res.status(403).json({ erro: 'Apenas o admin pode deletar produtos' });
    }

    await dbRun(
      `DELETE FROM produtos WHERE id = ${p(1)}`,
      [req.params.id]
    );

    res.json({ mensagem: 'Produto deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar produto:', err);
    res.status(500).json({ erro: 'Erro ao deletar produto' });
  }
});

export default router;
