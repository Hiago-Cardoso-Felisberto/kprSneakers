import jwt from 'jsonwebtoken';
import { config } from 'dotenv';

config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_me';

// Gerar token JWT
export function gerarToken(usuarioId, email) {
  return jwt.sign(
    { id: usuarioId, email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Verificar token JWT
export function verificarToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}