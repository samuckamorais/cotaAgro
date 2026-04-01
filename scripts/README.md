# Scripts de Deploy e Manutenção - CotaAgro

Scripts para facilitar o deploy e manutenção da aplicação na VPS.

## 📋 Scripts Disponíveis

### 1. `vps-install.sh` - Instalação Inicial
Instala todas as dependências necessárias na VPS.

**Uso na VPS:**
```bash
bash scripts/vps-install.sh
```

---

### 2. `vps-deploy.sh` - Deploy Completo ⭐
Script principal de deploy. Execute após fazer push das alterações.

**Uso na VPS:**
```bash
bash scripts/vps-deploy.sh
```

**O que faz:**
1. ✅ Verifica e cria `.env` se não existir
2. ✅ Copia `.env` para `backend/.env`
3. ✅ Detecta IP público e atualiza `WEBHOOK_URL`
4. ✅ Faz `git pull` do repositório
5. ✅ Build e inicia containers Docker
6. ✅ Executa migrations do Prisma
7. ✅ Gera Prisma Client atualizado
8. ✅ Executa seed (cria usuário Admin)
9. ✅ Reinicia backend
10. ✅ Faz health check

**Credenciais criadas:**
- Email: `admin@cotaagro.com`
- Senha: `Farmflow0147*`

---

### 3. `vps-fix-db.sh` - Correção Rápida 🔧
Para corrigir problemas de login ou banco de dados.

**Uso na VPS:**
```bash
bash scripts/vps-fix-db.sh
```

**Use quando:**
- ❌ Não consegue fazer login
- ❌ Erro "User not found"
- ❌ Prisma Client desatualizado

---

## 🚀 Como Usar

### Primeira Instalação

```bash
# 1. Conectar na VPS
ssh usuario@187.77.255.92

# 2. Clonar repositório
git clone https://github.com/samuckamorais/cotaAgro.git
cd cotaAgro

# 3. Instalar dependências (opcional)
bash scripts/vps-install.sh

# 4. Deploy
bash scripts/vps-deploy.sh
```

### Atualizações

```bash
# Na VPS, no diretório do projeto
bash scripts/vps-deploy.sh
```

### Correção de Login

```bash
# Na VPS
bash scripts/vps-fix-db.sh
```

---

## 🔧 Comandos Docker Úteis

```bash
# Ver status
docker compose ps

# Logs
docker compose logs -f
docker compose logs -f backend

# Reiniciar
docker compose restart
docker compose restart backend

# Parar/Iniciar
docker compose down
docker compose up -d
```

---

## 🔐 Credenciais Padrão

- **Email:** admin@cotaagro.com
- **Senha:** Farmflow0147*

---

## 🌐 URLs (substitua SEU_IP)

- Frontend: `http://SEU_IP:5173`
- Backend: `http://SEU_IP:3000`
- Health: `http://SEU_IP:3000/health`

---

## 🐛 Troubleshooting

### Não consigo fazer login
```bash
bash scripts/vps-fix-db.sh
```

### Container não inicia
```bash
docker compose logs backend
docker compose down
docker compose up -d
```

### Banco não responde
```bash
docker compose restart postgres
sleep 10
docker compose exec postgres pg_isready -U postgres
```
