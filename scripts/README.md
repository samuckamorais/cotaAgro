# 🚀 Scripts de Automação - CotaAgro

Scripts para facilitar o gerenciamento da aplicação.

---

## 📋 Scripts Disponíveis

### 🎬 Setup e Controle

#### `setup.sh` - Setup Completo
**Uso**: `./scripts/setup.sh`

Configura e inicia a aplicação do zero:
- ✅ Verifica Docker
- ✅ Para containers existentes
- ✅ Cria arquivo .env (se não existir)
- ✅ Sobe containers
- ✅ Executa migrations
- ✅ Popula banco de dados
- ✅ Verifica saúde da API

**Use este script na primeira vez!**

#### `start.sh` - Iniciar
**Uso**: `./scripts/start.sh`

Inicia os containers (assume que já foram configurados).

#### `stop.sh` - Parar
**Uso**: `./scripts/stop.sh`

Para os containers sem remover dados.

#### `restart.sh` - Reiniciar
**Uso**: `./scripts/restart.sh`

Reinicia os containers.

#### `reset.sh` - Reset Completo
**Uso**: `./scripts/reset.sh`

⚠️ **CUIDADO**: Remove containers e volumes. **APAGA TODOS OS DADOS!**

---

### 📊 Logs

#### `logs.sh` - Ver Logs
**Uso**:
```bash
# Todos os serviços
./scripts/logs.sh

# Apenas backend
./scripts/logs.sh backend

# Apenas frontend
./scripts/logs.sh frontend
```

Mostra logs dos containers em tempo real.

---

### 🗄️ Banco de Dados

#### `prisma.sh` - Comandos Prisma
**Uso**: `./scripts/prisma.sh <comando>`

**Comandos disponíveis**:
- `studio` - Abre Prisma Studio (GUI do banco em http://localhost:5555)
- `migrate` - Executa migrations
- `seed` - Popula banco com dados de exemplo
- `generate` - Gera Prisma Client
- `reset` - Reset completo do banco ⚠️

**Exemplos**:
```bash
# Abrir GUI do banco
./scripts/prisma.sh studio

# Popular banco
./scripts/prisma.sh seed
```

---

### 🧪 Testes

#### `test-api.sh` - Testar API
**Uso**: `./scripts/test-api.sh`

Testa os principais endpoints da API.

---

## 🎯 Makefile (Atalhos)

Para facilitar ainda mais, use o **Makefile**:

```bash
# Ver todos os comandos
make help

# Setup completo
make setup

# Iniciar
make start

# Ver logs
make logs
make logs-backend
make logs-frontend

# Prisma Studio
make prisma-studio

# Testar API
make test-api

# Reset completo
make reset
```

---

## 🚀 Fluxo de Trabalho Recomendado

### Primeira Vez (Setup Inicial)
```bash
cd /Users/samuelgm/Workspace/flow/cotaagro

# Opção 1: Com script
./scripts/setup.sh

# Opção 2: Com make
make setup
```

### Desenvolvimento Diário
```bash
# Iniciar
make start

# Ver logs
make logs-backend

# Parar
make stop
```

### Trabalhar com Banco de Dados
```bash
# Ver dados (GUI)
make prisma-studio

# Popular com dados de exemplo
make prisma-seed
```

### Testar
```bash
# Testar API
make test-api

# Ver logs de erros
make logs-backend
```

---

## 📁 Estrutura de Scripts

```
scripts/
├── README.md           # Este arquivo
├── setup.sh           # Setup completo
├── start.sh           # Iniciar containers
├── stop.sh            # Parar containers
├── restart.sh         # Reiniciar containers
├── reset.sh           # Reset completo
├── logs.sh            # Ver logs
├── prisma.sh          # Comandos Prisma
└── test-api.sh        # Testar API
```

---

## ⚙️ Requisitos

- **Docker** instalado e rodando
- **Docker Compose** disponível
- **Make** (opcional, mas recomendado)

---

## 🐛 Troubleshooting

### Script não executa
```bash
# Tornar executável
chmod +x scripts/*.sh
```

### Docker não encontrado
```bash
# Verificar se Docker está rodando
docker --version
docker compose version
```

### Porta já em uso
```bash
# Verificar o que está usando a porta
lsof -i :3000  # Backend
lsof -i :5173  # Frontend
lsof -i :5432  # PostgreSQL
```

### Reset completo
```bash
# Parar tudo e remover volumes
make reset

# Setup novamente
make setup
```

---

## 📖 Documentação Adicional

- **QUICKSTART.md** - Guia rápido
- **README.md** - Documentação principal
- **ARCHITECTURE.md** - Arquitetura técnica

---

**Criado por**: Claude Code
**Data**: 30 de Março de 2024
