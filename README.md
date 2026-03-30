# CotaAgro

**Assistente de Cotações de Insumos Agrícolas via WhatsApp**

Sistema SaaS B2B que automatiza o processo de cotação de insumos agrícolas diretamente pelo WhatsApp. O produtor rural faz um único pedido de cotação; o sistema dispara automaticamente para os fornecedores selecionados, coleta as propostas, consolida e ordena pelo menor valor, entregando ao produtor um resumo único e organizado.

---

## 🚀 Tecnologias

### Backend
- **Node.js 20** + **TypeScript** (strict mode)
- **Express.js** - Framework web
- **Prisma** - ORM
- **PostgreSQL** - Banco de dados
- **Redis** - Cache e filas
- **Bull** - Gerenciamento de jobs assíncronos
- **Twilio/Evolution API** - WhatsApp Business API (abstração)
- **OpenAI GPT-4o** - Interpretação de linguagem natural
- **node-cron** - Jobs periódicos
- **Winston** - Logging estruturado
- **Jest** - Testes unitários

### Frontend *(em desenvolvimento)*
- **React 18** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS v4** - Estilização
- **shadcn/ui** - Componentes
- **React Query** - Estado do servidor
- **Recharts** - Gráficos

### Infra
- **Docker** + **Docker Compose**
- **Migrations** via Prisma Migrate

---

## 📦 Pré-requisitos

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Docker** + **Docker Compose**
- Contas opcionais:
  - Twilio (WhatsApp Business API)
  - OpenAI (GPT-4o para NLU)

---

## 🛠️ Como rodar localmente

### 1. Clone o repositório

```bash
cd /Users/samuelgm/Workspace/flow/cotaagro
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` e preencha as variáveis necessárias:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cotaagro

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=seu_secret_jwt_aqui_32_caracteres_minimo

# WhatsApp Provider (twilio ou evolution)
WHATSAPP_PROVIDER=twilio

# Twilio (se WHATSAPP_PROVIDER=twilio)
TWILIO_ACCOUNT_SID=seu_account_sid
TWILIO_AUTH_TOKEN=seu_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886

# OpenAI (opcional)
OPENAI_API_KEY=sk-proj-seu_api_key_aqui
```

### 3. Subir os containers

```bash
docker-compose up -d
```

Isso iniciará:
- **PostgreSQL** na porta 5432
- **Redis** na porta 6379
- **Backend** na porta 3000 (em modo watch com `tsx`)

### 4. Rodar migrations do Prisma

```bash
docker-compose exec backend npx prisma migrate dev
```

### 5. *(Opcional)* Popular banco de dados

```bash
docker-compose exec backend npx prisma db seed
```

### 6. Verificar logs

```bash
docker-compose logs -f backend
```

### 7. Testar a API

```bash
curl http://localhost:3000/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "timestamp": "2024-03-30T..."
}
```

---

## 📋 Endpoints Principais

### Auth
```
POST /api/auth/otp        # Solicitar código OTP via WhatsApp
POST /api/auth/login      # Validar OTP e obter JWT token
```

### WhatsApp Webhook
```
GET  /api/whatsapp/webhook   # Verificação do webhook
POST /api/whatsapp/webhook   # Receber mensagens do WhatsApp
```

---

## 🤖 Fluxo de Cotação (Bot WhatsApp)

### Fluxo do Produtor

1. **Início**: Produtor envia "nova cotação" ou "1"
2. **Coleta de dados**:
   - Produto (ex: "soja")
   - Quantidade (ex: "100 sacos")
   - Região de entrega (ex: "Goiânia")
   - Prazo desejado (ex: "em 5 dias")
   - Observações (opcional)
   - Escopo de fornecedores (1=Meus | 2=Rede | 3=Todos)
3. **Confirmação**: Sistema exibe resumo e aguarda "sim"
4. **Disparo**: Sistema envia cotação para fornecedores elegíveis
5. **Consolidação**: Após prazo ou 100% respostas, envia resumo ordenado
6. **Escolha**: Produtor escolhe fornecedor pelo número (1, 2, 3...)
7. **Fechamento**: Sistema confirma fechamento

### Fluxo do Fornecedor

1. **Notificação**: Recebe cotação disponível
2. **Decisão**: Responde "1" (enviar proposta) ou "2" (recusar)
3. **Proposta**:
   - Preço total (ex: "15000")
   - Prazo de entrega em dias (ex: "5")
   - Condição de pagamento (ex: "30 dias")
   - Observações (opcional)
4. **Confirmação**: Sistema confirma envio da proposta

---

## 🔧 Configurar Webhook do Twilio

1. Acesse o [Twilio Console](https://console.twilio.com/)
2. Vá em **Messaging** → **Settings** → **WhatsApp Sandbox**
3. Configure o webhook:
   ```
   URL: https://seu-dominio.ngrok.io/api/whatsapp/webhook
   Method: POST
   ```
4. *Para desenvolvimento local*, use [ngrok](https://ngrok.com/):
   ```bash
   ngrok http 3000
   ```

---

## 🔍 Arquitetura do Sistema

```mermaid
graph TD
    A[Produtor WhatsApp] -->|Envia mensagem| B[Webhook]
    B -->|Parseia payload| C[WhatsApp Service]
    C -->|Interpreta NLU| D[OpenAI GPT-4o]
    C -->|Roteia| E[Producer FSM]
    E -->|Cria cotação| F[PostgreSQL]
    E -->|Adiciona job| G[Bull Queue]
    G -->|Processa| H[Dispatch Job]
    H -->|Notifica| I[Fornecedores WhatsApp]
    I -->|Responde| J[Supplier FSM]
    J -->|Cria proposta| F
    K[Consolidate Job Cron] -->|Verifica| F
    K -->|Ordena| L[Propostas]
    K -->|Envia resumo| A
