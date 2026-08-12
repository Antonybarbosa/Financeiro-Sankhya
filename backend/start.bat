@echo off
echo 🚀 Iniciando Sistema de Cobranca - Integracao Sankhya
echo ==================================================
echo.

REM Verificar se o Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js não está instalado. Por favor, instale o Node.js primeiro.
    pause
    exit /b 1
)

REM Verificar se o .env existe
if not exist .env (
    echo ❌ Arquivo .env não encontrado. Por favor, crie o arquivo .env com as configuracoes.
    pause
    exit /b 1
)

REM Verificar dependências
if not exist node_modules (
    echo 📦 Instalando dependencias...
    call npm install
)

REM Compilar o projeto
echo 🔨 Compilando projeto...
call npm run build

if %errorlevel% equ 0 (
    echo ✅ Build concluido com sucesso!
    echo.
    echo 🚀 Iniciando servidor...
    echo    - URL: http://localhost:3001
    echo    - Health: http://localhost:3001/health
    echo    - API Docs: Verifique EXEMPLOS_USO.md
    echo.
    echo Pressione Ctrl+C para parar o servidor.
    echo.
    
    call npm start
) else (
    echo ❌ Erro na compilacao. Verifique os erros acima.
    pause
    exit /b 1
)