# TASK-001: Implementação Completa da Tela de Gestão de Usuários

**Tipo**: Feature Enhancement  
**Prioridade**: 🟡 Média  
**Status**: 📋 Backlog  
**Estimativa**: 8 Story Points (~12-16h)  
**Sprint**: A definir  
**Criado em**: 2026-04-08

---

## 📋 Contexto

O sistema FarmFlow já possui uma tela básica de usuários (`/users`) com funcionalidades de listagem, cadastro, edição e exclusão. No entanto, falta implementar a funcionalidade de **pausar/ativar acesso** do usuário de forma visual e intuitiva, além de melhorias na UX e segurança.

**Situação Atual**:
- ✅ Listagem de usuários com paginação
- ✅ Cadastro de novos usuários (modal)
- ✅ Edição de usuários (modal)
- ✅ Exclusão de usuários (com confirmação)
- ✅ Sistema de permissões RBAC
- ✅ Isolamento multi-tenant (cada tenant vê apenas seus usuários)
- ⚠️ Campo `active` existe no banco, mas sem toggle visual
- ⚠️ Falta ação de "pausar/reativar" na interface

---

## 🎯 Objetivo

Melhorar a tela de gestão de usuários adicionando:
1. **Toggle visual** para pausar/reativar usuário (sem excluir)
2. **Confirmações** apropriadas com contexto
3. **Feedback visual** claro do status do usuário
4. **Validações de segurança** (não permitir desativar a si mesmo)
5. **Melhorias de UX** na tabela e ações

---

## 👤 User Stories

### US-001: Pausar Acesso do Usuário
**Como** administrador do sistema  
**Quero** pausar o acesso de um usuário temporariamente  
**Para que** eu possa impedir login sem excluir o cadastro permanentemente

**Critérios de Aceite**:
- [ ] Botão/toggle "Pausar Acesso" visível na listagem
- [ ] Modal de confirmação pergunta "Tem certeza que deseja pausar o acesso de [Nome]?"
- [ ] Após pausar, status do usuário muda para "Inativo" (badge vermelho)
- [ ] Usuário pausado não consegue fazer login (validação no backend)
- [ ] Admin não consegue pausar a si mesmo
- [ ] Auditoria: log de quando foi pausado e por quem

### US-002: Reativar Acesso do Usuário
**Como** administrador do sistema  
**Quero** reativar o acesso de um usuário pausado  
**Para que** ele possa voltar a usar o sistema

**Critérios de Aceite**:
- [ ] Botão/toggle "Reativar Acesso" visível para usuários inativos
- [ ] Modal de confirmação pergunta "Tem certeza que deseja reativar o acesso de [Nome]?"
- [ ] Após reativar, status muda para "Ativo" (badge verde)
- [ ] Usuário consegue fazer login imediatamente
- [ ] Auditoria: log de quando foi reativado e por quem

### US-003: Visualização Clara do Status
**Como** administrador do sistema  
**Quero** identificar rapidamente quais usuários estão ativos ou inativos  
**Para que** eu possa gerenciar acessos facilmente

**Critérios de Aceite**:
- [ ] Badge "Ativo" (verde) e "Inativo" (vermelho/cinza) claramente visíveis
- [ ] Filtro para mostrar apenas ativos, inativos, ou todos
- [ ] Contador mostra "X ativos de Y total"
- [ ] Usuários inativos têm visual diferenciado (opacidade reduzida)

### US-004: Prevenção de Bloqueio Total
**Como** sistema  
**Quero** impedir que o último admin ativo seja desativado  
**Para que** sempre haja pelo menos um admin com acesso

**Critérios de Aceite**:
- [ ] Sistema valida se existe outro admin ativo antes de pausar
- [ ] Se for o último admin ativo, mostra erro: "Não é possível desativar o último administrador ativo"
- [ ] Admin não consegue desativar a si mesmo
- [ ] Validação no backend (segurança)

---

## 🎨 Design/Wireframe

### Tela de Listagem - Ações por Usuário

```
┌─────────────────────────────────────────────────────────────┐
│ Gestão de Usuários                          [+ Novo Usuário]│
├─────────────────────────────────────────────────────────────┤
│ Filtros: [Todos ▼] [Status: Todos ▼]     🔍 Buscar...      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Nome          Email              Perfil    Status  Ações│  │
│ ├───────────────────────────────────────────────────────┤   │
│ │ João Silva    joao@email.com     Admin    [Ativo]   ... │  │
│ │ Maria Santos  maria@email.com    User     [Ativo]   ... │  │
│ │ Carlos Souza  carlos@email.com   User     [Inativo] ... │  │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ Mostrando 3 de 15 usuários (12 ativos)        [1] 2 3 >    │
└─────────────────────────────────────────────────────────────┘
```

