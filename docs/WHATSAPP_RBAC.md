# WhatsApp Config - RBAC (Controle de Acesso Baseado em Funções)

## Visão Geral

O sistema de configuração do WhatsApp está protegido por um sistema RBAC (Role-Based Access Control) que garante que apenas usuários autorizados possam acessar e modificar as configurações.

## Estrutura de Permissões

### Recursos (Resources)

Foi adicionado o novo recurso `WHATSAPP_CONFIG` ao enum `Resource` no Prisma schema:

```prisma
enum Resource {
  DASHBOARD
  QUOTES
  SUPPLIERS
  PRODUCERS
  SUBSCRIPTIONS
  USERS
  WHATSAPP_CONFIG  // ← Novo recurso
}
```

### Ações Permitidas

Cada recurso pode ter 4 tipos de permissões:

| Ação | Descrição | Rotas WhatsApp |
|------|-----------|----------------|
| `canView` | Visualizar configurações | `GET /config`, `GET /stats`, `GET /logs`, `POST /test`, `GET /qrcode` |
| `canCreate` | Criar configurações | *(implícito no canEdit, não utilizado separadamente)* |
| `canEdit` | Editar configurações | `PUT /config`, `POST /reconnect` |
| `canDelete` | Deletar configurações | `DELETE /config` |

## Middlewares RBAC

### 1. `requireWhatsAppConfigAccess(action)`

Middleware específico para rotas de WhatsApp Config. Permite acesso para:
- Usuários com role `ADMIN` (acesso total)
- Usuários com permissão específica `WHATSAPP_CONFIG` e a ação solicitada

**Exemplo de uso:**
```typescript
apiRouter.get(
  '/admin/whatsapp/config',
  authenticate,
  requireWhatsAppConfigAccess('canView'),
  whatsappConfigController.getConfig
);
```

### 2. `requireAdmin`

Middleware que exige role `ADMIN`. Usado para rotas extremamente sensíveis.

### 3. `requirePermission(resource, action)`

Middleware RBAC genérico que pode ser usado para qualquer recurso.

## Aplicação nas Rotas

Todas as rotas de WhatsApp Config estão protegidas:

```typescript
// Visualização (canView)
GET    /api/admin/whatsapp/config      - requireWhatsAppConfigAccess('canView')
GET    /api/admin/whatsapp/stats       - requireWhatsAppConfigAccess('canView')
GET    /api/admin/whatsapp/logs        - requireWhatsAppConfigAccess('canView')
POST   /api/admin/whatsapp/test        - requireWhatsAppConfigAccess('canView')
GET    /api/admin/whatsapp/qrcode      - requireWhatsAppConfigAccess('canView')

// Edição (canEdit)
PUT    /api/admin/whatsapp/config      - requireWhatsAppConfigAccess('canEdit')
POST   /api/admin/whatsapp/reconnect   - requireWhatsAppConfigAccess('canEdit')

// Deleção (canDelete)
DELETE /api/admin/whatsapp/config      - requireWhatsAppConfigAccess('canDelete')
```

## Frontend - Controle de Acesso

### Context de Autenticação

O `AuthContext` já possui a função `hasPermission()`:

```typescript
const { hasPermission } = useAuth();

// Verificar se pode visualizar WhatsApp Config
if (hasPermission('WHATSAPP_CONFIG', 'view')) {
  // Renderizar página
}

// Verificar se pode editar
if (hasPermission('WHATSAPP_CONFIG', 'edit')) {
  // Mostrar botão de salvar
}
```

### Menu Lateral (Sidebar)

O item "WhatsApp" no menu só aparece para usuários com permissão:

```typescript
const menuItems = [
  // ...
  { name: 'WhatsApp', path: '/whatsapp', icon: MessageSquare, resource: 'WHATSAPP_CONFIG' },
];

// No render:
const canView = hasPermission(item.resource, 'view');
if (!canView) return null;
```

## Setup e Migração

### 1. Migração do Banco de Dados

Execute a migração para adicionar o novo recurso `WHATSAPP_CONFIG`:

```bash
cd backend
npx prisma migrate deploy
```

**Migration criada:** `20260407120000_add_whatsapp_config_resource`

```sql
ALTER TYPE "Resource" ADD VALUE IF NOT EXISTS 'WHATSAPP_CONFIG';
```

### 2. Conceder Permissões aos Admins

Execute o script de seed para adicionar permissões automaticamente para todos os usuários ADMIN:

```bash
cd backend
npx tsx scripts/seed-whatsapp-permission.ts
```

**O script:**
- Busca todos os usuários com role `ADMIN`
- Verifica se já possuem permissão `WHATSAPP_CONFIG`
- Cria permissão completa (view, create, edit, delete) se não existir

**Output esperado:**
```
🔧 Adicionando permissão WHATSAPP_CONFIG para admins...

📊 Encontrados 2 administrador(es):

   • João Silva (joao@farmflow.com)
     ✅ Permissão WHATSAPP_CONFIG concedida
   • Maria Santos (maria@farmflow.com)
     ✓ Já possui permissão WHATSAPP_CONFIG

✅ Processo concluído!
```

