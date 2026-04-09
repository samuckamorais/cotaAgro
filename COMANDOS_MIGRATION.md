# 🚀 Comandos para Aplicar Migration Multi-Tenant

## ⚠️ IMPORTANTE: Leia Antes de Executar!

Esta migration adiciona isolamento multi-tenant ao sistema. É uma mudança **BREAKING** que:
- Adiciona coluna `tenantId` em 10 tabelas
- Cria constraints únicas por tenant
- **REQUER backup completo** do banco antes de aplicar

---

## 📋 Checklist Pré-Migration

- [ ] ✅ Backup completo do banco de dados
- [ ] ✅ Banco de dados PostgreSQL rodando
- [ ] ✅ Código atualizado (pull do git)
- [ ] ✅ Dependencies instaladas (`npm install`)
- [ ] ✅ `.env` configurado com DATABASE_URL correto

---

## 🔧 Passo 1: Backup do Banco

```bash
# PostgreSQL local
pg_dump -U postgres farmflow > backup_pre_tenant_$(date +%Y%m%d_%H%M%S).sql

# Docker PostgreSQL
docker exec -t postgres_container pg_dump -U postgres farmflow > backup_pre_tenant_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🗄️ Passo 2: Iniciar o Banco de Dados

### Opção A: Docker Compose
```bash
cd /Users/samuelgm/Workspace/farmFlow
docker-compose up -d postgres
```

### Opção B: PostgreSQL Local (Homebrew)
```bash
brew services start postgresql@14
```

### Verificar se está rodando:
```bash
psql -U postgres -d farmflow -c "SELECT version();"
```

---

## 📦 Passo 3: Aplicar a Migration

```bash
cd /Users/samuelgm/Workspace/farmFlow/backend

# Formatar o schema
npx prisma format

# Gerar e aplicar migration
npx prisma migrate dev --name add_tenant_isolation

# Output esperado:
# ✔ Generated Prisma Client
# ✔ Applied migration: 20260407_add_tenant_isolation
```

### Se houver erro "database not empty":
```bash
# CUIDADO: Isso vai APAGAR todos os dados!
npx prisma migrate reset
npx prisma migrate dev --name add_tenant_isolation
```

---

## 🌱 Passo 4: Executar o Seed

```bash
cd /Users/samuelgm/Workspace/farmFlow/backend
npx prisma db seed
```

### Output esperado:
```
🌱 Seeding database com suporte Multi-Tenant...

📦 Criando tenants...
✅ Tenant 1: Fazenda Modelo (fazenda-modelo)
✅ Tenant 2: Cooperativa ABC (cooperativa-abc)

👤 Criando usuários...
✅ Admin Tenant 1: admin@fazendamodelo.com
✅ Admin Tenant 2: admin@cooperativaabc.com

🌐 Criando fornecedores da rede...
✅ Fornecedor Rede 1: Agro Insumos Nacional
✅ Fornecedor Rede 2: Sementes do Brasil

🏢 Criando dados para TENANT 1 (Fazenda Modelo)...
✅ Produtor 1: João Silva
✅ Produtor 2: Maria Santos
✅ Fornecedor próprio: Fornecedor Local Fazenda

🏢 Criando dados para TENANT 2 (Cooperativa ABC)...
✅ Produtor 1: Carlos Oliveira
✅ Fornecedor próprio: Agro Cooperativa Local

✅ Database seeded com sucesso!
```

---

## ✅ Passo 5: Verificar a Migration

### 5.1 Verificar tabelas no Prisma Studio
```bash
npx prisma studio
```

**Verifique**:
- ✅ Tabela `tenants` existe e tem 2 registros
- ✅ Tabela `producers` tem coluna `tenantId`
- ✅ Tabela `suppliers` tem coluna `tenantId` (nullable)
- ✅ Tabela `quotes` tem coluna `tenantId`
- ✅ Todos os registros têm `tenantId` preenchido

### 5.2 Verificar constraints via SQL
```bash
psql -U postgres -d farmflow
```

```sql
-- Verificar constraint de unique por tenant em Producer
SELECT conname, contype 
FROM pg_constraint 
WHERE conname LIKE '%Producer%';

-- Verificar se todos os producers têm tenantId
SELECT COUNT(*) as total, 
       COUNT(tenantId) as com_tenant 
FROM producers;

