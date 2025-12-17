@echo off
REM Setup automático para KPR IMPORTS (Windows)

echo.
echo 🚀 Setup KPR IMPORTS
echo ====================

REM Instalar dependências do backend
echo.
echo 📦 Instalando dependências do backend...
cd backend
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erro ao instalar dependências
    exit /b 1
)

echo ✅ Dependências instaladas com sucesso

REM Voltar para o diretório raiz
cd ..

echo.
echo ✨ Setup concluído!
echo.
echo Próximos passos:
echo 1. Configure seu .env em backend\.env (mude JWT_SECRET!)
echo 2. Inicie o servidor: cd backend ^&^& npm start
echo 3. Acesse http://localhost:8000 em outro terminal
echo.
pause