### 3. Conceder Permissão Manualmente (Opcional)

Para conceder permissão a um usuário específico (não-admin):

```typescript
await prisma.permission.create({
  data: {
    userId: 'user-uuid-here',
    resource: 'WHATSAPP_CONFIG',
    canView: true,
    canCreate: false,
    canEdit: true,
    canDelete: false,
  }
});
```

Ou via Prisma Studio:

```bash
npx prisma studio
```

1. Acesse a tabela `Permission`
2. Crie novo registro:
   - userId: ID do usuário
   - resource: `WHATSAPP_CONFIG`
   - canView: `true`
   - canEdit: `true` (se necessário)
   - canDelete: `false` (recomendado)

## Fluxo de Autorização

```
1. Request → authenticate middleware
   ↓
   Verifica JWT token
   Extrai userId e adiciona ao req
   
2. → requireWhatsAppConfigAccess('canView')
   ↓
   Busca usuário no banco com permissions
   
3. ┌─ É ADMIN?
   │  └─ SIM → ✅ Autorizado (bypass permissões)
   │
   └─ NÃO → Verifica permissão WHATSAPP_CONFIG
      ┌─ Tem permissão canView?
      │  └─ SIM → ✅ Autorizado
      └─ NÃO → ❌ 403 Forbidden

4. → Controller executa a ação
```

## Mensagens de Erro

### Backend

```typescript
// 401 Unauthorized
{
  "success": false,
  "message": "Não autenticado"
}

// 403 Forbidden
{
  "success": false,
  "message": "Sem permissão para configurar WhatsApp. Entre em contato com o administrador."
}
```

### Frontend

Usuários sem permissão:
- Não veem o item "WhatsApp" no menu lateral
- Se tentarem acessar `/whatsapp` diretamente, receberão erro 403

## Auditoria

Todas as ações de configuração do WhatsApp são registradas em `WhatsAppConfigLog`:

```typescript
{
  id: string;
  tenantId: string;
  action: 'created' | 'updated' | 'deleted' | 'reconnected' | 'tested';
  changes: Json;      // O que mudou
  performedBy: string; // userId
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMsg?: string;
  createdAt: DateTime;
}
```

Acesso aos logs:

```bash
GET /api/admin/whatsapp/logs
```

Requer permissão `canView` em `WHATSAPP_CONFIG`.

## Segurança - Boas Práticas

### ✅ O que foi implementado:

1. **Autenticação JWT obrigatória** em todas as rotas
2. **RBAC granular** com 4 níveis de permissão
3. **Role ADMIN tem bypass** para facilitar administração
4. **Middlewares reutilizáveis** para consistência
5. **Auditoria completa** de todas as ações
6. **Credenciais criptografadas** com AES-256-GCM
7. **Frontend hide/show** baseado em permissões

### 🔒 Recomendações adicionais:

1. **Rate limiting**: Já implementado globalmente no app
2. **IP whitelisting**: Considere para ambientes produção
3. **2FA para admins**: Implementar em módulo de autenticação
4. **Session timeout**: Configurar JWT expiration adequado
5. **Logs de acesso**: CloudWatch, Datadog, etc.

## Troubleshooting

### "WhatsApp item não aparece no menu"

1. Verificar se usuário está logado:
   ```typescript
   console.log(user);
   ```

2. Verificar permissões:
   ```typescript
   console.log(hasPermission('WHATSAPP_CONFIG', 'view'));
   ```

3. Verificar banco de dados:
   ```sql
   SELECT * FROM permissions 
   WHERE "userId" = 'user-id-here' 
   AND resource = 'WHATSAPP_CONFIG';
   ```

### "403 Forbidden ao acessar rotas"

1. Verificar se migration foi executada:
   ```bash
   npx prisma migrate status
   ```

2. Executar seed de permissões:
   ```bash
   npx tsx scripts/seed-whatsapp-permission.ts
   ```

3. Regenerar Prisma Client:
   ```bash
   npx prisma generate
   ```

### "Property 'WHATSAPP_CONFIG' does not exist"

Execute:
```bash
npx prisma generate
```

O Prisma Client precisa ser regenerado após mudanças no schema.

## Referências

- **Arquivo de Middleware**: `backend/src/middleware/rbac.middleware.ts`
- **Schema Prisma**: `backend/prisma/schema.prisma`
- **Migration**: `backend/prisma/migrations/20260407120000_add_whatsapp_config_resource/`
- **Seed Script**: `backend/scripts/seed-whatsapp-permission.ts`
- **Routes**: `backend/src/app.ts` (linhas 90-97)
- **Frontend Context**: `frontend/src/contexts/AuthContext.tsx`
- **Frontend Sidebar**: `frontend/src/components/layout/Sidebar.tsx`
