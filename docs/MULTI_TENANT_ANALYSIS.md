# Análise Multi-Tenant - Isolamento de Dados

**Data**: 2026-04-07  
**Status**: ⚠️ **PROBLEMA CRÍTICO IDENTIFICADO**  
**Prioridade**: 🔴 **ALTA**

---

## 🔍 Situação Atual

### **Problema Identificado:**

Atualmente, o sistema **NÃO possui isolamento completo entre produtores**. Embora a arquitetura tenha sido projetada para multi-tenancy (com modelo `Tenant` no banco), o isolamento não está sendo aplicado nas queries de cotações.

### **Evidências:**

1. **Schema do Banco (Prisma)**:
   ```prisma
   model Quote {
     id               String        @id @default(uuid())
     producer         Producer      @relation(fields: [producerId], references: [id])
     producerId       String
     product          String
     quantity         String
     // ... outros campos
     
     @@index([producerId])  // ✅ Há índice por produtor
     // ❌ MAS NÃO HÁ tenantId na tabela Quote!
   }
   
   model Producer {
     id                   String   @id @default(uuid())
     cpfCnpj              String   @unique
     // ❌ NÃO HÁ tenantId na tabela Producer!
   }
   ```

2. **Controller de Quotes**:
   ```typescript
   // backend/src/modules/quotes/quote.controller.ts
   static create = async (req: Request, res: Response) => {
     const data = createQuoteSchema.parse(req.body);
     const quote = await QuoteService.create(data);
     // ❌ NÃO verifica se o produtor pertence ao tenant do usuário logado!
   }
   ```

3. **Service de Quotes**:
   ```typescript
   // backend/src/modules/quotes/quote.service.ts
   static async create(data: CreateQuoteDTO) {
     const producer = await prisma.producer.findUnique({
       where: { id: data.producerId },
     });
     // ✅ Verifica se produtor existe
     // ❌ MAS NÃO verifica se pertence ao tenant correto!
   }
   ```

---

## ⚠️ Riscos Atuais

### **1. Vazamento de Dados Entre Tenants**

**Cenário:**
- Tenant A (Fazenda XYZ) tem 10 produtores
- Tenant B (Cooperativa ABC) tem 15 produtores
- Usuário do Tenant A pode criar cotação usando `producerId` do Tenant B

**Impacto:**
- 🔴 **Crítico**: Vazamento de dados entre clientes
- 🔴 **Crítico**: Violação de privacidade (LGPD)
- 🔴 **Crítico**: Perda de confiança dos clientes

### **2. Consultas Sem Filtro de Tenant**

**Exemplo:**
```typescript
// Lista TODAS as cotações, independente do tenant
const quotes = await prisma.quote.findMany({
  where: { status: 'PENDING' }
  // ❌ Deveria filtrar por tenantId!
});
```

### **3. Colisão de CPF/CNPJ**

```prisma
model Producer {
  cpfCnpj String @unique  // ❌ Global! Deveria ser unique por tenant
}
```

**Problema:**
- Dois tenants não podem ter o mesmo produtor (mesmo CPF/CNPJ)
- Cooperativas não podem compartilhar produtores comuns

---

## ✅ Como Deveria Funcionar (Multi-Tenant Correto)

### **Arquitetura Ideal:**

```
Tenant A (Fazenda XYZ)
├── User 1 (admin)
├── User 2 (operador)
├── Producer 1
├── Producer 2
└── Quote 1 → Producer 1 (isolado do Tenant B)

Tenant B (Cooperativa ABC)
├── User 3 (admin)
├── Producer 3
├── Producer 4
└── Quote 2 → Producer 3 (isolado do Tenant A)
```

### **Fluxo Correto:**

1. **Usuário faz login** → JWT contém `userId` + `tenantId`
2. **Cria cotação** → Sistema verifica:
   - ✅ Produtor existe?
   - ✅ Produtor pertence ao tenant do usuário?
   - ✅ Cotação é salva com `tenantId`
3. **Lista cotações** → Sistema filtra:
   - ✅ Apenas cotações do tenant do usuário

---

## 🔧 Solução Proposta

### **Fase 1: Adicionar TenantId nas Tabelas** (Obrigatório)

