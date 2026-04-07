# Proposta: Interface Admin para Configuração WhatsApp (SaaS Multi-Tenant)

**Data:** 07/04/2026  
**Contexto:** CotaAgro como SaaS multi-tenant  
**Prioridade:** 🔥 ALTA (P1 - Essencial para modelo SaaS)

---

## 🎯 Justificativa

Como CotaAgro será um **SaaS multi-tenant**, cada cliente precisa configurar seu próprio WhatsApp:

### ❌ **Problemas sem interface web:**
- Cliente depende do suporte técnico para configurar
- Cada novo cliente = ticket de suporte + deploy
- Mudança de provider = intervenção manual
- Troubleshooting lento (cliente não vê logs)
- Onboarding complexo e demorado

### ✅ **Benefícios com interface web:**
- **Self-service:** Cliente configura sozinho em 5 minutos
- **Escalabilidade:** 100 clientes = 0 tickets de config
- **Autonomia:** Cliente troca provider quando quiser
- **Suporte proativo:** Admin vê status de todos clientes
- **Redução de churn:** Menos fricção = mais retenção
- **Receita:** Pode cobrar por provider premium (Twilio)

---

## 📊 Impacto no Negócio

### Métricas Esperadas:
- **Redução de tickets de suporte:** -80% (config WhatsApp)
- **Tempo de onboarding:** 2 horas → 15 minutos
- **Time-to-value:** Cliente usa em < 1 dia
- **Customer satisfaction:** +30% (autonomia)
- **Custo de suporte:** -$500/mês por 100 clientes

### ROI:
- **Esforço:** 2-3 semanas dev (13-21 pontos)
- **Economia:** $6.000/ano em suporte
- **Retorno:** 3-6 meses

---

## 🏗️ Arquitetura Proposta

### Multi-Tenant Strategy

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Cliente A  │     │  Cliente B  │     │  Cliente C  │
│  (Twilio)   │     │ (Evolution) │     │  (Twilio)   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                  ┌────────▼────────┐
                  │   CotaAgro      │
                  │   Backend       │
                  │  (Multi-tenant) │
                  └────────┬────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
   ┌───▼───┐         ┌────▼────┐        ┌────▼────┐
   │Twilio │         │Evolution│        │  Meta   │
   │  API  │         │   API   │        │  (2026?)│
   └───────┘         └─────────┘        └─────────┘
```

### Database Schema

```prisma
// Tenant (já existe ou criar)
model Tenant {
  id                String   @id @default(uuid())
  name              String   // "Fazenda ABC"
  slug              String   @unique // "fazenda-abc"
  active            Boolean  @default(true)
  createdAt         DateTime @default(now())
  
  whatsappConfig    WhatsAppConfig?
  users             User[]
  producers         Producer[]
  suppliers         Supplier[]
}

// Configuração WhatsApp por Tenant
model WhatsAppConfig {
  id                String   @id @default(uuid())
  tenant            Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  tenantId          String   @unique
  
  // Provider
  provider          String   // "twilio" | "evolution" | "meta"
  
  // Credenciais (CRIPTOGRAFADAS!)
  credentials       Json     // { accountSid, authToken, ... }
  
  // Status
  isConnected       Boolean  @default(false)
  lastHealthCheck   DateTime?
  connectionError   String?
  
  // Webhook
  webhookUrl        String?
  webhookSecret     String?  // Para validar webhooks
  
  // Estatísticas (cache)
  messagesSentToday      Int @default(0)
  messagesReceivedToday  Int @default(0)
  lastMessageAt          DateTime?
  
  // Auditoria
  configuredBy      String?  // userId
  configuredAt      DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([tenantId])
  @@index([provider])
  @@map("whatsapp_configs")
}

