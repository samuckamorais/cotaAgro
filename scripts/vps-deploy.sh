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
echo " Versão: 1.2 (WhatsApp Config + RBAC)"
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
# Normalizar line endings (CRLF -> LF) para compatibilidade com arquivos editados no Windows
sed -i 's/\r//' .env
source .env
MISSING=()
[ -z "$JWT_SECRET" ]          && MISSING+=("JWT_SECRET")
[ -z "$ENCRYPTION_KEY" ]      && MISSING+=("ENCRYPTION_KEY")
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
PUBLIC_IP=$(curl -4 -s --max-time 5 ifconfig.me || curl -4 -s --max-time 5 api.ipify.org || echo "")

if [ -n "$PUBLIC_IP" ]; then
  WEBHOOK_URL="http://${PUBLIC_IP}:3000"
  VITE_API_URL="http://${PUBLIC_IP}:3000"

  # Atualiza ou adiciona WEBHOOK_URL no .env
  if grep -q "^WEBHOOK_URL=" .env; then
    sed -i "s|^WEBHOOK_URL=.*|WEBHOOK_URL=${WEBHOOK_URL}|" .env
  else
    echo "WEBHOOK_URL=${WEBHOOK_URL}" >> .env
  fi

  # Atualiza ou adiciona VITE_API_URL no .env (necessário para o build do frontend)
  if grep -q "^VITE_API_URL=" .env; then
    sed -i "s|^VITE_API_URL=.*|VITE_API_URL=${VITE_API_URL}|" .env
  else
    echo "VITE_API_URL=${VITE_API_URL}" >> .env
  fi

  echo -e "${GREEN}✅ WEBHOOK_URL atualizado: ${WEBHOOK_URL}${NC}"
  echo -e "${GREEN}✅ VITE_API_URL atualizado: ${VITE_API_URL}${NC}"
else
  echo -e "${YELLOW}⚠️  Não foi possível detectar o IP público. WEBHOOK_URL e VITE_API_URL não atualizados.${NC}"
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
# 3. Verificar dependências do frontend (Tailwind v3)
# -----------------------------------------------------------
echo -e "${YELLOW}[3/7] Verificando dependências do frontend...${NC}"
cd frontend
if [ -f "package.json" ]; then
  # Verificar se Tailwind está na versão correta
  TAILWIND_VERSION=$(npm list tailwindcss --depth=0 2>/dev/null | grep tailwindcss || echo "")
  if [[ "$TAILWIND_VERSION" == *"4."* ]]; then
    echo -e "${YELLOW}⚠️  Tailwind CSS v4 detectado. Forçando v3 para compatibilidade...${NC}"
    npm uninstall tailwindcss
    npm install -D tailwindcss@^3.4.0
    echo -e "${GREEN}✅ Tailwind CSS v3 instalado${NC}"
  else
    echo -e "${GREEN}✅ Tailwind CSS v3 já está instalado${NC}"
  fi
fi
cd ..

# -----------------------------------------------------------
# 4. Build e subir containers
# -----------------------------------------------------------
echo -e "${YELLOW}[4/7] Fazendo build e subindo containers...${NC}"
docker compose down --remove-orphans
docker compose up -d --build
echo -e "${GREEN}✅ Containers iniciados${NC}"

# -----------------------------------------------------------
# 5. Aguardar banco de dados
# -----------------------------------------------------------
echo -e "${YELLOW}[5/7] Aguardando banco de dados...${NC}"
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
# 6. Migrations, Prisma Client e Seed
# -----------------------------------------------------------
echo -e "${YELLOW}[6/7] Executando migrations e configurando banco...${NC}"

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

# 5.4 - Validar tabelas críticas criadas
echo "  → Validando estrutura do banco..."
CRITICAL_TABLES=("User" "Producer" "Supplier" "Quote" "Proposal" "Subscription" "tenants" "whatsapp_configs")
MISSING_TABLES=()

