import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { initDb } from './database.js';
import authRoutes from './routes/auth.js';
import produtosRoutes from './routes/produtos.js';

config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sem origin (requisições same-origin, curl, etc)
    if (!origin || origin === 'null') return callback(null, true);
    
    // Domínios permitidos
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'https://kpr-sneakers.vercel.app',
      'https://www.kpr-sneakers.vercel.app',
      'https://kprsneakers.vercel.app',
      'https://www.kprsneakers.vercel.app',
      'https://kprsneakers.com',
      'https://www.kprsneakers.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Log para debug
      console.warn(`CORS rejeitado para origin: ${origin}`);
      callback(null, true); // Temporário: aceitar mesmo assim (remover em produção)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Inicializar banco
await initDb();

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtosRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`\n📝 Primeiro passo: registre um admin em POST /api/auth/register`);
  console.log(`Exemplo: { "email": "admin@kpr.com", "senha": "senha123", "nome": "Admin" }`);
  console.log(`\n🔑 Depois faça login em POST /api/auth/login com o token retornado`);
  console.log(`\nAPIs disponíveis:`);
  console.log(`  GET  /api/produtos              - Listar todos os produtos`);
  console.log(`  GET  /api/produtos/:id          - Obter um produto`);
  console.log(`  POST /api/produtos              - Criar produto (requer autenticação)`);
  console.log(`  PUT  /api/produtos/:id          - Atualizar produto (requer autenticação)`);
  console.log(`  DELETE /api/produtos/:id        - Deletar produto (requer autenticação)`);
});
