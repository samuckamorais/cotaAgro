# Guia de Configuração do WhatsApp - CotaAgro

Este guia explica como configurar o WhatsApp para comunicação com o sistema CotaAgro.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Script de Configuração Rápida](#script-de-configuração-rápida)
3. [Configuração Manual](#configuração-manual)
   - [Opção 1: Twilio](#opção-1-twilio-whatsapp-business-api)
   - [Opção 2: Evolution API](#opção-2-evolution-api-open-source)
4. [Configuração de Webhook](#configuração-de-webhook)
5. [Desenvolvimento Local](#desenvolvimento-local)
6. [Troubleshooting](#troubleshooting)

---

## Visão Geral

O CotaAgro suporta dois providers de WhatsApp:

| Provider | Tipo | Custo | Complexidade | Recomendado para |
|----------|------|-------|--------------|------------------|
| **Twilio** | Comercial | ~$0.005/msg | Baixa | Produção |
| **Evolution API** | Open Source | Grátis | Média | Desenvolvimento/Staging |

### Arquitetura

```
┌─────────────┐         ┌──────────────┐         ┌───────────────┐
│  WhatsApp   │ ──────> │   Provider   │ ──────> │  CotaAgro     │
│  (Usuário)  │ <────── │ (Twilio/Evo) │ <────── │  Backend      │
└─────────────┘         └──────────────┘         └───────────────┘
                              │                          │
                              │ Webhook                  │
                              └──────────────────────────┘
                                 (URL pública)
```

---

## Script de Configuração Rápida

A forma mais rápida de configurar:

```bash
cd scripts
./setup-whatsapp.sh
```

O script interativo irá guiá-lo através de:
1. Escolha do provider (Twilio ou Evolution API)
2. Configuração de credenciais
3. Setup de webhook
4. Configuração de túnel local (se necessário)
5. Teste de conexão

---

## Configuração Manual

### Opção 1: Twilio WhatsApp Business API

#### 1.1. Criar Conta Twilio

1. Acesse: https://www.twilio.com/try-twilio
2. Crie uma conta gratuita (inclui $15 de crédito)
3. Verifique seu email e telefone

#### 1.2. Configurar WhatsApp Sandbox

Para desenvolvimento:

1. Acesse: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Siga as instruções para conectar seu número via WhatsApp
3. Envie a mensagem: `join <seu-codigo>`

Para produção (requer aprovação):

1. Solicite acesso ao WhatsApp Business API
2. Aguarde aprovação do Facebook/Meta (pode levar dias)
3. Configure seu número oficial

#### 1.3. Obter Credenciais

Acesse: https://console.twilio.com/

Copie:
- **Account SID** (exemplo: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
- **Auth Token** (clique em "Show" para revelar)
- **WhatsApp Number** (formato: `+14155238886` para sandbox)

#### 1.4. Configurar Variáveis de Ambiente

Edite `backend/.env`:

```bash
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=seu_auth_token_aqui
TWILIO_WHATSAPP_NUMBER=+14155238886
```

#### 1.5. Configurar Webhook no Twilio

1. Acesse: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
2. Em "When a message comes in":
   ```
   https://sua-api.com/api/webhook/whatsapp
   ```
3. Método: **POST**
4. Clique em **Save**

---

### Opção 2: Evolution API (Open Source)

#### 2.1. Instalar Evolution API

**Opção A - Docker Compose (Recomendado):**

```bash
git clone https://github.com/EvolutionAPI/evolution-api
cd evolution-api
cp .env.example .env
docker-compose up -d
```

Acesse: http://localhost:8080

**Opção B - Docker:**

```bash
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=sua_chave_secreta \
  atendai/evolution-api
```

**Opção C - NPM:**

```bash
npm i -g @evolution/api
evolution-api
```

#### 2.2. Criar Instância

**Via API:**

```bash
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: sua_chave_secreta" \
  -d '{
    "instanceName": "cotaagro",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'
```

**Via Interface (se habilitada):**

1. Acesse: http://localhost:8080/manager
2. Clique em "New Instance"
3. Nome: `cotaagro`
4. Tipo: WhatsApp Baileys

#### 2.3. Conectar ao WhatsApp

1. Acesse: http://localhost:8080/instance/connect/cotaagro
2. Escaneie o QR Code com seu WhatsApp:
   - Abra WhatsApp
   - Menu → Aparelhos conectados
   - Conectar um aparelho
   - Escaneie o código

#### 2.4. Configurar Variáveis de Ambiente

Edite `backend/.env`:

```bash
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua_chave_secreta
EVOLUTION_INSTANCE_NAME=cotaagro
```

#### 2.5. Configurar Webhook na Evolution API

**Via API:**

```bash
curl -X POST http://localhost:8080/webhook/set/cotaagro \
  -H "Content-Type: application/json" \
  -H "apikey: sua_chave_secreta" \
  -d '{
    "url": "https://sua-api.com/api/webhook/whatsapp",
    "webhook_by_events": false,
    "events": ["MESSAGES_UPSERT"]
  }'
```

**Via Interface:**

1. Acesse: http://localhost:8080/manager
2. Selecione sua instância
3. Webhooks → Add Webhook
4. URL: `https://sua-api.com/api/webhook/whatsapp`
5. Evento: `MESSAGES_UPSERT`

---

## Configuração de Webhook

O webhook é a URL que o provider usa para enviar mensagens recebidas ao CotaAgro.

### Produção

Configure um domínio público:

```bash
WEBHOOK_URL=https://api.cotaagro.com.br
```

O endpoint completo será: `https://api.cotaagro.com.br/api/webhook/whatsapp`

### Staging

Use um servidor de staging:

```bash
WEBHOOK_URL=https://staging.cotaagro.com.br
```

---

## Desenvolvimento Local

Para desenvolvimento local, você precisa expor seu `localhost` para a internet.

### Opção 1: ngrok (Recomendado)

**Instalar ngrok:**

```bash
# macOS
brew install ngrok

# Linux
snap install ngrok

# Windows
choco install ngrok
```

**Configurar conta:**

1. Crie conta em: https://ngrok.com/
2. Copie seu authtoken
3. Configure:
   ```bash
   ngrok config add-authtoken SEU_AUTHTOKEN
   ```

**Iniciar túnel:**

```bash
ngrok http 3000
```

Você receberá uma URL pública:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

**Configurar no .env:**

```bash
WEBHOOK_URL=https://abc123.ngrok.io
```

⚠️ **Importante:** A URL do ngrok muda cada vez que você reinicia. Configure novamente o webhook no provider após cada reinício.

### Opção 2: Outros Túneis

**LocalTunnel:**

```bash
npm install -g localtunnel
lt --port 3000
```

**CloudFlare Tunnel:**

```bash
cloudflared tunnel --url http://localhost:3000
```

---

## Configuração Completa de Exemplo

### .env para Produção (Twilio)

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/cotaagro
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
NODE_ENV=production

# WhatsApp - Twilio
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886

# Webhook
WEBHOOK_URL=https://api.cotaagro.com.br

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o

# JWT
JWT_SECRET=sua_secret_key_super_segura
JWT_EXPIRES_IN=7d
```

### .env para Desenvolvimento (Evolution API)

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cotaagro_dev
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
NODE_ENV=development

# WhatsApp - Evolution API
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=my_dev_api_key
EVOLUTION_INSTANCE_NAME=cotaagro

# Webhook (ngrok)
WEBHOOK_URL=https://abc123.ngrok.io

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o

# JWT
JWT_SECRET=dev_secret_not_for_production
JWT_EXPIRES_IN=30d
```

---

## Testando a Configuração

### 1. Verificar Logs do Backend

```bash
cd backend
npm run dev
```

Você deve ver:
```
✓ Database connected
✓ Redis connected
🔌 WhatsApp provider: Twilio (ou Evolution API)
🚀 Server running on port 3000
```

### 2. Enviar Mensagem de Teste

**Para Twilio Sandbox:**

1. Envie mensagem para o número Twilio pelo WhatsApp
2. Texto: `Olá`

**Para Evolution API:**

1. Envie mensagem para o número conectado na instância
2. Texto: `Olá`

### 3. Verificar Recebimento

Nos logs do backend, você deve ver:

```
Processing incoming message { from: '+5564999999999', body: 'Olá' }
OpenAI NLU successful { intent: 'saudacao' }
FSM state updated { entityId: '...', step: 'IDLE' }
Message sent via Twilio { to: '+5564999999999' }
```

### 4. Verificar Resposta

O bot deve responder com a mensagem de boas-vindas:

```
Olá [Nome]! 👋 Bem-vindo ao CotaAgro

💡 Economize até 5 horas por semana em cotações de insumos agrícolas.

Vou te ajudar a encontrar os melhores preços de forma rápida e automática!

🚀 Pronto para sua primeira cotação?
• 1 ou começar - Solicitar cotação
• 2 ou fornecedor - Adicionar fornecedor
• ajuda - Ver como funciona
```

---

## Troubleshooting

### Problema: "WhatsApp provider not configured"

**Causa:** Variáveis de ambiente faltando ou incorretas

**Solução:**

1. Verifique o arquivo `.env`
2. Execute o script de configuração:
   ```bash
   ./scripts/setup-whatsapp.sh
   ```
3. Reinicie o backend

---

### Problema: "Webhook não recebe mensagens"

**Causa:** URL do webhook não está acessível

**Verificar:**

1. A URL está pública? (teste com `curl https://sua-url.com`)
2. O ngrok está rodando?
3. O webhook está configurado corretamente no provider?

**Solução para Twilio:**

1. Acesse: https://console.twilio.com/us1/monitor/logs/debugger
2. Verifique logs de webhook
3. Se aparecer erro 404/500, corrija a URL

**Solução para Evolution API:**

```bash
# Verificar webhook configurado
curl -H "apikey: sua_chave" \
  http://localhost:8080/webhook/find/cotaagro

# Reconfigurar webhook
curl -X POST -H "apikey: sua_chave" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://sua-url.com/api/webhook/whatsapp"}' \
  http://localhost:8080/webhook/set/cotaagro
```

---

### Problema: Evolution API desconecta constantemente

**Causa:** Instância perde conexão com WhatsApp

**Solução:**

1. Reconectar via QR Code:
   ```
   http://localhost:8080/instance/connect/cotaagro
   ```

2. Verificar logs da Evolution API:
   ```bash
   docker logs evolution-api
   ```

3. Se persistir, recriar instância:
   ```bash
   curl -X DELETE -H "apikey: sua_chave" \
     http://localhost:8080/instance/delete/cotaagro
   
   # Criar novamente
   curl -X POST -H "apikey: sua_chave" \
     -H "Content-Type: application/json" \
     -d '{"instanceName": "cotaagro"}' \
     http://localhost:8080/instance/create
   ```

---

### Problema: "OpenAI API error"

**Causa:** API key inválida ou sem créditos

**Solução:**

1. Verificar API key em: https://platform.openai.com/api-keys
2. Verificar saldo em: https://platform.openai.com/usage
3. Atualizar no `.env`:
   ```bash
   OPENAI_API_KEY=sk-proj-nova_key_aqui
   ```

---

### Problema: Mensagens são enviadas mas não aparecem no WhatsApp

**Twilio:**

1. Verifique o número está correto (formato: `+5564999999999`)
2. Confirme que o sandbox está ativo
3. Verifique logs: https://console.twilio.com/us1/monitor/logs/debugger

**Evolution API:**

1. Verifique status da conexão:
   ```bash
   curl -H "apikey: sua_chave" \
     http://localhost:8080/instance/connectionState/cotaagro
   ```
2. Se `state != "open"`, reconecte via QR Code

---

## Comandos Úteis

### Verificar status Evolution API

```bash
# Status da instância
curl -H "apikey: sua_chave" \
  http://localhost:8080/instance/connectionState/cotaagro

# Listar todas as instâncias
curl -H "apikey: sua_chave" \
  http://localhost:8080/instance/fetchInstances

# Logs da instância
curl -H "apikey: sua_chave" \
  http://localhost:8080/instance/logs/cotaagro
```

### Enviar mensagem teste via API

**Twilio:**

```bash
curl -X POST https://api.twilio.com/2010-04-01/Accounts/ACCOUNT_SID/Messages.json \
  --data-urlencode "Body=Teste CotaAgro" \
  --data-urlencode "From=whatsapp:+14155238886" \
  --data-urlencode "To=whatsapp:+5564999999999" \
  -u ACCOUNT_SID:AUTH_TOKEN
```

**Evolution API:**

```bash
curl -X POST http://localhost:8080/message/sendText/cotaagro \
  -H "Content-Type: application/json" \
  -H "apikey: sua_chave" \
  -d '{
    "number": "5564999999999",
    "text": "Teste CotaAgro"
  }'
```

### Resetar conversação de teste

```bash
# No backend
npm run prisma:studio

# Ou via psql
psql cotaagro
DELETE FROM conversation_states WHERE producerId = 'ID_DO_PRODUTOR';
```

---

## Próximos Passos

Após configurar o WhatsApp:

1. **Cadastrar Produtores e Fornecedores:**
   ```bash
   npm run seed
   ```

2. **Testar Fluxo Completo:**
   - Enviar "oi" pelo WhatsApp
   - Criar uma cotação completa
   - Verificar se fornecedores recebem

3. **Monitorar Métricas:**
   - Acesse: http://localhost:3000/api/analytics/overview

4. **Configurar Produção:**
   - Deploy do backend
   - Configurar domínio
   - Atualizar webhook no provider
   - Solicitar aprovação do WhatsApp Business (Twilio)

---

## Recursos Adicionais

- **Twilio Docs:** https://www.twilio.com/docs/whatsapp
- **Evolution API Docs:** https://doc.evolution-api.com/
- **CotaAgro Docs:** [../README.md](../README.md)
- **Análise UX:** [WHATSAPP_UX_ANALYSIS.md](../WHATSAPP_UX_ANALYSIS.md)
- **Product Backlog:** [WHATSAPP_PRODUCT_BACKLOG.md](../WHATSAPP_PRODUCT_BACKLOG.md)

---

**Dúvidas ou problemas?**

Abra uma issue no GitHub ou entre em contato com o time de desenvolvimento.