for table in "${CRITICAL_TABLES[@]}"; do
  TABLE_EXISTS=$(docker compose exec -T postgres psql -U postgres -d cotaagro -tAc \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='$table';" 2>/dev/null || echo "0")

  if [ "$(echo $TABLE_EXISTS | tr -d ' ')" = "0" ]; then
    MISSING_TABLES+=("$table")
  fi
done

if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
  echo -e "${RED}❌ Tabelas ausentes no banco:${NC}"
  for table in "${MISSING_TABLES[@]}"; do
    echo "   - $table"
  done
  echo -e "${YELLOW}⚠️  Execute: docker compose exec backend npx prisma migrate reset${NC}"
else
  echo -e "${GREEN}✅ Todas as tabelas críticas estão presentes${NC}"
fi

# 5.5 - Conceder permissões WhatsApp para admins
echo "  → Concedendo permissões WhatsApp para administradores..."
docker compose exec -T backend npx tsx scripts/seed-whatsapp-permission.ts 2>/dev/null || {
  echo -e "${YELLOW}⚠️  Script de permissões WhatsApp não executado (pode já estar configurado)${NC}"
}
echo -e "${GREEN}✅ Permissões WhatsApp verificadas${NC}"

# -----------------------------------------------------------
# 7. Reiniciar backend para aplicar mudanças
# -----------------------------------------------------------
echo -e "${YELLOW}[7/7] Reiniciando serviços...${NC}"
docker compose restart backend
echo -e "${GREEN}✅ Backend reiniciado${NC}"

# Aguardar o backend estar pronto
echo "  → Aguardando backend inicializar..."
sleep 5

# Verificar módulos críticos no backend
echo "  → Verificando módulos do backend..."
BACKEND_MODULES=("auth" "producers" "suppliers" "quotes" "subscriptions" "dashboard" "users" "whatsapp-config")
BACKEND_SRC="backend/src/modules"

if [ -d "$BACKEND_SRC" ]; then
  for module in "${BACKEND_MODULES[@]}"; do
    if [ ! -d "$BACKEND_SRC/$module" ]; then
      echo -e "${YELLOW}   ⚠️  Módulo '$module' não encontrado${NC}"
    fi
  done
  echo -e "${GREEN}✅ Módulos principais verificados${NC}"
else
  echo -e "${YELLOW}⚠️  Diretório de módulos não encontrado${NC}"
fi

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
PUBLIC_IP=$(curl -4 -s --max-time 3 ifconfig.me || echo "seu-ip")
echo "  Frontend:  http://${PUBLIC_IP}:5173"
echo "  Backend:   http://${PUBLIC_IP}:3000"
echo "  Health:    http://${PUBLIC_IP}:3000/health"
echo ""
echo -e "${GREEN}Funcionalidades disponíveis:${NC}"
echo "  ✅ Dashboard com KPIs"
echo "  ✅ Gestão de Cotações"
echo "  ✅ Gestão de Produtores"
echo "  ✅ Gestão de Fornecedores"
echo "  ✅ Gestão de Usuários (permissões)"
echo "  ✅ Gestão de Assinaturas (planos: BASIC, PRO, ENTERPRISE)"
echo "  ✅ Configuração WhatsApp (Twilio, Evolution API) - NOVO"
echo "  ✅ RBAC (Controle de Acesso Baseado em Funções)"
echo "  ✅ Design System: Clean Minimal Utility"
echo ""
echo "Comandos úteis:"
echo "  Ver logs:              docker compose logs -f"
echo "  Ver log backend:       docker compose logs -f backend"
echo "  Ver log frontend:      docker compose logs -f frontend"
echo "  Reiniciar tudo:        docker compose restart"
echo "  Reiniciar backend:     docker compose restart backend"
echo "  Parar:                 docker compose down"
echo "  Ver banco (Prisma):    docker compose exec backend npx prisma studio"
echo ""
echo "Troubleshooting:"
echo "  Se frontend não carrega: docker compose logs frontend"
echo "  Se backend dá erro:      docker compose logs backend | tail -50"
echo "  Se banco não conecta:    docker compose logs postgres"
echo "  Resetar banco:           docker compose exec backend npx prisma migrate reset"
echo ""