### Menu de Ações (Dropdown)

**Para Usuário ATIVO**:
```
┌──────────────────────┐
│ ✏️  Editar           │
│ 👁️  Ver Detalhes     │
│ ⏸️  Pausar Acesso    │
│ 🗑️  Excluir          │
└──────────────────────┘
```

**Para Usuário INATIVO**:
```
┌──────────────────────┐
│ ✏️  Editar           │
│ 👁️  Ver Detalhes     │
│ ▶️  Reativar Acesso  │
│ 🗑️  Excluir          │
└──────────────────────┘
```

### Modal de Confirmação - Pausar

```
┌───────────────────────────────────────────┐
│  ⚠️  Pausar Acesso do Usuário              │
├───────────────────────────────────────────┤
│                                            │
│  Tem certeza que deseja pausar o acesso   │
│  do usuário "Maria Santos"?                │
│                                            │
│  Esta ação irá:                            │
│  • Impedir o login imediato                │
│  • Manter todos os dados preservados       │
│  • Permitir reativação posterior           │
│                                            │
│  Motivo (opcional):                        │
│  ┌──────────────────────────────────────┐ │
│  │ Ex: Férias, afastamento temporário   │ │
│  └──────────────────────────────────────┘ │
│                                            │
│         [Cancelar]  [Pausar Acesso]       │
└───────────────────────────────────────────┘
```

---

## 🔧 Especificação Técnica

### Frontend

#### 1. Atualizar `frontend/src/pages/Users.tsx`

**Adicionar**:
- Estado para filtro de status
- Função `handleToggleStatus(userId, currentStatus, userName)`
- Modal de confirmação com campo "motivo"
- Dropdown de ações refatorado
- Badges de status melhorados
- Filtro por status (Todos, Ativos, Inativos)
- Contador de usuários ativos/inativos

**Componentes a criar**:
```typescript
// frontend/src/components/users/UserStatusToggle.tsx
interface UserStatusToggleProps {
  userId: string;
  userName: string;
  currentStatus: boolean;
  onToggle: (userId: string, newStatus: boolean, reason?: string) => Promise<void>;
}
```

#### 2. Atualizar `frontend/src/hooks/useUsers.ts`

**Adicionar hook**:
```typescript
export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      active, 
      reason 
    }: { 
      userId: string; 
      active: boolean; 
      reason?: string 
    }) => {
      const response = await api.patch(`/api/users/${userId}/status`, { 
        active, 
        reason 
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
```

#### 3. Adicionar filtros na API

```typescript
// Atualizar useUsers para aceitar filtro de status
export const useUsers = (
  page = 1, 
  limit = 10, 
  filters?: { status?: 'all' | 'active' | 'inactive' }
) => {
  return useQuery({
    queryKey: ['users', page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (filters?.status && filters.status !== 'all') {
        params.append('active', filters.status === 'active' ? 'true' : 'false');
      }
      
      const response = await api.get(`/api/users?${params}`);
      return response.data;
    },
  });
};
```

### Backend

#### 1. Adicionar rota em `backend/src/app.ts`

```typescript
// User routes (protected + tenant isolation)
apiRouter.get('/users', authenticate, requireTenant, UserController.list);
apiRouter.get('/users/:id', authenticate, requireTenant, UserController.getById);
apiRouter.post('/users', authenticate, requireTenant, UserController.create);
apiRouter.put('/users/:id', authenticate, requireTenant, UserController.update);
apiRouter.patch('/users/:id/status', authenticate, requireTenant, UserController.toggleStatus); // NOVA
apiRouter.delete('/users/:id', authenticate, requireTenant, UserController.delete);
```

#### 2. Criar método em `backend/src/modules/users/user.service.ts`

```typescript
/**
 * Alterna o status ativo/inativo do usuário
 */
static async toggleStatus(
  tenantId: string,
  userId: string,
  active: boolean,
  reason?: string,
  performedBy?: string
): Promise<User> {
  // Validar se usuário existe e pertence ao tenant
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });

  if (!user) {
    throw createError.notFound('Usuário não encontrado');
  }

  // Impedir que admin desative a si mesmo
  if (userId === performedBy) {
    throw createError.forbidden('Você não pode desativar seu próprio acesso');
  }

  // Se estiver desativando, verificar se é o último admin ativo
  if (!active && user.role === 'ADMIN') {
    const activeAdminsCount = await prisma.user.count({
      where: {
        tenantId,
        role: 'ADMIN',
        active: true,
        id: { not: userId },
      },
    });

    if (activeAdminsCount === 0) {
      throw createError.forbidden(
        'Não é possível desativar o último administrador ativo'
      );
    }
  }

  // Atualizar status
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { active },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      tenantId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Log de auditoria (opcional - se tiver tabela de logs)
  logger.info('User status toggled', {
    userId,
    tenantId,
    newStatus: active,
    reason,
    performedBy,
  });

  return updatedUser;
}
```

