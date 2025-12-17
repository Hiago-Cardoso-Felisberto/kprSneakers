import express from 'express';
import bcrypt from 'bcryptjs';
import { gerarToken, verificarToken } from '../auth.js';
import { dbGet, dbRun } from '../database.js';

const router = express.Router();

// Registrar novo admin (DESATIVADO - apenas um admin padrão)
router.post('/register', async (req, res) => {
  return res.status(403).json({ 
    erro: 'Registro de novos usuários não permitido. Apenas o admin padrão pode acessar o sistema.' 
  });
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const usuario = await dbGet('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (!usuario) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    // Gerar token
    const token = gerarToken(usuario.id, usuario.email);

    res.json({ 
      mensagem: 'Login realizado com sucesso',
      token,
      usuario: { id: usuario.id, email: usuario.email, nome: usuario.nome }
    });
  } catch (err) {
    console.error('Erro ao fazer login:', err);
    res.status(500).json({ erro: 'Erro ao fazer login' });
  }
});

// Alterar senha (requer autenticação)
router.post('/alterar-senha', verificarToken, async (req, res) => {
  try {
    const { senhaAtual, senhaNova } = req.body;

    if (!senhaAtual || !senhaNova) {
      return res.status(400).json({ erro: 'Senha atual e nova senha são obrigatórias' });
    }

    if (senhaNova.length < 6) {
      return res.status(400).json({ erro: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    // Buscar usuário autenticado
    const usuario = await dbGet('SELECT * FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // Verificar senha atual
    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Senha atual incorreta' });
    }

    // Hash da nova senha
    const senhaHash = await bcrypt.hash(senhaNova, 10);

    // Atualizar no banco
    await dbRun('UPDATE usuarios SET senha = ? WHERE id = ?', [senhaHash, req.usuario.id]);

    res.json({ mensagem: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    res.status(500).json({ erro: 'Erro ao alterar senha' });
  }
});

export default router;