**Migration Prisma:**
```prisma
model Producer {
  id        String   @id @default(uuid())
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  tenantId  String   // ✅ Adicionar
  cpfCnpj   String
  // ... outros campos
  
  @@unique([tenantId, cpfCnpj])  // ✅ Unique por tenant
  @@index([tenantId])
}

model Quote {
  id         String   @id @default(uuid())
  tenant     Tenant   @relation(fields: [tenantId], references: [id])
  tenantId   String   // ✅ Adicionar
  producer   Producer @relation(fields: [producerId], references: [id])
  producerId String
  // ... outros campos
  
  @@index([tenantId])
  @@index([tenantId, status])  // ✅ Índice composto
}

model Supplier {
  id        String   @id @default(uuid())
  tenant    Tenant?  @relation(fields: [tenantId], references: [id])
  tenantId  String?  // ✅ Opcional (fornecedores da rede são null)
  // ... outros campos
  
  @@index([tenantId])
}
```

### **Fase 2: Middleware de Tenant** (Obrigatório)

**Novo arquivo: `backend/src/middlewares/tenant.middleware.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { createError } from '../utils/error-handler';

/**
 * Middleware que extrai e valida o tenantId do usuário autenticado
 * Deve ser usado DEPOIS do authMiddleware
 */
export function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;

    if (!user || !user.tenantId) {
      throw createError.unauthorized('Tenant não identificado');
    }

    // Adiciona tenantId à requisição para uso posterior
    (req as any).tenantId = user.tenantId;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware que valida se um recurso pertence ao tenant do usuário
 * Exemplo: verificar se um producerId pertence ao tenant
 */
export function validateTenantOwnership(resourceType: 'producer' | 'quote' | 'supplier') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const tenantId = (req as any).tenantId;
      const resourceId = req.params.id;

      // Buscar recurso e verificar tenantId
      const resource = await prisma[resourceType].findUnique({
        where: { id: resourceId },
        select: { tenantId: true }
      });

      if (!resource) {
        throw createError.notFound(`${resourceType} não encontrado`);
      }

      if (resource.tenantId !== tenantId) {
        throw createError.forbidden('Você não tem permissão para acessar este recurso');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
```

### **Fase 3: Atualizar Services** (Obrigatório)

**Exemplo: `quote.service.ts`**

```typescript
class QuoteService {
  static async create(tenantId: string, data: CreateQuoteDTO) {
    // ✅ Verificar se produtor pertence ao tenant
    const producer = await prisma.producer.findFirst({
      where: { 
        id: data.producerId,
        tenantId: tenantId  // ✅ Filtro por tenant
      }
    });

    if (!producer) {
      throw createError.notFound('Produtor não encontrado ou não pertence ao seu tenant');
    }

    // ✅ Criar cotação com tenantId
    const quote = await prisma.quote.create({
      data: {
        ...data,
        tenantId: tenantId,  // ✅ Sempre incluir
        expiresAt: calculateExpiresAt(data.deadline),
      }
    });

    return quote;
  }

  static async list(tenantId: string, filters: any) {
    // ✅ SEMPRE filtrar por tenantId
    return prisma.quote.findMany({
      where: {
        tenantId: tenantId,  // ✅ Obrigatório
        ...filters
      }
    });
  }
}
```

### **Fase 4: Atualizar Routes** (Obrigatório)

```typescript
// backend/src/modules/quotes/quote.routes.ts

router.post(
  '/',
  authMiddleware,           // 1. Autentica usuário
  tenantMiddleware,         // 2. ✅ Extrai tenantId
  authorize('QUOTES', 'create'),
  QuoteController.create
);

router.get(
  '/:id',
  authMiddleware,
  tenantMiddleware,         // ✅ Adicionar
  validateTenantOwnership('quote'),  // ✅ Valida ownership
  QuoteController.getById
);
```

---

## 📋 Checklist de Implementação

### **1. Schema & Migrations** (2-3 horas)
- [ ] Adicionar `tenantId` em `Producer`
- [ ] Adicionar `tenantId` em `Quote`
- [ ] Adicionar `tenantId` em `Supplier` (nullable para rede)
- [ ] Adicionar `tenantId` em `Proposal`
- [ ] Criar índices compostos `(tenantId, cpfCnpj)` em Producer
- [ ] Criar índices compostos `(tenantId, status)` em Quote
- [ ] Gerar e aplicar migration

