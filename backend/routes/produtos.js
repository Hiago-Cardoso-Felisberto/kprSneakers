import express from 'express';
import { dbGet, dbAll, dbRun } from '../database.js';
import { verificarToken } from '../auth.js';

const router = express.Router();

// GET: Listar todos os produtos (público)
router.get('/', async (req, res) => {
  try {
    const produtos = await dbAll('SELECT * FROM produtos ORDER BY id DESC');
    
    // Carregar cores e galeria para cada produto
    const produtosCompletos = await Promise.all(
      produtos.map(async (prod) => {
        const cores = await dbAll('SELECT * FROM cores WHERE produto_id = ?', [prod.id]);
        const coresCompletas = await Promise.all(
          cores.map(async (cor) => {
            const galeria = await dbAll('SELECT url FROM galeria WHERE cor_id = ?', [cor.id]);
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

// GET: Obter produto por ID (público)
router.get('/:id', async (req, res) => {
  try {
    const produto = await dbGet('SELECT * FROM produtos WHERE id = ?', [req.params.id]);
    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    const cores = await dbAll('SELECT * FROM cores WHERE produto_id = ?', [produto.id]);
    const coresCompletas = await Promise.all(
      cores.map(async (cor) => {
        const galeria = await dbAll('SELECT url FROM galeria WHERE cor_id = ?', [cor.id]);
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

// POST: Criar produto (requer autenticação como admin)
router.post('/', verificarToken, async (req, res) => {
  try {
    // Verificar se é admin
    if (req.usuario.email !== 'admin@kpr.com') {
      return res.status(403).json({ erro: 'Apenas o admin pode criar produtos' });
    }

    const { nome, tipo, preco, cores } = req.body;

    if (!nome || !tipo || !Array.isArray(cores) || cores.length === 0) {
      return res.status(400).json({ erro: 'Nome, tipo e cores são obrigatórios' });
    }

    // Inserir produto
    const result = await dbRun(
      'INSERT INTO produtos (nome, tipo, preco) VALUES (?, ?, ?)',
      [nome, tipo, preco || null]
    );
    const produtoId = result.lastID;

    // Inserir cores e galeria
    for (const cor of cores) {
      const corResult = await dbRun(
        'INSERT INTO cores (produto_id, nome, hex) VALUES (?, ?, ?)',
        [produtoId, cor.nome, cor.hex]
      );
      const corId = corResult.lastID;

      // Inserir URLs da galeria
      if (Array.isArray(cor.gallery)) {
        for (const url of cor.gallery) {
          await dbRun(
            'INSERT INTO galeria (cor_id, url) VALUES (?, ?)',
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

// PUT: Atualizar produto (requer autenticação como admin)
router.put('/:id', verificarToken, async (req, res) => {
  try {
    // Verificar se é admin
    if (req.usuario.email !== 'admin@kpr.com') {
      return res.status(403).json({ erro: 'Apenas o admin pode atualizar produtos' });
    }

    const { nome, tipo, preco, cores } = req.body;

    // Verificar se produto existe
    const produto = await dbGet('SELECT * FROM produtos WHERE id = ?', [req.params.id]);
    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    // Atualizar produto
    await dbRun(
      'UPDATE produtos SET nome = ?, tipo = ?, preco = ? WHERE id = ?',
      [nome, tipo, preco || null, req.params.id]
    );

    // Deletar cores antigas
    await dbRun('DELETE FROM cores WHERE produto_id = ?', [req.params.id]);

    // Inserir novas cores e galeria
    if (Array.isArray(cores)) {
      for (const cor of cores) {
        const corResult = await dbRun(
          'INSERT INTO cores (produto_id, nome, hex) VALUES (?, ?, ?)',
          [req.params.id, cor.nome, cor.hex]
        );
        const corId = corResult.lastID;

        if (Array.isArray(cor.gallery)) {
          for (const url of cor.gallery) {
            await dbRun(
              'INSERT INTO galeria (cor_id, url) VALUES (?, ?)',
              [corId, url]
            );
          }
        }
      }
    }

    res.json({ mensagem: 'Produto atualizado com sucesso' });
  } catch (err) {
    console.error('Erro ao atualizar produto:', err);
    res.status(500).json({ erro: 'Erro ao atualizar produto' });
  }
});

// DELETE: Deletar produto (requer autenticação como admin)
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    // Verificar se é admin
    if (req.usuario.email !== 'admin@kpr.com') {
      return res.status(403).json({ erro: 'Apenas o admin pode deletar produtos' });
    }

    const produto = await dbGet('SELECT * FROM produtos WHERE id = ?', [req.params.id]);
    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    await dbRun('DELETE FROM produtos WHERE id = ?', [req.params.id]);

    res.json({ mensagem: 'Produto deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar produto:', err);
    res.status(500).json({ erro: 'Erro ao deletar produto' });
  }
});

export default router;
