#!/bin/bash

# =============================================================
# CotaAgro - Deploy / Atualização na VPS
# Execute a partir da raiz do projeto: bash scripts/vps-deploy.sh
# =============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

echo ""
echo "============================================="
echo " CotaAgro - Deploy"
echo " Diretório: $REPO_DIR"
echo "============================================="
echo ""

# -----------------------------------------------------------
# Verificações
# -----------------------------------------------------------
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker não encontrado. Execute vps-install.sh primeiro.${NC}"
  exit 1
fi

if [ ! -f ".env" ]; then
  echo -e "${RED}❌ Arquivo .env não encontrado. Copie .env.example e configure.${NC}"
  exit 1
fi

# Verificar variáveis obrigatórias
source .env
MISSING=()
[ -z "$JWT_SECRET" ]          && MISSING+=("JWT_SECRET")
[ -z "$TWILIO_ACCOUNT_SID" ]  && MISSING+=("TWILIO_ACCOUNT_SID")
[ -z "$TWILIO_AUTH_TOKEN" ]   && MISSING+=("TWILIO_AUTH_TOKEN")
[ -z "$OPENAI_API_KEY" ]      && MISSING+=("OPENAI_API_KEY")

if [ ${#MISSING[@]} -gt 0 ]; then
  echo -e "${RED}❌ Variáveis obrigatórias não configuradas no .env:${NC}"
  for var in "${MISSING[@]}"; do
    echo "   - $var"
  done
  exit 1
fi

# -----------------------------------------------------------
# 1. Pull do repositório
# -----------------------------------------------------------
echo -e "${YELLOW}[1/5] Atualizando código...${NC}"
git pull origin main
echo -e "${GREEN}✅ Código atualizado${NC}"

# -----------------------------------------------------------
# 2. Gerar package-lock.json se necessário
# -----------------------------------------------------------
if [ ! -f "backend/package-lock.json" ]; then
  echo -e "${YELLOW}[2/5] Gerando package-lock.json do backend...${NC}"
  cd backend && npm install --package-lock-only && cd ..
else
  echo -e "${GREEN}[2/5] package-lock.json já existe${NC}"
fi

if [ ! -f "frontend/package-lock.json" ]; then
  echo -e "${YELLOW}[2/5] Gerando package-lock.json do frontend...${NC}"
  cd frontend && npm install --package-lock-only && cd ..
fi

# -----------------------------------------------------------
# 3. Build e subir containers
# -----------------------------------------------------------
echo -e "${YELLOW}[3/5] Fazendo build e subindo containers...${NC}"
docker compose down --remove-orphans
docker compose up -d --build
echo -e "${GREEN}✅ Containers iniciados${NC}"

# -----------------------------------------------------------
# 4. Aguardar banco de dados
# -----------------------------------------------------------
echo -e "${YELLOW}[4/5] Aguardando banco de dados...${NC}"
RETRIES=15
until docker compose exec -T postgres pg_isready -U postgres &>/dev/null || [ $RETRIES -eq 0 ]; do
  echo "  Aguardando PostgreSQL... ($RETRIES)"
  RETRIES=$((RETRIES-1))
  sleep 3
done

if [ $RETRIES -eq 0 ]; then
  echo -e "${RED}❌ PostgreSQL não respondeu. Verifique os logs: docker compose logs postgres${NC}"
  exit 1
fi
echo -e "${GREEN}✅ PostgreSQL pronto${NC}"

# -----------------------------------------------------------
# 5. Migrations e seed
# -----------------------------------------------------------
echo -e "${YELLOW}[5/5] Executando migrations...${NC}"

# Verifica se já existem migrations criadas
MIGRATIONS_DIR="backend/prisma/migrations"
if [ -d "$MIGRATIONS_DIR" ] && [ "$(ls -A $MIGRATIONS_DIR 2>/dev/null)" ]; then
  # Já tem migrations — aplica sem criar novas
  docker compose exec -T backend npx prisma migrate deploy
else
  # Primeira vez — cria e aplica as migrations
  docker compose exec -T backend npx prisma migrate dev --name init --skip-seed
fi
echo -e "${GREEN}✅ Migrations aplicadas${NC}"

# Seed apenas na primeira vez (verifica se tabela users existe e está vazia)
USER_COUNT=$(docker compose exec -T postgres psql -U postgres -d cotaagro -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='users';" 2>/dev/null || echo "0")
if [ "$USER_COUNT" = "1" ]; then
  DATA_COUNT=$(docker compose exec -T postgres psql -U postgres -d cotaagro -tAc \
    "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
  if [ "$(echo $DATA_COUNT | tr -d ' ')" = "0" ]; then
    echo -e "${YELLOW}Populando banco com dados iniciais...${NC}"
    docker compose exec -T backend npx tsx prisma/seed.ts
    echo -e "${GREEN}✅ Seed executado${NC}"
  else
    echo "Banco já possui dados, seed ignorado."
  fi
else
  echo -e "${YELLOW}Populando banco com dados iniciais...${NC}"
  docker compose exec -T backend npx tsx prisma/seed.ts
  echo -e "${GREEN}✅ Seed executado${NC}"
fi

# -----------------------------------------------------------
# Status final
# -----------------------------------------------------------
echo ""
docker compose ps
echo ""
echo "============================================="
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo "============================================="
echo ""
echo "URLs:"
echo "  Frontend:  http://$(curl -s ifconfig.me):5173"
echo "  Backend:   http://$(curl -s ifconfig.me):3000"
echo "  Health:    http://$(curl -s ifconfig.me):3000/health"
echo ""
echo "Logs:"
echo "  docker compose logs -f"
echo ""