-- Verificar tenants criados
SELECT * FROM tenants;
```

---

## 🧪 Passo 6: Testar o Sistema

### 6.1 Iniciar o backend
```bash
cd /Users/samuelgm/Workspace/farmFlow/backend
npm run dev
```

### 6.2 Iniciar o frontend
```bash
cd /Users/samuelgm/Workspace/farmFlow/frontend
npm run dev
```

### 6.3 Testar Login - Tenant 1
```
URL: http://localhost:5173
Email: admin@fazendamodelo.com
Senha: Farmflow0147*
```

**Verificar**:
- ✅ Dashboard carrega
- ✅ Lista de produtores mostra apenas 2 (João Silva e Maria Santos)
- ✅ Fornecedores incluem os da rede + fornecedor local

### 6.4 Testar Login - Tenant 2
```
URL: http://localhost:5173
Email: admin@cooperativaabc.com
Senha: Farmflow0147*
```

**Verificar**:
- ✅ Dashboard carrega
- ✅ Lista de produtores mostra apenas 1 (Carlos Oliveira)
- ✅ Fornecedores incluem os da rede + fornecedor local

---

## 🐛 Troubleshooting

### Erro: "Cannot reach database server"
```bash
# Verificar se PostgreSQL está rodando
brew services list | grep postgresql
# ou
docker ps | grep postgres

# Iniciar se necessário
brew services start postgresql@14
# ou
docker-compose up -d postgres
```

### Erro: "Foreign key constraint fails"
```bash
# Fazer reset completo (APAGA TODOS OS DADOS!)
cd backend
npx prisma migrate reset
npx prisma migrate dev --name add_tenant_isolation
npx prisma db seed
```

### Erro: "Unique constraint violation"
```bash
# Limpar banco e recriar
psql -U postgres -d farmflow -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
cd backend
npx prisma migrate dev --name add_tenant_isolation
npx prisma db seed
```

### Erro: "User already exists" no seed
```bash
# Deletar dados antigos
psql -U postgres -d farmflow -c "TRUNCATE users CASCADE;"
npx prisma db seed
```

---

## 🔄 Rollback (Se necessário)

### Se a migration falhar ou houver problemas:

```bash
# 1. Parar o servidor
# CTRL+C no terminal do backend

# 2. Restaurar backup
psql -U postgres -d farmflow < backup_pre_tenant_TIMESTAMP.sql

# 3. Reverter código (se já deu commit)
git revert HEAD
git push origin main

# 4. Ou desfazer localmente (se não deu commit)
git reset --hard HEAD~1
```

---

## 📊 Verificação de Sucesso

Execute este checklist após aplicar tudo:

- [ ] ✅ Migration aplicada sem erros
- [ ] ✅ Seed executado com sucesso
- [ ] ✅ 2 tenants criados no banco
- [ ] ✅ Todos os produtores têm tenantId
- [ ] ✅ Backend inicia sem erros
- [ ] ✅ Frontend inicia sem erros
- [ ] ✅ Login Tenant 1 funciona
- [ ] ✅ Login Tenant 2 funciona
- [ ] ✅ Cada tenant vê apenas seus dados
- [ ] ✅ Fornecedores da rede visíveis por ambos

---

## 🎯 Próximos Passos

Após verificar que tudo funciona:

1. **Commit da migration**:
```bash
git add backend/prisma/migrations/
git commit -m "feat: adiciona isolamento multi-tenant completo"
git push origin main
```

2. **Atualizar documentação**:
- Marcar [IMPLEMENTACAO_MULTI_TENANT.md](./docs/IMPLEMENTACAO_MULTI_TENANT.md) como aplicado
- Atualizar README.md com informações sobre tenants

3. **Criar testes automatizados**:
- Testes de isolamento entre tenants
- Testes de acesso a fornecedores da rede

4. **Deploy para produção** (quando pronto):
- Fazer backup completo
- Aplicar migration em produção
- Executar seed de produção (com dados reais, não de teste)

---

## ❓ Dúvidas ou Problemas?

Se encontrar qualquer problema:

1. Verificar logs do backend no terminal
2. Verificar logs do PostgreSQL
3. Consultar [MULTI_TENANT_ANALYSIS.md](./docs/MULTI_TENANT_ANALYSIS.md) para contexto
4. Consultar [IMPLEMENTACAO_MULTI_TENANT.md](./docs/IMPLEMENTACAO_MULTI_TENANT.md) para detalhes

---

**Data**: 2026-04-07  
**Autor**: Implementação Multi-Tenant FarmFlow
