#!/bin/bash

echo "🚀 Iniciando Sistema de Cobrança - Integração Sankhya"
echo "=================================================="
echo ""

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null
then
    echo "❌ Node.js não está instalado. Por favor, instale o Node.js primeiro."
    exit 1
fi

# Verificar se o .env existe
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado. Por favor, crie o arquivo .env com as configurações."
    exit 1
fi

# Verificar dependências
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Compilar o projeto
echo "🔨 Compilando projeto..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
    echo ""
    echo "🚀 Iniciando servidor..."
    echo "   - URL: http://localhost:3001"
    echo "   - Health: http://localhost:3001/health"
    echo "   - API Docs: Verifique EXEMPLOS_USO.md"
    echo ""
    echo "Pressione Ctrl+C para parar o servidor."
    echo ""
    
    npm start
else
    echo "❌ Erro na compilação. Verifique os erros acima."
    exit 1
fi