#!/bin/bash
# Setup automático para KPR IMPORTS

echo "🚀 Setup KPR IMPORTS"
echo "=================="

# Instalar dependências do backend
echo ""
echo "📦 Instalando dependências do backend..."
cd backend
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências"
    exit 1
fi

echo "✅ Dependências instaladas com sucesso"

# Voltar para o diretório raiz
cd ..

echo ""
echo "✨ Setup concluído!"
echo ""
echo "Próximos passos:"
echo "1. Configure seu .env em backend/.env (mude JWT_SECRET!)"
echo "2. Inicie o servidor: cd backend && npm start"
echo "3. Acesse http://localhost:8000 em outro terminal"
echo ""
