#!/bin/bash

echo "🚀 Financeiro Sankhya - Inicialização"
echo "===================================="
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null
then
    echo "❌ Node.js não está instalado."
    exit 1
fi

# Menu de opções
echo "Selecione uma opção:"
echo "1. Iniciar Backend (API)"
echo "2. Iniciar Frontend (em desenvolvimento)"
echo "3. Iniciar Backend + Frontend"
echo "4. Sair"
echo ""
read -p "Opção: " opcao

case $opcao in
    1)
        echo ""
        echo "🚀 Iniciando Backend..."
        cd backend
        ./start.sh
        ;;
    2)
        echo ""
        echo "⏳ Frontend em desenvolvimento..."
        echo "Veja frontend/README.md para detalhes."
        ;;
    3)
        echo ""
        echo "🚀 Iniciando Backend + Frontend..."
        echo "⏳ Frontend em desenvolvimento, iniciando apenas Backend..."
        cd backend
        ./start.sh
        ;;
    4)
        echo "Saindo..."
        exit 0
        ;;
    *)
        echo "❌ Opção inválida."
        exit 1
        ;;
esac