// Log de configurações (auditoria)
model WhatsAppConfigLog {
  id          String   @id @default(uuid())
  tenantId    String
  action      String   // "created" | "updated" | "deleted" | "reconnected"
  changes     Json     // O que mudou
  performedBy String   // userId
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
  
  @@index([tenantId])
  @@index([createdAt])
  @@map("whatsapp_config_logs")
}
```

---

## 🎨 Interface UI/UX

### Wireframe: Página de Configuração

```
┌───────────────────────────────────────────────────────────────┐
│  CotaAgro Dashboard                          [User ▾] [Sair]  │
├───────────────────────────────────────────────────────────────┤
│  Sidebar:                    │  WhatsApp Configuration         │
│  • Dashboard                 │                                 │
│  • Produtores                │  ┌─────────────────────────┐   │
│  • Fornecedores              │  │  Status: 🟢 Conectado   │   │
│  • Cotações                  │  │  Provider: Evolution API │   │
│  ★ Configurações             │  │  Última msg: há 2 min   │   │
│    └─ WhatsApp ◄─────────────┼──┤  [Testar] [Logs] [QR]   │   │
│    └─ Usuários               │  └─────────────────────────┘   │
│    └─ Notificações           │                                 │
│                              │  📊 Estatísticas (hoje)         │
│                              │  • Enviadas: 143                │
│                              │  • Recebidas: 98                │
│                              │  • Taxa erro: 0%                │
│                              │                                 │
│                              │  ⚙️ Configuração                │
│                              │                                 │
│                              │  Provider:                      │
│                              │  ○ Twilio                       │
│                              │  ● Evolution API (Gratuito)     │
│                              │  ○ Meta (Em breve)              │
│                              │                                 │
│                              │  ┌─ Evolution API Settings ─┐  │
│                              │  │ URL: [localhost:8080]     │  │
│                              │  │ Key: [••••••••••••••]     │  │
│                              │  │ Nome: [cotaagro]          │  │
│                              │  │ [🔗 Conectar QR Code]     │  │
│                              │  └───────────────────────────┘  │
│                              │                                 │
│                              │  [Salvar] [Testar Agora]        │
└───────────────────────────────────────────────────────────────┘
```

### Componentes React

**1. Status Card (tempo real)**
```tsx
<WhatsAppStatusCard
  status="connected"
  provider="evolution"
  lastMessage={new Date()}
  stats={{ sent: 143, received: 98, errorRate: 0 }}
/>
```

**2. Provider Selector**
```tsx
<ProviderSelector
  value={provider}
  onChange={setProvider}
  options={[
    { value: 'evolution', label: 'Evolution API', free: true },
    { value: 'twilio', label: 'Twilio', premium: true },
  ]}
/>
```

**3. QR Code Modal**
```tsx
<QRCodeModal
  show={showQR}
  qrCode={qrCodeData}
  onSuccess={() => toast.success('WhatsApp conectado!')}
/>
```

**4. Connection Test**
```tsx
<ConnectionTest
  onTest={async () => {
    const result = await testConnection()
    return result.success
  }}
/>
```

**5. Logs Viewer**
```tsx
<WhatsAppLogs
  tenantId={tenantId}
  limit={100}
  filter={['sent', 'received', 'error']}
  realtime
/>
```

---

## 🔧 Backend API Endpoints

### REST API

```typescript
// Obter configuração atual
GET /api/admin/whatsapp/config
Response: {
  provider: "evolution",
  isConnected: true,
  lastHealthCheck: "2026-04-07T10:00:00Z",
  stats: { sent: 143, received: 98 }
}

// Atualizar configuração
PUT /api/admin/whatsapp/config
Body: {
  provider: "evolution",
  credentials: {
    apiUrl: "http://localhost:8080",
    apiKey: "abc123",
    instanceName: "cotaagro"
  }
}

// Testar conexão
POST /api/admin/whatsapp/test
Response: {
  success: true,
  message: "Conectado com sucesso!",
  details: { state: "open", phone: "+5564999999999" }
}

// Obter QR Code (Evolution API)
GET /api/admin/whatsapp/qrcode
Response: {
  qrCode: "data:image/png;base64,...",
  expiresIn: 60 // segundos
}

// Reconectar
POST /api/admin/whatsapp/reconnect

// Logs (últimas 100 mensagens)
GET /api/admin/whatsapp/logs?limit=100&filter=error
Response: {
  logs: [
    {
      id: "...",
      type: "sent",
      from: "+5564999999999",
      to: "+5564888888888",
      body: "Olá!",
      status: "delivered",
      createdAt: "..."
    }
  ]
}

