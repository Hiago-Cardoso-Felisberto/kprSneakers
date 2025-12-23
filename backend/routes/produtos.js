import express from 'express';
import { dbGet, dbAll, dbRun } from '../database.js';
import { verificarToken } from '../auth.js';

const router = express.Router();

// GET: LISTAR PRODUTOS
router.get('/', async (req, res) => {
  try {
    const produtos = await dbAll(
      'SELECT * FROM produtos ORDER BY id DESC'
    );

    const produtosCompletos = await Promise.all(
      produtos.map(async (produto) => {
        const cores = await dbAll(
          'SELECT * FROM cores WHERE produto_id = $1',
          [produto.id]
        );

        const coresCompletas = await Promise.all(
          cores.map(async (cor) => {
            const galeria = await dbAll(
              'SELECT url FROM galeria WHERE cor_id = $1',
              [cor.id]
            );

            return {
              nome: cor.nome,
              hex: cor.hex,
              gallery: galeria.map(g => g.url)
            };
          })
        );

        return { ...produto, cores: coresCompletas };
      })
    );

    res.json(produtosCompletos);
  } catch (err) {
    console.error('Erro ao listar produtos:', err);
    res.status(500).json({ erro: 'Erro ao listar produtos' });
  }
});

// GET: PRODUTO POR ID
router.get('/:id', async (req, res) => {
  try {
    const produto = await dbGet(
      'SELECT * FROM produtos WHERE id = $1',
      [req.params.id]
    );

    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    const cores = await dbAll(
      'SELECT * FROM cores WHERE produto_id = $1',
      [produto.id]
    );

    const coresCompletas = await Promise.all(
      cores.map(async (cor) => {
        const galeria = await dbAll(
          'SELECT url FROM galeria WHERE cor_id = $1',
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

// POST: CRIAR PRODUTO
router.post('/', verificarToken, async (req, res) => {
  try {
    if (req.usuario.email !== 'admin@kpr.com') {
      return res.status(403).json({
        erro: 'Apenas o admin pode criar produtos'
      });
    }

    const { nome, tipo, preco, cores } = req.body;

    if (!nome || !tipo || !Array.isArray(cores) || cores.length === 0) {
      return res.status(400).json({
        erro: 'Nome, tipo e cores são obrigatórios'
      });
    }

    const result = await dbRun(
      'INSERT INTO produtos (nome, tipo, preco) VALUES ($1, $2, $3)',
      [nome, tipo, preco || null]
    );

    const produtoId = result.lastID;

    for (const cor of cores) {
      const corResult = await dbRun(
        'INSERT INTO cores (produto_id, nome, hex) VALUES ($1, $2, $3)',
        [produtoId, cor.nome, cor.hex]
      );

      const corId = corResult.lastID;

      if (Array.isArray(cor.gallery)) {
        for (const url of cor.gallery) {
          await dbRun(
            'INSERT INTO galeria (cor_id, url) VALUES ($1, $2)',
            [corId, url]
          );
        }
      }
    }

    res.status(201).json({
      mensagem: 'Produto criado com sucesso',
      produtoId
    });
  } catch (err) {
    console.error('Erro ao criar produto:', err);
    res.status(500).json({ erro: 'Erro ao criar produto' });
  }
});

// PUT: ATUALIZAR PRODUTO
router.put('/:id', verificarToken, async (req, res) => {
  try {
    if (req.usuario.email !== 'admin@kpr.com') {
      return res.status(403).json({
        erro: 'Apenas o admin pode atualizar produtos'
      });
    }

    const { nome, tipo, preco } = req.body;

    const produto = await dbGet(
      'SELECT id FROM produtos WHERE id = $1',
      [req.params.id]
    );

    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    await dbRun(
      'UPDATE produtos SET nome = $1, tipo = $2, preco = $3 WHERE id = $4',
      [nome, tipo, preco || null, req.params.id]
    );

    await dbRun(
      'DELETE FROM cores WHERE produto_id = $1',
      [req.params.id]
    );

    res.json({ mensagem: 'Produto atualizado com sucesso' });
  } catch (err) {
    console.error('Erro ao atualizar produto:', err);
    res.status(500).json({ erro: 'Erro ao atualizar produto' });
  }
});

// DELETE: DELETAR PRODUTO
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    if (req.usuario.email !== 'admin@kpr.com') {
      return res.status(403).json({
        erro: 'Apenas o admin pode deletar produtos'
      });
    }

    await dbRun(
      'DELETE FROM produtos WHERE id = $1',
      [req.params.id]
    );

    res.json({ mensagem: 'Produto deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar produto:', err);
    res.status(500).json({ erro: 'Erro ao deletar produto' });
  }
});

export default router;