#### 3. Criar controller em `backend/src/modules/users/user.controller.ts`

```typescript
/**
 * PATCH /api/users/:id/status
 * Alterna status ativo/inativo do usuário
 */
static toggleStatus = ErrorHandler.asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { active, reason } = req.body;
    const tenantId = (req as any).user?.tenantId!;
    const performedBy = (req as any).user?.id;

    if (typeof active !== 'boolean') {
      throw createError.badRequest('Campo "active" é obrigatório e deve ser boolean');
    }

    const user = await UserService.toggleStatus(
      tenantId,
      id,
      active,
      reason,
      performedBy
    );

    res.json({
      success: true,
      message: active ? 'Usuário reativado com sucesso' : 'Usuário pausado com sucesso',
      data: user,
    });
  }
);
```

#### 4. Atualizar validação de login em `backend/src/modules/auth/auth.service.ts`

```typescript
static async login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: true },
  });

  if (!user) {
    throw createError.unauthorized('Credenciais inválidas');
  }

  // ✅ ADICIONAR: Verificar se usuário está ativo
  if (!user.active) {
    throw createError.forbidden(
      'Seu acesso foi pausado. Entre em contato com o administrador.'
    );
  }

  // ✅ ADICIONAR: Verificar se tenant está ativo
  if (!user.tenant || !user.tenant.active) {
    throw createError.forbidden(
      'Tenant inativo. Entre em contato com o suporte.'
    );
  }

  // Resto da lógica de login...
}
```

#### 5. Adicionar filtro de status em `UserService.list()`

```typescript
static async list(
  tenantId: string, 
  page = 1, 
  limit = 10,
  filters?: { active?: boolean }
): Promise<PaginatedResponse<any>> {
  const skip = (page - 1) * limit;

  const where: any = { tenantId };

  // ✅ ADICIONAR: Filtro por status
  if (filters?.active !== undefined) {
    where.active = filters.active;
  }

  const [users, total, activeCount] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        permissions: true,
      },
      orderBy: [
        { active: 'desc' }, // Ativos primeiro
        { createdAt: 'desc' },
      ],
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { tenantId, active: true } }), // ✅ NOVO
  ]);

  return {
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    meta: {
      activeCount, // ✅ NOVO: contador de ativos
      inactiveCount: total - activeCount, // ✅ NOVO: contador de inativos
    },
  };
}
```

---

## 🧪 Cenários de Teste

### Testes Funcionais

#### TC-001: Pausar usuário ativo
**Dado** que estou logado como admin  
**E** existe um usuário ativo "Maria Santos"  
**Quando** clico em "Pausar Acesso"  
**E** confirmo a ação  
**Então** o status muda para "Inativo"  
**E** o usuário não consegue fazer login  
**E** vejo mensagem de sucesso

#### TC-002: Reativar usuário inativo
**Dado** que estou logado como admin  
**E** existe um usuário inativo "Carlos Souza"  
**Quando** clico em "Reativar Acesso"  
**E** confirmo a ação  
**Então** o status muda para "Ativo"  
**E** o usuário consegue fazer login  
**E** vejo mensagem de sucesso

#### TC-003: Impedir desativar a si mesmo
**Dado** que estou logado como "João Silva" (admin)  
**Quando** tento pausar meu próprio acesso  
**Então** vejo erro "Você não pode desativar seu próprio acesso"  
**E** meu status permanece ativo

#### TC-004: Impedir desativar último admin
**Dado** que estou logado como admin  
**E** existe apenas 1 admin ativo (eu)  
**E** existe outro admin inativo  
**Quando** tento pausar meu acesso (ou pedir outro admin para me pausar)  
**Então** vejo erro "Não é possível desativar o último administrador ativo"  
**E** meu status permanece ativo

#### TC-005: Login com usuário pausado
**Dado** que existe um usuário pausado "Maria Santos"  
**Quando** tento fazer login com email/senha corretos  
**Então** vejo mensagem "Seu acesso foi pausado. Entre em contato com o administrador."  
**E** não consigo acessar o sistema

#### TC-006: Filtrar por status
**Dado** que estou na tela de usuários  
**Quando** seleciono filtro "Apenas Ativos"  
**Então** vejo apenas usuários com status "Ativo"  
**Quando** seleciono "Apenas Inativos"  
**Então** vejo apenas usuários com status "Inativo"

### Testes de Segurança