// Estatísticas
GET /api/admin/whatsapp/stats?period=24h
Response: {
  sent: 143,
  received: 98,
  delivered: 140,
  failed: 3,
  errorRate: 0.02,
  avgResponseTime: 1.2
}
```

---

## 🔐 Segurança

### 1. Criptografia de Credenciais

```typescript
import crypto from 'crypto'

class CredentialsEncryptor {
  private algorithm = 'aes-256-gcm'
  private key = crypto.scryptSync(env.ENCRYPTION_KEY, 'salt', 32)

  encrypt(credentials: object): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)
    
    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    })
  }

  decrypt(encryptedData: string): object {
    const { encrypted, iv, authTag } = JSON.parse(encryptedData)
    
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    )
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'))
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return JSON.parse(decrypted)
  }
}
```

### 2. Permissões RBAC

```typescript
// Apenas admins podem configurar WhatsApp
@Auth()
@RequirePermission('whatsapp:config')
async updateConfig(req: Request) {
  // ...
}

// Log de auditoria
await auditLog.create({
  action: 'whatsapp_config_updated',
  userId: req.user.id,
  tenantId: req.tenant.id,
  ipAddress: req.ip,
  changes: { provider: 'evolution' }
})
```

### 3. Rate Limiting

```typescript
// Limitar testes de conexão
@RateLimit({ max: 10, window: '1m' })
async testConnection() {
  // ...
}
```

---

## 📱 Features Essenciais

### Fase 1 (MVP) - 2 semanas
- ✅ CRUD de configuração WhatsApp
- ✅ Suporte a Twilio e Evolution API
- ✅ Teste de conexão
- ✅ Status em tempo real
- ✅ QR Code (Evolution API)
- ✅ Criptografia de credenciais
- ✅ Logs de auditoria

### Fase 2 (Melhorias) - 1 semana
- ✅ Dashboard de estatísticas
- ✅ Logs de mensagens (últimas 100)
- ✅ Health check automático (5 min)
- ✅ Notificação quando desconectar
- ✅ Reconexão automática

### Fase 3 (Avançado) - 1 semana
- ✅ Multi-instância (cliente com múltiplos WhatsApps)
- ✅ Webhooks customizados por tenant
- ✅ Análise de performance (latência, erros)
- ✅ Exportar logs (CSV/JSON)
- ✅ Suporte a Meta WhatsApp Business API

---

## 🧪 Testes

### Unit Tests
```typescript
describe('WhatsAppConfigService', () => {
  it('deve criptografar credenciais', async () => {
    const creds = { apiKey: 'secret123' }
    const encrypted = await service.encrypt(creds)
    expect(encrypted).not.toContain('secret123')
  })

  it('deve descriptografar corretamente', async () => {
    const creds = { apiKey: 'secret123' }
    const encrypted = await service.encrypt(creds)
    const decrypted = await service.decrypt(encrypted)
    expect(decrypted.apiKey).toBe('secret123')
  })

  it('deve testar conexão Twilio', async () => {
    const result = await service.testTwilio(config)
    expect(result.success).toBe(true)
  })

  it('deve testar conexão Evolution', async () => {
    const result = await service.testEvolution(config)
    expect(result.success).toBe(true)
  })
})
```

### E2E Tests
```typescript
describe('WhatsApp Config Flow', () => {
  it('deve configurar Evolution API completo', async () => {
    // 1. Login como admin
    await login('admin@tenant.com')
    
    // 2. Navegar para config WhatsApp
    await page.goto('/admin/whatsapp')
    
    // 3. Selecionar provider
    await page.click('[data-testid="provider-evolution"]')
    
    // 4. Preencher credenciais
    await page.fill('[name="apiUrl"]', 'http://localhost:8080')
    await page.fill('[name="apiKey"]', 'test-key')
    
    // 5. Salvar
    await page.click('[data-testid="save-config"]')
    
    // 6. Verificar sucesso
    await expect(page.locator('.toast-success')).toBeVisible()
    await expect(page.locator('.status-connected')).toBeVisible()
  })
})
```

---

## 📈 Roadmap de Implementação

### Sprint 1 (Semana 1-2): Backend + MVP UI
```
Dia 1-2: Database schema + migrations
Dia 3-4: API endpoints (CRUD + test)
Dia 5-6: Criptografia + segurança
Dia 7-8: UI básica (config form)
Dia 9-10: Integração + testes
```

### Sprint 2 (Semana 3): Polish + Features
```
Dia 1-2: QR Code modal (Evolution)
Dia 3-4: Status dashboard + stats
Dia 5-6: Logs viewer
Dia 7-8: Health check + notificações
Dia 9-10: Testes E2E + docs
```

### Sprint 3 (Semana 4): Opcional - Avançado
```
Dia 1-3: Multi-instância
Dia 4-6: Analytics avançado
Dia 7-10: Suporte Meta WhatsApp
```

---

## 💰 Monetização

### Modelo de Pricing

```
┌─────────────────────────────────────────────────┐
│  Plano FREE                                     │
│  • Evolution API (open source)                  │
│  • 1 instância WhatsApp                         │
│  • 1.000 mensagens/mês                          │
│  • Suporte básico                               │
│  R$ 0/mês                                       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Plano PRO                                      │
│  • Twilio ou Evolution API                      │
│  • 3 instâncias WhatsApp                        │
│  • 10.000 mensagens/mês                         │
│  • Analytics avançado                           │
│  • Suporte prioritário                          │
│  R$ 199/mês                                     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Plano ENTERPRISE                               │
│  • Todos providers (Twilio + Meta)              │
│  • Instâncias ilimitadas                        │
│  • Mensagens ilimitadas                         │
│  • White-label                                  │
│  • SLA 99.9%                                    │
│  • Suporte dedicado                             │
│  R$ 999/mês                                     │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Critérios de Sucesso

