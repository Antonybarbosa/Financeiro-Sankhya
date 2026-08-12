@echo off
echo 🚀 Financeiro Sankhya - Inicializacao
echo ====================================
echo.

REM Verificar se Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js não está instalado.
    pause
    exit /b 1
)

REM Menu de opções
echo Selecione uma opcao:
echo 1. Iniciar Backend (API)
echo 2. Iniciar Frontend (em desenvolvimento)
echo 3. Iniciar Backend + Frontend
echo 4. Sair
echo.
set /p opcao="Opcao: "

if "%opcao%"=="1" (
    echo.
    echo 🚀 Iniciando Backend...
    cd backend
    call start.bat
) else if "%opcao%"=="2" (
    echo.
    echo ⏳ Frontend em desenvolvimento...
    echo Veja frontend/README.md para detalhes.
    pause
) else if "%opcao%"=="3" (
    echo.
    echo 🚀 Iniciando Backend + Frontend...
    echo ⏳ Frontend em desenvolvimento, iniciando apenas Backend...
    cd backend
    call start.bat
) else if "%opcao%"=="4" (
    echo Saindo...
    exit /b 0
) else (
    echo ❌ Opcao invalida.
    pause
    exit /b 1
)