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

# Verificar e criar .env se não existir
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}⚠️  Arquivo .env não encontrado. Criando a partir de .env.example...${NC}"
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Arquivo .env criado${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANTE: Configure as variáveis obrigatórias no .env antes de continuar!${NC}"
    echo -e "${YELLOW}   Edite: nano .env${NC}"
    echo ""
    read -p "Pressione ENTER após configurar o .env ou Ctrl+C para cancelar..."
  else
    echo -e "${RED}❌ Arquivo .env.example não encontrado.${NC}"
    exit 1
  fi
fi

# Copiar .env para backend se não existir
if [ ! -f "backend/.env" ]; then
  echo -e "${YELLOW}Copiando .env para backend/...${NC}"
  cp .env backend/.env
  echo -e "${GREEN}✅ backend/.env criado${NC}"
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
# 0. Atualizar WEBHOOK_URL com IP público da VPS
# -----------------------------------------------------------
echo -e "${YELLOW}[0/5] Detectando IP público da VPS...${NC}"
PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me || curl -s --max-time 5 api.ipify.org || echo "")

if [ -n "$PUBLIC_IP" ]; then
  WEBHOOK_URL="http://${PUBLIC_IP}:3000"
  # Atualiza ou adiciona WEBHOOK_URL no .env
  if grep -q "^WEBHOOK_URL=" .env; then
    sed -i "s|^WEBHOOK_URL=.*|WEBHOOK_URL=${WEBHOOK_URL}|" .env
  else
    echo "WEBHOOK_URL=${WEBHOOK_URL}" >> .env
  fi
  echo -e "${GREEN}✅ WEBHOOK_URL atualizado: ${WEBHOOK_URL}${NC}"
else
  echo -e "${YELLOW}⚠️  Não foi possível detectar o IP público. WEBHOOK_URL não atualizado.${NC}"
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
# 5. Migrations, Prisma Client e Seed
# -----------------------------------------------------------
echo -e "${YELLOW}[5/6] Executando migrations e configurando banco...${NC}"

# 5.1 - Aplicar migrations do Prisma
echo "  → Aplicando migrations..."
docker compose exec -T backend npx prisma migrate deploy
echo -e "${GREEN}✅ Migrations aplicadas${NC}"

# 5.2 - Gerar Prisma Client atualizado
echo "  → Gerando Prisma Client..."
docker compose exec -T backend npx prisma generate
echo -e "${GREEN}✅ Prisma Client gerado${NC}"

# 5.3 - Seed: Verificar e popular dados iniciais
echo "  → Verificando dados iniciais..."
USER_COUNT=$(docker compose exec -T postgres psql -U postgres -d cotaagro -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='User';" 2>/dev/null || echo "0")

if [ "$USER_COUNT" = "1" ]; then
  # Tabela User existe, verificar se está vazia
  DATA_COUNT=$(docker compose exec -T postgres psql -U postgres -d cotaagro -tAc \
    "SELECT COUNT(*) FROM \"User\";" 2>/dev/null || echo "0")

  if [ "$(echo $DATA_COUNT | tr -d ' ')" = "0" ]; then
    echo -e "${YELLOW}  → Populando banco com dados iniciais (Admin user)...${NC}"
    docker compose exec -T backend npm run prisma:seed
    echo -e "${GREEN}✅ Seed executado - Usuário Admin criado${NC}"
    echo -e "${GREEN}   Email: admin@cotaagro.com${NC}"
    echo -e "${GREEN}   Senha: Farmflow0147*${NC}"
  else
    echo "  ℹ️  Banco já possui dados, seed ignorado."
  fi
else
  # Tabela não existe, executar seed
  echo -e "${YELLOW}  → Populando banco com dados iniciais (Admin user)...${NC}"
  docker compose exec -T backend npm run prisma:seed
  echo -e "${GREEN}✅ Seed executado - Usuário Admin criado${NC}"
  echo -e "${GREEN}   Email: admin@cotaagro.com${NC}"
  echo -e "${GREEN}   Senha: Farmflow0147*${NC}"
fi

# -----------------------------------------------------------
# 6. Reiniciar backend para aplicar mudanças
# -----------------------------------------------------------
echo -e "${YELLOW}[6/6] Reiniciando serviços...${NC}"
docker compose restart backend
echo -e "${GREEN}✅ Backend reiniciado${NC}"

# Aguardar o backend estar pronto
echo "  → Aguardando backend inicializar..."
sleep 5

# -----------------------------------------------------------
# Status final e health check
# -----------------------------------------------------------
echo ""
echo "============================================="
echo " Verificando status dos serviços"
echo "============================================="
docker compose ps
echo ""

# Health check do backend
echo -e "${YELLOW}Verificando health do backend...${NC}"
sleep 2
HEALTH_CHECK=$(curl -s http://localhost:3000/health || echo "FAILED")
if [[ "$HEALTH_CHECK" == *"ok"* ]] || [[ "$HEALTH_CHECK" == *"healthy"* ]]; then
  echo -e "${GREEN}✅ Backend está saudável${NC}"
else
  echo -e "${YELLOW}⚠️  Backend pode não estar totalmente inicializado. Verifique os logs.${NC}"
fi

echo ""
echo "============================================="
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo "============================================="
echo ""
echo -e "${GREEN}Credenciais padrão:${NC}"
echo "  Email: admin@cotaagro.com"
echo "  Senha: Farmflow0147*"
echo ""
echo "URLs:"
PUBLIC_IP=$(curl -s --max-time 3 ifconfig.me || echo "seu-ip")
echo "  Frontend:  http://${PUBLIC_IP}:5173"
echo "  Backend:   http://${PUBLIC_IP}:3000"
echo "  Health:    http://${PUBLIC_IP}:3000/health"
echo ""
echo "Comandos úteis:"
echo "  Ver logs:        docker compose logs -f"
echo "  Ver log backend: docker compose logs -f backend"
echo "  Reiniciar:       docker compose restart"
echo "  Parar:           docker compose down"
echo ""