### KPIs
- ✅ **90%** dos clientes configuram sozinhos
- ✅ **< 5 min** tempo médio de configuração
- ✅ **< 1%** taxa de erro na configuração
- ✅ **95%** uptime das conexões WhatsApp
- ✅ **-80%** tickets de suporte relacionados
- ✅ **+30%** NPS (facilidade de uso)

### Acceptance Criteria
- [ ] Cliente pode escolher provider (Twilio/Evolution)
- [ ] Cliente pode configurar credenciais via UI
- [ ] Cliente vê status em tempo real (conectado/desconectado)
- [ ] Cliente pode testar conexão com 1 clique
- [ ] Cliente vê QR Code para Evolution API
- [ ] Cliente vê estatísticas de uso (mensagens)
- [ ] Cliente vê logs das últimas mensagens
- [ ] Admin pode ver config de todos tenants
- [ ] Sistema notifica se conexão cair
- [ ] Credenciais são criptografadas no DB
- [ ] Auditoria completa de mudanças

---

## 🚀 Próximos Passos

1. **Aprovar proposta** → Validar com time e stakeholders
2. **Refinar backlog** → Criar User Stories detalhadas
3. **Design UI** → Protótipo no Figma
4. **Sprint Planning** → Alocar 2-3 semanas
5. **Desenvolvimento** → Backend → Frontend → Testes
6. **Beta testing** → 5-10 clientes piloto
7. **Launch** → Rollout gradual (20% → 50% → 100%)
8. **Monitor** → KPIs e feedback

---

## 📚 User Stories (Resumo)

```
Epic: WhatsApp Self-Service Configuration

US 1 (5pts): Como admin, quero configurar WhatsApp via UI
US 2 (3pts): Como admin, quero testar conexão WhatsApp
US 3 (5pts): Como admin, quero ver QR Code para Evolution API
US 4 (3pts): Como admin, quero ver status em tempo real
US 5 (5pts): Como admin, quero ver logs de mensagens
US 6 (3pts): Como admin, quero receber alerta se desconectar
US 7 (8pts): Como superadmin, quero ver config de todos tenants

Total: 32 pontos (2-3 semanas com 2 devs)
```

---

**Prepared by:** Claude Opus 4.6  
**Status:** 📋 Proposta aprovada → Ready for development  
**Priority:** 🔥 P1 - Essencial para SaaS
