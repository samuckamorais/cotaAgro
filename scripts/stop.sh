#!/bin/bash

# FarmFlow - Script de Stop
# Para os containers

set -e

echo "🛑 FarmFlow - Parando containers..."

# Verificar se está no diretório correto
cd "$(dirname "$0")/.."

# Parar containers
docker compose stop

echo ""
echo "✅ Containers parados!"
echo ""
echo "🚀 Para reiniciar: ./scripts/start.sh"
echo ""
