# CotaAgro - Makefile
# Atalhos para comandos comuns

.PHONY: help setup start stop restart logs logs-backend logs-frontend reset test-api prisma-studio prisma-seed clean

# Comando padrão
help:
	@echo "🌾 CotaAgro - Comandos Disponíveis"
	@echo "=================================="
	@echo ""
	@echo "Setup e Controle:"
	@echo "  make setup          - Setup completo (primeira vez)"
	@echo "  make start          - Iniciar containers"
	@echo "  make stop           - Parar containers"
	@echo "  make restart        - Reiniciar containers"
	@echo "  make reset          - Reset completo (apaga dados!)"
	@echo ""
	@echo "Logs:"
	@echo "  make logs           - Ver logs (todos)"
	@echo "  make logs-backend   - Ver logs do backend"
	@echo "  make logs-frontend  - Ver logs do frontend"
	@echo ""
	@echo "Banco de Dados:"
	@echo "  make prisma-studio  - Abrir Prisma Studio (GUI)"
	@echo "  make prisma-seed    - Popular banco com dados"
	@echo ""
	@echo "Testes:"
	@echo "  make test-api       - Testar API"
	@echo ""
	@echo "URLs:"
	@echo "  Frontend:  http://localhost:5173"
	@echo "  Backend:   http://localhost:3000"
	@echo "  Health:    http://localhost:3000/health"
	@echo ""

# Setup completo
setup:
	@chmod +x scripts/*.sh
	@./scripts/setup.sh

# Iniciar
start:
	@chmod +x scripts/start.sh
	@./scripts/start.sh

# Parar
stop:
	@chmod +x scripts/stop.sh
	@./scripts/stop.sh

# Reiniciar
restart:
	@chmod +x scripts/restart.sh
	@./scripts/restart.sh

# Logs
logs:
	@docker compose logs -f

logs-backend:
	@docker compose logs -f backend

logs-frontend:
	@docker compose logs -f frontend

# Reset
reset:
	@chmod +x scripts/reset.sh
	@./scripts/reset.sh

# Teste API
test-api:
	@chmod +x scripts/test-api.sh
	@./scripts/test-api.sh

# Prisma
prisma-studio:
	@echo "🎨 Abrindo Prisma Studio..."
	@echo "Acesse: http://localhost:5555"
	@docker compose exec backend npx prisma studio

prisma-seed:
	@docker compose exec backend npm run prisma:seed

# Clean
clean:
	@docker compose down -v
	@echo "✅ Containers e volumes removidos"