### **2. Middleware** (1-2 horas)
- [ ] Criar `tenant.middleware.ts`
- [ ] Implementar `tenantMiddleware()`
- [ ] Implementar `validateTenantOwnership()`
- [ ] Adicionar testes unitários

### **3. Services** (3-4 horas)
- [ ] Atualizar `producer.service.ts` (add tenantId)
- [ ] Atualizar `quote.service.ts` (add tenantId)
- [ ] Atualizar `supplier.service.ts` (add tenantId)
- [ ] Atualizar `proposal.service.ts` (add tenantId)
- [ ] Adicionar validações de ownership

### **4. Controllers** (2-3 horas)
- [ ] Atualizar `producer.controller.ts`
- [ ] Atualizar `quote.controller.ts`
- [ ] Atualizar `supplier.controller.ts`
- [ ] Passar `tenantId` para services

### **5. Routes** (1 hora)
- [ ] Adicionar `tenantMiddleware` em todas as rotas
- [ ] Adicionar `validateTenantOwnership` onde necessário

### **6. Seeds & Fixtures** (1 hora)
- [ ] Criar tenant padrão para dev
- [ ] Atualizar seeds com `tenantId`
- [ ] Criar múltiplos tenants para teste

### **7. Testes** (2-3 horas)
- [ ] Teste: criar quote com produtor de outro tenant (deve falhar)
- [ ] Teste: listar quotes filtra apenas do tenant
- [ ] Teste: CPF/CNPJ pode repetir em tenants diferentes
- [ ] Teste: usuário não acessa recursos de outro tenant

### **8. Documentação** (1 hora)
- [ ] Documentar arquitetura multi-tenant
- [ ] Atualizar README com conceito de tenant
- [ ] Criar guia de troubleshooting

**Tempo total estimado: 13-18 horas**

---

## 🚨 Ação Imediata Recomendada

### **Opção 1: Implementação Completa** (Recomendado)
- Parar novas features
- Implementar isolamento completo
- Testar extensivamente
- Deploy com migration

### **Opção 2: Mitigação Temporária** (Paliativo)
- Adicionar validação básica nos controllers:
  ```typescript
  // Verificação manual até implementar tenant completo
  const userTenantId = req.user.tenantId;
  const producer = await prisma.producer.findUnique({ 
    where: { id: data.producerId },
    include: { subscription: { include: { tenant: true }}}
  });
  
  if (producer?.subscription?.tenant?.id !== userTenantId) {
    throw createError.forbidden('Produtor não pertence ao seu tenant');
  }
  ```

**⚠️ Nota:** Opção 2 é apenas paliativa. O problema persiste.

---

## 📊 Impacto da Implementação

### **Positivo:**
- ✅ **Isolamento completo** entre clientes
- ✅ **Segurança LGPD** garantida
- ✅ **Escalabilidade** para SaaS real
- ✅ **Confiabilidade** do sistema
- ✅ **Permite multi-cliente** (cooperativas, revendas)

### **Negativo:**
- ⚠️ **Breaking change**: Requer migration
- ⚠️ **Downtime**: ~5-10 minutos para migration
- ⚠️ **Testes**: Exigirá testes extensivos

### **Mitigação:**
- Planejar migration em horário de baixo tráfego
- Backup completo antes da migration
- Testar migration em staging primeiro
- Rollback plan preparado

---

## 💡 Conclusão

**Resposta à pergunta original:**

> "Um produtor consegue fazer uma cotação sem atrapalhar outro produtor?"

**❌ Não está garantido atualmente.** 

Embora na prática os produtores não "atrapalhem" uns aos outros (cada um tem seu próprio ID), há **risco de vazamento de dados entre tenants diferentes** (clientes/fazendas diferentes usando o mesmo sistema).

**O que funciona:**
- ✅ Produtores do mesmo tenant não se atrapalham
- ✅ Cada cotação pertence a um produtor específico
- ✅ Sistema de proposals funciona corretamente

**O que NÃO está protegido:**
- ❌ Tenant A pode acessar dados do Tenant B
- ❌ Usuário pode criar cotação com produtor de outro tenant
- ❌ Queries listam dados de todos os tenants

**Recomendação:** Implementar isolamento multi-tenant completo **antes de ir para produção com múltiplos clientes**.

---

**Autor**: Análise técnica (Claude)  
**Revisão necessária**: Time de desenvolvimento  
**Próximos passos**: Definir prioridade e timeline para implementação