```

---

## 🧪 Testes

### Rodar testes unitários

```bash
docker-compose exec backend npm test
```

### Rodar com coverage

```bash
docker-compose exec backend npm run test:coverage
```

---

## 🗂️ Estrutura de Pastas

```
cotaagro/
├── backend/
│   ├── src/
│   │   ├── config/         # Configurações (env, DB, Redis)
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Logger, validators, error handler
│   │   ├── middleware/     # Auth, rate limit, error
│   │   ├── services/       # OTP, OpenAI
│   │   ├── modules/        # Auth, WhatsApp, Producers, etc.
│   │   ├── flows/          # FSM (Producer, Supplier)
│   │   ├── jobs/           # Bull jobs (dispatch, consolidate)
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── tests/
├── frontend/ (em desenvolvimento)
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🔒 Segurança

- ✅ JWT com tempo de expiração configurável
- ✅ OTP de 6 dígitos via WhatsApp (TTL 10 minutos)
- ✅ Rate limiting por IP (100 req/15min)
- ✅ Rate limiting por telefone (30 msg/min)
- ✅ Helmet para headers de segurança
- ✅ Validação de input com Zod
- ✅ TypeScript strict mode
- ✅ Error handling global

---

## 📈 Roadmap

- [x] Arquitetura base do backend
- [x] Integração WhatsApp (Twilio + Evolution API)
- [x] FSM de produtor e fornecedor
- [x] Jobs assíncronos (dispatch, consolidate)
- [x] Interpretação NLU com OpenAI
- [ ] Endpoints REST completos (CRUD)
- [ ] Frontend React (painel admin)
- [ ] Dashboard com analytics
- [ ] Gestão de fornecedores
- [ ] Gestão de assinaturas
- [ ] Testes E2E
- [ ] CI/CD
- [ ] Deploy em produção

---

## 🤝 Contribuindo

Este é um projeto privado. Para contribuir, entre em contato com a equipe de desenvolvimento.

---

## 📄 Licença

Proprietário - CotaAgro © 2024

---

## 📞 Suporte

Para dúvidas ou suporte:
- Email: suporte@cotaagro.com.br
- WhatsApp: +55 64 99999-9999