#### TS-001: Isolamento multi-tenant
**Dado** que sou admin do Tenant A  
**Quando** tento pausar usuário do Tenant B via API  
**Então** recebo erro 403 Forbidden

#### TS-002: Permissão de acesso
**Dado** que sou USER (não admin)  
**Quando** tento acessar /users  
**Então** verifico se tenho permissão canView em USERS  
**Senão** vejo erro de permissão negada

---

## 📊 Métricas de Sucesso

- [ ] Tempo para pausar/reativar usuário: < 3 cliques
- [ ] 0 bugs críticos em produção por 30 dias
- [ ] 100% dos casos de teste passando
- [ ] Feedback positivo dos admins em 90%+ dos casos
- [ ] Redução de 50% em solicitações de "reativar usuário" via suporte

---

## 🚧 Dependências

- [x] Sistema multi-tenant implementado (✅ Concluído em 2026-04-07)
- [x] Sistema RBAC implementado (✅ Concluído)
- [x] Tabela User com campo `active` (✅ Já existe)
- [x] Middleware de autenticação (✅ Já existe)

---

## 🎯 Definição de Pronto (DoD)

- [ ] Código implementado (frontend + backend)
- [ ] Testes unitários escritos e passando
- [ ] Testes de integração escritos e passando
- [ ] Todos os cenários de teste validados
- [ ] Code review aprovado por pelo menos 1 dev senior
- [ ] Documentação atualizada (README, CHANGELOG)
- [ ] Testado em ambiente de staging
- [ ] Deploy em produção realizado
- [ ] Monitoramento ativo (logs, métricas)

---

## 📝 Notas Técnicas

### Considerações de UX
- Usar **toggle switch** ao invés de botão pode ser mais intuitivo
- Considerar adicionar **motivo** obrigatório ao pausar (audit trail)
- Mostrar **data/hora da última ativação** na tabela
- Notificar usuário por email quando acesso for pausado

### Considerações de Segurança
- ✅ Validar no backend (não confiar apenas no frontend)
- ✅ Registrar em log todas as mudanças de status (auditoria)
- ✅ Validar permissões RBAC (apenas admin pode pausar)
- ✅ Revogar tokens JWT de usuários pausados (opcional - requires Redis)

### Melhorias Futuras (Não neste Sprint)
- [ ] Pausar acesso temporariamente (com data de reativação automática)
- [ ] Notificação por email ao pausar/reativar
- [ ] Dashboard com histórico de ativações/pausas
- [ ] Bulk actions (pausar múltiplos usuários)
- [ ] API de logs de auditoria para admins

---

## 🔗 Referências

- **Documentação Multi-Tenant**: `docs/IMPLEMENTACAO_MULTI_TENANT.md`
- **Documentação RBAC**: `docs/RBAC_DESIGN.md` (se existir)
- **Figma Design**: [Link quando disponível]
- **PRs Relacionados**: 
  - #630306d - feat: implementa isolamento multi-tenant completo

---

## ✅ Checklist de Implementação

### Frontend
- [ ] Adicionar estado de filtro de status
- [ ] Criar componente `UserStatusToggle`
- [ ] Criar modal de confirmação com campo "motivo"
- [ ] Refatorar dropdown de ações
- [ ] Implementar filtro por status (Todos/Ativos/Inativos)
- [ ] Adicionar contador de ativos/inativos
- [ ] Melhorar badges de status
- [ ] Adicionar hook `useToggleUserStatus`
- [ ] Atualizar hook `useUsers` para aceitar filtros
- [ ] Adicionar loading states
- [ ] Adicionar tratamento de erros

### Backend
- [ ] Criar rota PATCH `/users/:id/status`
- [ ] Implementar `UserService.toggleStatus()`
- [ ] Implementar `UserController.toggleStatus()`
- [ ] Adicionar validação "não desativar a si mesmo"
- [ ] Adicionar validação "último admin ativo"
- [ ] Atualizar `AuthService.login()` para bloquear inativos
- [ ] Adicionar filtro de status em `UserService.list()`
- [ ] Adicionar contador de ativos no response
- [ ] Adicionar logs de auditoria
- [ ] Escrever testes unitários
- [ ] Escrever testes de integração

### Documentação
- [ ] Atualizar README com nova funcionalidade
- [ ] Atualizar CHANGELOG
- [ ] Criar guia de uso para admins
- [ ] Documentar endpoints da API

### Testes
- [ ] TC-001 a TC-006 (funcionais)
- [ ] TS-001 a TS-002 (segurança)
- [ ] Teste de carga (pausar 100 usuários)
- [ ] Teste de regressão (não quebrar funcionalidades existentes)

---

**Criado por**: PO Sênior - FarmFlow  
**Última atualização**: 2026-04-08  
**Próxima revisão**: Após refinamento com o time
