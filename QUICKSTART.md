# 🚀 FarmFlow - Guia de Início Rápido

Este guia rápido mostra como subir o projeto em **menos de 5 minutos** e testar o fluxo completo.

---

## Pré-requisitos

✅ Docker instalado
✅ Docker Compose instalado
✅ Node.js 20+ (opcional, para desenvolvimento local)

---

## Passo 1: Clone e Configure

```bash
cd /Users/samuelgm/Workspace/flow/farmflow

# Copiar .env de exemplo
cp .env.example .env
```

Edite o `.env` e configure **apenas o essencial**:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/farmflow
REDIS_URL=redis://redis:6379
JWT_SECRET=meu_secret_jwt_com_pelo_menos_32_caracteres_aqui
WHATSAPP_PROVIDER=twilio
```

> ⚠️ **Atenção**: Como as credenciais do Twilio e OpenAI são opcionais, o sistema irá rodar em **modo mock** (logs no console). Para testar de verdade, configure suas credenciais.

---

## Passo 2: Subir o Projeto

```bash
docker-compose up -d
```

Aguarde ~30 segundos para os containers iniciarem.

---

## Passo 3: Rodar Migrations e Seed

```bash
# Criar tabelas
docker-compose exec backend npx prisma migrate dev --name init

# Popular com dados de exemplo
docker-compose exec backend npm run prisma:seed
```

Você verá:
```
✅ Database seeded successfully!
📊 Dados criados:
  - 2 Produtores
  - 3 Fornecedores
  - 1 Vínculo produtor-fornecedor

📱 Teste com WhatsApp:
  - Produtor 1: +5564999999999 (João Silva)
  - Produtor 2: +5564988888888 (Maria Santos)
```

---

## Passo 4: Verificar Logs

```bash
docker-compose logs -f backend
```

Você deve ver:
```
✅ Database connected
✅ Redis connected
✅ Bull queues configured
✅ Consolidate quote job scheduled (every 5 minutes)
✅ Expire quotes job scheduled (every 10 minutes)
🚀 Server running on port 3000
```

---

## Passo 5: Testar a API

### Health Check

```bash
curl http://localhost:3000/health
```

Resposta:
```json
{
  "status": "ok",
  "timestamp": "2024-03-30T..."
}
```

### Simular Webhook do WhatsApp

```bash
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "From": "whatsapp:+5564999999999",
    "Body": "nova cotação"
  }'
```

Verifique os logs do backend - você verá a FSM em ação! 🎉

---

## Passo 6: Testar Fluxo Completo (Mock)

1. **Envie "nova cotação"** (payload acima)
2. **Veja nos logs**: Estado alterado para `AWAITING_PRODUCT`
3. **Envie produto**:
   ```bash
   curl -X POST http://localhost:3000/api/whatsapp/webhook \
     -H "Content-Type: application/json" \
     -d '{"From": "whatsapp:+5564999999999", "Body": "soja"}'
   ```
4. **Continue o fluxo** enviando:
   - Quantidade: `100 sacos`
   - Região: `Goiânia`
   - Prazo: `em 5 dias`
   - Observações: `não`
   - Escopo: `3` (todos)
   - Confirmação: `sim`

Os logs mostrarão **cada transição da FSM** em tempo real! 🚀

---

## Passo 7: Acessar Frontend

Abra o navegador:

```
http://localhost:5173
```

Você verá uma página de boas-vindas com status do sistema.

---

## Próximos Passos

### Configurar WhatsApp Real

1. **Twilio**:
   - Crie conta em [twilio.com](https://www.twilio.com/)
   - Configure WhatsApp Sandbox
   - Adicione credenciais no `.env`
   - Configure webhook: `https://seu-dominio.ngrok.io/api/whatsapp/webhook`

2. **Evolution API** (alternativa open source):
   - Suba instância Evolution API
   - Configure no `.env`: `WHATSAPP_PROVIDER=evolution`

### Configurar OpenAI (NLU)

```env
OPENAI_API_KEY=sk-proj-seu_key_aqui
```

Com OpenAI configurada, o bot entenderá mensagens livres como:
_"quero cotar 100 sacos de soja para Goiânia em 5 dias"_

---

## Comandos Úteis

```bash
# Ver logs em tempo real
docker-compose logs -f backend

# Parar containers
docker-compose down

# Parar e remover volumes (reset completo)
docker-compose down -v

# Rebuild (após mudanças no código)
docker-compose up -d --build

# Acessar shell do container
docker-compose exec backend sh

# Rodar testes
docker-compose exec backend npm test

# Prisma Studio (GUI do banco)
docker-compose exec backend npx prisma studio
```

---

## Troubleshooting

### Erro: "Port 5432 already in use"

Você já tem PostgreSQL rodando localmente. Pare-o ou mude a porta no `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"  # Muda porta externa
```

### Erro: "Cannot connect to database"

Aguarde mais tempo - o Postgres demora ~10s para inicializar. Verifique com:

```bash
docker-compose logs postgres
```

### Webhook não recebe mensagens

Se estiver testando localmente com Twilio/Evolution API:

1. Use **ngrok** para expor localhost:
   ```bash
   ngrok http 3000
   ```
2. Configure a URL do ngrok no webhook do provider
3. Atualize `WEBHOOK_URL` no `.env`

---

## 🎉 Pronto!

Você agora tem o **FarmFlow** rodando localmente. O sistema está pronto para:

✅ Receber mensagens via WhatsApp
✅ Processar com FSM
✅ Disparar cotações assincronamente
✅ Consolidar propostas
✅ Gerenciar estado de conversação

Divirta-se explorando! 🌾
