# CotaAgro - Especificações de Produto

**Product Owner:** Claude Code  
**Data:** 2026-04-02  
**Versão:** 1.0  
**Design System:** Clean Minimal Utility (Linear/Vercel style)

---

## 📋 Índice

1. [Visão Geral do Produto](#visão-geral-do-produto)
2. [Fluxo Principal do Usuário](#fluxo-principal-do-usuário)
3. [Especificações por Tela](#especificações-por-tela)
   - [Login](#1-login)
   - [Dashboard](#2-dashboard)
   - [Cotações](#3-cotações)
   - [Detalhe da Cotação](#4-detalhe-da-cotação)
   - [Produtores](#5-produtores)
   - [Fornecedores](#6-fornecedores)
   - [Assinaturas](#7-assinaturas)
   - [Usuários](#8-usuários)

---

## Visão Geral do Produto

### Propósito
CotaAgro é uma plataforma B2B que automatiza o processo de cotação agrícola via WhatsApp, conectando produtores rurais a fornecedores de insumos, ração, fertilizantes e outros produtos agrícolas.

### Personas
1. **Administrador**: Gestor da plataforma, controle total
2. **Operador**: Gerencia cotações e cadastros (permissões limitadas)
3. **Produtor Rural**: Usuário final via WhatsApp (não acessa o painel)
4. **Fornecedor**: Recebe cotações via WhatsApp, responde com propostas

### Diferencial
- Automatização via WhatsApp usando IA (GPT-4) para interpretação de mensagens
- Interface administrativa minimalista e eficiente
- Sistema de permissões granular
- Fluxo de cotação inteligente com seleção de fornecedores

---

## Fluxo Principal do Usuário

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO ADMINISTRATIVO                      │
└─────────────────────────────────────────────────────────────┘

1. LOGIN
   └─> Autenticação JWT com email/senha
       └─> Verifica permissões do usuário
           └─> Redireciona para Dashboard

2. DASHBOARD
   └─> Visão geral de KPIs e métricas
       └─> Atalhos para ações rápidas
           └─> Navegação para funcionalidades

3. GESTÃO DE COTAÇÕES
   └─> Listar cotações (filtros e busca)
       └─> Ver detalhes de cotação específica
           └─> Analisar propostas recebidas
               └─> Fechar cotação com fornecedor vencedor

4. GESTÃO DE CADASTROS
   ├─> Produtores: Cadastro com CPF/CNPJ, dados completos
   ├─> Fornecedores: Categorias, telefone WhatsApp, tipo
   └─> Usuários: Permissões granulares por módulo

5. ASSINATURAS
   └─> Gestão de planos dos produtores
       └─> Status: Ativo, Trial, Cancelado
```

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO VIA WHATSAPP                        │
└─────────────────────────────────────────────────────────────┘

PRODUTOR
1. Envia mensagem: "Preciso de 50 sacas de ração para gado"
2. IA interpreta: produto, quantidade, categoria
3. Sistema pergunta: "Todos fornecedores ou apenas seus fornecedores?"
4. Se "meus fornecedores":
   └─> Lista fornecedores
   └─> Permite exclusões
   └─> Confirma seleção
5. Dispara cotação para fornecedores selecionados

FORNECEDOR
1. Recebe mensagem com detalhes da cotação
2. Responde com proposta: "R$ 80,00 por saca, entrega em 3 dias"
3. IA interpreta proposta e registra no sistema
4. Admin visualiza propostas no painel
5. Admin fecha cotação com melhor proposta
6. Fornecedor vencedor é notificado
```

---

## Especificações por Tela

---

## 1. LOGIN

### 🎯 Objetivo
Autenticar usuários administrativos (Admin/Operadores) no sistema com credenciais seguras.

### 📐 Layout e Estrutura

#### Container Principal
- **Background**: `var(--background)` (branco puro no light, cinza escuro no dark)
- **Centralização**: Vertical e horizontal (flexbox center)
- **Responsividade**: Mobile-first, max-width 28rem (448px)
- **Padding**: 1rem em mobile

#### Logo e Branding
```
┌─────────────────┐
│   ╔═══════╗     │  ← Logo quadrado 44x44px
│   ║   CA  ║     │    Background: primary (indigo)
│   ╚═══════╝     │    Text: primary-foreground, font-medium
│                 │
│    CotaAgro     │  ← Título: text-2xl, font-medium
│                 │
│ Sistema de...   │  ← Subtítulo: text-sm, muted-foreground
└─────────────────┘
```

**Especificações:**
- Logo: `w-11 h-11`, `rounded-md`, `bg-primary`
- Iniciais "CA": `text-base`, `font-medium`, `text-primary-foreground`
- Título: `text-2xl`, `font-medium`, `text-foreground`, `mb-1`
- Descrição: `text-sm`, `text-muted-foreground`
- Espaçamento inferior: `mb-8`

#### Card de Formulário
```
┌────────────────────────────────────────┐
│  [Se houver erro: Alert vermelho]     │
│                                        │
│  E-mail                                │
│  ┌──────────────────────────────────┐ │
│  │ seu@email.com                    │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Senha                                 │
│  ┌──────────────────────────────────┐ │
│  │ ••••••••••••               [👁]  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │          Entrar                  │ │ ← Botão primary
│  └──────────────────────────────────┘ │
│                                        │
│  Credenciais padrão:                  │
│  admin@cotaagro.com / Farmflow0147*   │
└────────────────────────────────────────┘
```

**Especificações do Card:**
- Container: `bg-card`, `border-0.5`, `border-border`, `rounded-md`, `p-6`
- Form: `space-y-5` (20px entre campos)

**Campos de Input:**
- Label: `text-sm`, `font-normal`, `text-foreground`, `mb-2`
- Input: 
  - Base: `w-full`, `px-3`, `py-2`, `text-sm`
  - Estilo: `bg-background`, `border-0.5`, `border-border`, `rounded-md`
  - Focus: `focus:outline-none`, `focus:ring-2`, `focus:ring-ring`
  - Disabled: `opacity-50`, `cursor-not-allowed`
  - Placeholder: `text-muted-foreground`

**Campo de Senha:**
- Container relativo para ícone
- Botão de toggle: `absolute`, `right-2`, `top-1/2`, `-translate-y-1/2`
- Ícone Eye/EyeOff: `w-4 h-4`, `text-muted-foreground`

**Alert de Erro:**
- Container: `bg-[hsl(var(--error-bg))]`, `border-0.5`, `border-[hsl(var(--error))]/20`
- Padding: `p-3`, `rounded-md`
- Texto: `text-sm`, `text-[hsl(var(--error))]`
- Posição: Topo do form, `mb-5`

**Botão Entrar:**
- Tipo: `primary`
- Tamanho: `w-full`, `h-10` (40px)
- Texto: `text-sm`, `font-normal`
- Loading: Desabilitar + spinner opcional
- Hover: `hover:bg-primary/90`

**Credenciais Padrão (Box informativo):**
- Container: `bg-secondary/50`, `border-0.5`, `border-border`, `rounded-md`, `p-3`, `mt-5`
- Título: `text-xs`, `text-muted-foreground`, `mb-1`
- Credenciais: `text-xs`, `font-mono`, `text-foreground`

### 🔄 Estados e Comportamentos

#### Estado Inicial
- Campos vazios
- Botão "Entrar" habilitado
- Sem mensagens de erro

#### Estado de Loading
- Botão desabilitado
- Texto: "Entrando..." ou spinner
- Inputs desabilitados (opacity-50)

#### Estado de Erro
- Alert vermelho aparece no topo
- Campos permanecem preenchidos
- Focus automático no campo de email
- Mensagens de erro específicas:
  - "Credenciais inválidas"
  - "E-mail não encontrado"
  - "Senha incorreta"
  - "Erro de conexão. Tente novamente."

#### Estado de Sucesso
- Redirect imediato para `/dashboard`
- Token JWT salvo no localStorage
- Dados do usuário salvos no contexto

### 🎨 Interações

1. **Toggle Senha:**
   - Click no ícone alterna entre password/text
   - Ícone alterna entre Eye/EyeOff
   - Smooth transition

2. **Validação em Tempo Real:**
   - Email: Validar formato ao blur
   - Senha: Mínimo de caracteres (sem validação visual)

3. **Enter para Submit:**
   - Pressionar Enter em qualquer campo submete o form

4. **Tab Navigation:**
   - Tab: Email → Senha → Toggle → Botão
   - Shift+Tab: Reverso

### ✅ Critérios de Aceite

- [ ] Formulário renderiza com design Clean Minimal correto
- [ ] Validação de email (formato válido)
- [ ] Toggle de visualização de senha funciona
- [ ] Loading state desabilita interações
- [ ] Erros mostram mensagens claras e específicas
- [ ] Sucesso redireciona para Dashboard
- [ ] Token JWT é salvo corretamente
- [ ] Funciona em light e dark mode
- [ ] Responsivo em mobile (320px+)
- [ ] Enter submete o formulário
- [ ] Focus states visíveis (acessibilidade)

### 🔐 Regras de Negócio

1. **Autenticação:**
   - Endpoint: `POST /api/auth/login`
   - Body: `{ email: string, password: string }`
   - Response: `{ token: string, user: { id, name, email, role, permissions } }`

2. **Validações Backend:**
   - Email deve existir no banco
   - Senha deve corresponder (bcrypt verify)
   - Usuário deve estar ativo (`active: true`)

3. **Sessão:**
   - Token JWT válido por 7 dias (configurável)
   - Refresh token não implementado (v1)
   - Logout limpa localStorage

4. **Segurança:**
   - Rate limiting: 5 tentativas por minuto por IP
   - Senha nunca retorna na resposta
   - Erros genéricos ("credenciais inválidas" vs específicos)

### 📱 Comportamento Mobile

- Teclado não cobre campos (viewport adjust)
- Botões com altura mínima de toque (44px)
- Sem zoom no focus dos inputs (font-size: 16px)

### ♿ Acessibilidade

- Labels associados aos inputs (htmlFor)
- ARIA labels em ícones
- Focus trap no modal (se houver)
- Mensagens de erro anunciadas por screen readers
- Contraste adequado (WCAG AA)

---

## 2. DASHBOARD

### 🎯 Objetivo
Fornecer visão holística do negócio com KPIs principais, métricas operacionais e atalhos para ações frequentes. É a primeira tela após login.

### 📐 Layout e Estrutura

#### Header da Página
```
┌─────────────────────────────────────────────────────────┐
│  Dashboard                                              │
│  Visão geral completa do sistema                       │
└─────────────────────────────────────────────────────────┘
```
- Título: `text-2xl`, `font-medium`, `text-foreground`
- Descrição: `text-sm`, `text-muted-foreground`, `mt-1`
- Espaçamento: `mb-6`

#### Grid de KPIs Principais (4 colunas)
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Cotações     │ Propostas    │ Taxa de      │ Produtores   │
│ Hoje         │ Recebidas    │ Fechamento   │ Ativos       │
│              │              │              │              │
│   [24]       │   [156]      │   [68%]      │   [42]       │
│ cotações     │ total        │ cotações     │ com          │
│ criadas hoje │ propostas    │ fechadas     │ assinatura   │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Card KPI - Especificações:**
```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-xs text-muted-foreground font-normal">
      Cotações Hoje
    </CardTitle>
    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-medium text-foreground">24</div>
    <p className="text-xs text-muted-foreground mt-1">
      cotações criadas hoje
    </p>
  </CardContent>
</Card>
```

**Layout:**
- Grid: `grid-cols-1 md:grid-cols-4 gap-3`
- Card: `p-4`, `border-0.5`, `rounded-md`
- Ícone: `3.5px × 3.5px`, `text-muted-foreground`
- Métrica: `text-2xl`, `font-medium`, `text-foreground`
- Label: `text-xs`, `text-muted-foreground`

#### Grid Financeiro (3 colunas)
```
┌───────────────┬───────────────┬───────────────┐
│ Volume Total  │ Ticket Médio  │ Este Mês      │
│               │               │               │
│  R$ 2.450M    │  R$ 15.700    │  R$ 890K      │
│  em 156       │  valor médio  │  57 propostas │
│  propostas    │  por proposta │               │
└───────────────┴───────────────┴───────────────┘
```

**Grid**: `grid-cols-1 md:grid-cols-3 gap-3`

#### Seção de Estatísticas (2 colunas)

**Card Produtores:**
```
┌────────────────────────────────────┐
│ 👤 Produtores                      │
├────────────────────────────────────┤
│                                    │
│    [Total]  [Com Cotações] [Ativos]│
│      89          67           42   │
│                                    │
│  Top Produtores (por cotações)    │
│  ─────────────────────────────────│
│  João Silva              24 cotações│
│  Maria Santos            18 cotações│
│  Pedro Oliveira          15 cotações│
│  Ana Costa               12 cotações│
│  Carlos Souza            10 cotações│
└────────────────────────────────────┘
```

**Card Fornecedores:**
```
┌────────────────────────────────────┐
│ 🏢 Fornecedores                    │
├────────────────────────────────────┤
│                                    │
│   [Total]    [Rede]   [Produtores]│
│     234        189         45      │
│                                    │
│  Top Fornecedores (por propostas) │
│  ─────────────────────────────────│
│  AgroTech Ltda           45 propostas│
│  Fertilizantes Brasil    38 propostas│
│  Ração Premium           32 propostas│
│  Insumos Agrícolas       28 propostas│
│  Sementes do Campo       24 propostas│
└────────────────────────────────────┘
```

**Layout Grid:**
- Container: `grid-cols-1 lg:grid-cols-2 gap-6`
- Métricas internas: `grid-cols-3 gap-4 text-center`
- Métrica: `text-2xl`, `font-medium`
- Label: `text-xs`, `text-muted-foreground`, `mt-1`
- Divisor: `border-t border-border pt-4`
- Lista: `space-y-2`
- Item: `flex justify-between`, `text-sm`
- Badge: `variant="outline"`, `text-xs`

#### Gráficos e Visualizações (2 colunas)

**Produtos Mais Cotados:**
```
┌────────────────────────────────────┐
│ 📦 Produtos Mais Cotados           │
├────────────────────────────────────┤
│ Ração Gado          ████████░░ 45  │
│ Fertilizante NPK    ███████░░░ 38  │
│ Sementes Milho      ██████░░░░ 32  │
│ Defensivo Agrícola  ████░░░░░░ 28  │
│ Adubo Orgânico      ███░░░░░░░ 24  │
└────────────────────────────────────┘
```

**Status das Cotações:**
```
┌────────────────────────────────────┐
│ 📊 Status das Cotações             │
├────────────────────────────────────┤
│ [Coletando]    ██████░░░░ 45 (28%)│
│ [Fechada]      ████████░░ 67 (42%)│
│ [Pendente]     ████░░░░░░ 32 (20%)│
│ [Expirada]     ██░░░░░░░░ 16 (10%)│
└────────────────────────────────────┘
```

**Progress Bar Especificações:**
- Container: `space-y-1.5`
- Label row: `flex justify-between`, `text-sm`
- Nome: `font-normal`, `text-foreground`
- Valor: `text-xs`, `text-muted-foreground`
- Barra: `w-full`, `bg-muted`, `rounded-full`, `h-1.5`
- Fill: `bg-primary`, `h-1.5`, `rounded-full`, `transition-all`
- Width: Calculado como porcentagem

#### Fornecedores por Categoria (Grid 3 colunas)
```
┌──────────────┬──────────────┬──────────────┐
│ Ração        │ Fertilizante │ Defensivo    │
│              │              │              │
│ Fornecedores:│ Fornecedores:│ Fornecedores:│
│     45       │     38       │     32       │
│ Propostas:   │ Propostas:   │ Propostas:   │
│    234       │    189       │    145       │
└──────────────┴──────────────┴──────────────┘
```

**Card Categoria:**
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3`
- Card: `border-0.5 rounded-md p-4 hover:bg-secondary/50 transition-colors`
- Título: `text-sm`, `font-normal`, `mb-3`
- Stats: `space-y-1.5`, `text-xs`
- Label: `text-muted-foreground`
- Valor: `font-normal`, `text-foreground`

#### Últimas Cotações (Lista)
```
┌────────────────────────────────────────────────────────┐
│ Últimas Cotações                                       │
├────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────┐ │
│ │ Ração para Gado                          [Ativo] │ │
│ │ 50 sacas • João Silva                            │ │
│ │ 01/04/2026 às 14:32          3 proposta(s)       │ │
│ └──────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Fertilizante NPK                       [Fechada] │ │
│ │ 100 kg • Maria Santos                            │ │
│ │ 01/04/2026 às 12:15          5 proposta(s)       │ │
│ └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

**Item de Cotação:**
- Container: `border-0.5 rounded-md p-3 hover:bg-secondary/50 transition-colors`
- Layout: `flex justify-between items-center`
- Produto: `text-sm`, `font-normal`, `text-foreground`
- Detalhes: `text-xs`, `text-muted-foreground`, `mt-0.5`
- Badge: Conforme status da cotação
- Contador: `text-xs`, `text-muted-foreground`

### 🔄 Estados e Comportamentos

#### Loading
- Skeleton screens nos cards
- Shimmer effect suave
- Mantém estrutura do layout

#### Erro
- Card de erro discreto: `bg-error-bg`, `border-error`
- Mensagem: "Erro ao carregar estatísticas"
- Botão "Tentar novamente"

#### Vazio (Primeira utilização)
- Empty state ilustrado
- Mensagem: "Nenhum dado ainda"
- CTA: "Criar primeira cotação"

#### Refresh
- Botão sutil no header (opcional)
- Auto-refresh a cada 30s (polling)
- Indicador de "última atualização"

### 🎨 Interações

1. **Click em KPI:**
   - Navega para tela detalhada
   - Ex: Click em "Cotações Hoje" → Lista de cotações filtrada por hoje

2. **Click em Produtor/Fornecedor:**
   - Navega para detalhes do cadastro
   - Abre modal com informações completas

3. **Click em Cotação:**
   - Navega para `/quotes/:id`
   - Mostra detalhes e propostas

4. **Hover em Cards:**
   - Sutil `bg-secondary/50`
   - Cursor pointer em elementos clicáveis

### ✅ Critérios de Aceite

**Dados e Integração:**
- [ ] Todos os KPIs carregam do backend
- [ ] Dados são atualizados em tempo real (ou polling)
- [ ] Formatação correta de moeda (BRL)
- [ ] Formatação correta de datas (pt-BR)
- [ ] Porcentagens calculadas corretamente

**Performance:**
- [ ] Carrega em menos de 2 segundos
- [ ] Skeleton loading durante carregamento
- [ ] Sem flickering ao atualizar dados

**Visual:**
- [ ] Design Clean Minimal aplicado
- [ ] Todos os ícones com tamanho 3.5px
- [ ] Bordas de 0.5px consistentes
- [ ] Espaçamento uniforme (gap-3, gap-6)
- [ ] Responsivo em todos os breakpoints

**Funcional:**
- [ ] Navegação funciona para todas as seções
- [ ] Filtros aplicam corretamente
- [ ] Empty states exibem quando necessário
- [ ] Error handling mostra mensagens claras

### 🔐 Regras de Negócio

**KPIs:**
1. **Cotações Hoje**: Conta cotações criadas nas últimas 24h
2. **Propostas Recebidas**: Total de todas as propostas (histórico)
3. **Taxa de Fechamento**: (Cotações fechadas / Total cotações) × 100
4. **Produtores Ativos**: Produtores com assinatura ativa

**Volume Total:**
- Soma de todos os valores de propostas aceitas
- Considera apenas cotações CLOSED

**Ticket Médio:**
- Valor total / Número de propostas
- Arredonda para 2 casas decimais

**Este Mês:**
- Filtra por created_at >= primeiro dia do mês atual

**Top Lists:**
- Ordenação decrescente por contador
- Limite de 5 itens
- Exibe badge com número

**Status das Cotações:**
- PENDING: Aguardando envio
- COLLECTING: Coletando propostas
- SUMMARIZED: Propostas recebidas
- CLOSED: Fechada com vencedor
- EXPIRED: Expirou sem fechamento

### 📊 Queries e Performance

**Otimizações:**
- Cache de 30 segundos para KPIs
- Índices em: created_at, status, producer_id
- Agregações no banco (não no app)
- Limit queries (Top 5, últimas 5, etc)

**Endpoint:**
```typescript
GET /api/dashboard/stats
Response: {
  stats: { quotesToday, proposalsReceived, closureRate, activeProducers },
  supplierStats: { totalSuppliers, networkSuppliers, producerSuppliers, topSuppliers[] },
  producerStats: { totalProducers, producersWithQuotes, producersWithActiveSubscription, topProducers[] },
  proposalStats: { totalVolume, avgProposalValue, thisMonth: { volume, count } },
  charts: {
    topProducts: Array<{ product, count }>,
    quoteStatusStats: Array<{ status, count }>,
    categoryStats: Array<{ category, suppliersCount, proposalsCount }>
  },
  recentQuotes: Array<Quote>
}
```

### 📱 Comportamento Responsivo

**Desktop (>1024px):**
- KPIs: 4 colunas
- Financeiro: 3 colunas
- Estatísticas: 2 colunas
- Gráficos: 2 colunas
- Categorias: 3 colunas

**Tablet (768px - 1024px):**
- KPIs: 4 colunas
- Financeiro: 3 colunas
- Estatísticas: 1 coluna
- Gráficos: 1 coluna
- Categorias: 2 colunas

**Mobile (<768px):**
- Tudo em 1 coluna
- Cards ocupam largura total
- Scroll vertical
- Padding reduzido (px-4)

---

## 3. COTAÇÕES

### 🎯 Objetivo
Gerenciar todas as cotações do sistema: listar, filtrar, buscar e visualizar status das cotações criadas via WhatsApp.

### 📐 Layout e Estrutura

#### Header com Ações
```
┌─────────────────────────────────────────────────────────┐
│ Cotações                            [+ Nova Cotação]    │
│ Gerencie as cotações do sistema                        │
└─────────────────────────────────────────────────────────┘
```

**Especificações:**
- Container: `flex justify-between items-center mb-6`
- Título: `text-2xl font-medium text-foreground`
- Botão: `variant="default" size="default"`, ícone Plus 14px

#### Barra de Filtros e Busca
```
┌─────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔍 Buscar por produto, produtor...                  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [Status ▼] [Categoria ▼] [Período ▼] [Limpar filtros] │
└─────────────────────────────────────────────────────────┘
```

**Input de Busca:**
- Container: `relative w-full md:w-96`
- Input: `pl-9 pr-3 py-2 text-sm bg-background border-0.5 rounded-md`
- Ícone Search: Posição absolute left-3, `w-4 h-4 text-muted-foreground`
- Placeholder: "Buscar por produto, produtor, ID..."

**Dropdowns de Filtro:**
- Layout: `flex flex-wrap gap-2 mt-3`
- Select: `h-9 text-sm border-0.5 rounded-md px-3`
- Opções:
  - **Status**: Todos, Pendente, Coletando, Fechada, Expirada
  - **Categoria**: Todas, Ração, Fertilizante, Defensivo, Sementes, etc
  - **Período**: Hoje, Última semana, Último mês, Personalizado

**Botão Limpar:**
- `variant="ghost" size="sm"`
- Texto: "Limpar filtros"
- Ícone X: `w-3.5 h-3.5`

#### Lista de Cotações (Cards)

```
┌────────────────────────────────────────────────────────┐
│ [ID: #1234]                                   [Ativo]  │
│                                                        │
│ Ração para Gado                                        │
│ 50 sacas • Ração                                       │
│                                                        │
│ 📍 João Silva                    📅 01/04/2026 14:32  │
│ 💰 3 propostas recebidas         ⏱️  Expira em 1h     │
│                                                        │
│                        [Ver Detalhes →]               │
└────────────────────────────────────────────────────────┘
```

**Card de Cotação - Estrutura:**
```tsx
<Card className="hover:bg-secondary/50 transition-colors cursor-pointer">
  <CardHeader className="pb-3">
    <div className="flex justify-between items-start">
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">ID: #1234</span>
        <CardTitle className="text-base font-medium">Ração para Gado</CardTitle>
        <p className="text-sm text-muted-foreground">
          50 sacas • Ração
        </p>
      </div>
      <Badge variant="warning">Coletando</Badge>
    </div>
  </CardHeader>
  
  <CardContent>
    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <User className="w-3.5 h-3.5" />
        <span>João Silva</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5" />
        <span>01/04/2026 14:32</span>
      </div>
      <div className="flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5" />
        <span>3 propostas recebidas</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        <span>Expira em 1h 23min</span>
      </div>
    </div>
    
    <Button 
      variant="ghost" 
      size="sm" 
      className="w-full mt-3"
    >
      Ver Detalhes
      <ArrowRight className="w-3.5 h-3.5 ml-1" />
    </Button>
  </CardContent>
</Card>
```

**Grid de Cards:**
- Layout: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Responsivo: 1 coluna mobile, 2 tablet, 3 desktop

#### Paginação
```
┌────────────────────────────────────────────────────────┐
│             [←] Página 2 de 15 [→]                    │
│             Mostrando 21-40 de 450 resultados          │
└────────────────────────────────────────────────────────┘
```

**Especificações:**
- Container: `flex justify-between items-center mt-6 pt-4 border-t border-border`
- Botões: `variant="outline" size="sm"`, ícones ChevronLeft/Right
- Texto: `text-sm text-muted-foreground`
- Desabilitar botões nos extremos

#### Empty State
```
┌────────────────────────────────────────────────────────┐
│                     📋                                 │
│            Nenhuma cotação encontrada                  │
│                                                        │
│  Ainda não há cotações cadastradas no sistema.         │
│  As cotações são criadas automaticamente via WhatsApp. │
│                                                        │
│              [+ Nova Cotação Manual]                   │
└────────────────────────────────────────────────────────┘
```

### 🔄 Estados e Comportamentos

#### Loading
- Skeleton cards (3-6 placeholders)
- Shimmer effect
- Filtros desabilitados

#### Filtragem em Tempo Real
- Debounce de 500ms na busca
- Filtros aplicam imediatamente
- URL params persistem filtros
- Ex: `/quotes?status=COLLECTING&category=RACAO`

#### Atualização Automática
- Polling a cada 30 segundos
- Apenas quando tab ativa
- Indicador discreto: "Atualizado há 15s"

#### Estados de Badge (Status)
- PENDING: `variant="default"` - Cinza
- COLLECTING: `variant="warning"` - Amarelo
- SUMMARIZED: `variant="info"` - Azul
- CLOSED: `variant="success"` - Verde
- EXPIRED: `variant="error"` - Vermelho

### 🎨 Interações

1. **Click no Card:**
   - Navega para `/quotes/:id`
   - Mostra detalhes e propostas

2. **Busca:**
   - Filtra por: produto, ID, nome do produtor
   - Case-insensitive
   - Busca parcial (LIKE)

3. **Filtros:**
   - Combinam entre si (AND logic)
   - Persistem na URL
   - Sincronizam com backend

4. **Nova Cotação Manual:**
   - Abre modal/formulário
   - Campos: Produtor, Produto, Quantidade, Unidade, Categoria
   - Valida campos obrigatórios

5. **Hover:**
   - Card: `bg-secondary/50`
   - Botões: Conforme variant

### ✅ Critérios de Aceite

**Listagem:**
- [ ] Carrega todas as cotações paginadas
- [ ] Ordenação: Mais recentes primeiro
- [ ] Limite de 20 itens por página
- [ ] Paginação funcional
- [ ] Skeleton loading durante carregamento

**Busca:**
- [ ] Busca por produto (parcial, case-insensitive)
- [ ] Busca por nome do produtor
- [ ] Busca por ID da cotação
- [ ] Debounce de 500ms
- [ ] Limpa resultados ao limpar busca

**Filtros:**
- [ ] Filtro por status funciona
- [ ] Filtro por categoria funciona
- [ ] Filtro por período funciona
- [ ] Filtros combinam (AND logic)
- [ ] Botão "Limpar filtros" reseta todos

**Visual:**
- [ ] Cards com design Clean Minimal
- [ ] Badges coloridos conforme status
- [ ] Ícones com tamanho 3.5px consistente
- [ ] Responsivo (1/2/3 colunas)
- [ ] Hover states aplicados

**Funcional:**
- [ ] Click no card navega para detalhes
- [ ] Botão "Nova Cotação" abre formulário
- [ ] Paginação atualiza URL
- [ ] Empty state quando sem resultados
- [ ] Error state quando falha

### 🔐 Regras de Negócio

**Listagem:**
- Apenas cotações do sistema (não filtrar por usuário)
- Admin vê todas
- Operador vê conforme permissões
- Ordenar por: created_at DESC

**Status:**
- PENDING: Criada, aguardando disparo
- COLLECTING: Enviada para fornecedores, aguardando propostas
- SUMMARIZED: Propostas recebidas, aguardando decisão
- CLOSED: Fechada com fornecedor vencedor
- EXPIRED: Tempo limite expirou (default: 2h)

**Expiração:**
- Cálculo: created_at + QUOTE_EXPIRY_MINUTES
- Exibir countdown: "Expira em 1h 23min"
- Quando expirada: Status muda para EXPIRED
- Job Cron verifica a cada 5 minutos

**Nova Cotação Manual:**
- Campos obrigatórios: Produtor, Produto, Quantidade, Categoria
- Campos opcionais: Observações, Prazo de entrega
- Validações:
  - Produtor deve existir
  - Quantidade > 0
  - Categoria válida
- Após criar: Redireciona para detalhes

**Permissões:**
- VIEW: Pode listar e ver detalhes
- CREATE: Pode criar cotação manual
- EDIT: Não aplicável (cotações via WhatsApp)
- DELETE: Pode cancelar cotação (muda status)

### 📊 Query e Performance

**Endpoint:**
```typescript
GET /api/quotes?page=1&limit=20&status=COLLECTING&search=racao&category=RACAO&startDate=2026-04-01

Response: {
  data: Array<Quote>,
  pagination: {
    page: 1,
    limit: 20,
    total: 450,
    totalPages: 23
  }
}
```

**Otimizações:**
- Índices: status, category, created_at
- Eager loading: producer, proposals (count)
- Cache de 30s para lista
- Pagination limit máximo: 50

**Cálculos:**
- Total de propostas: COUNT(proposals)
- Tempo até expirar: (created_at + expiry) - NOW()
- Melhor proposta: MIN(proposals.price)

### 📱 Comportamento Responsivo

**Desktop (>1024px):**
- 3 colunas de cards
- Busca: 384px largura
- Filtros: Inline horizontal

**Tablet (768px - 1024px):**
- 2 colunas de cards
- Busca: Largura total
- Filtros: Inline horizontal

**Mobile (<768px):**
- 1 coluna de cards
- Busca: Largura total
- Filtros: Stack vertical
- Botão "Nova Cotação": Fixed bottom (opcional)

---

**[CONTINUA... Especificações das próximas telas: Detalhe da Cotação, Produtores, Fornecedores, Assinaturas, Usuários]**

---

Este documento continua com o mesmo nível de detalhamento para todas as telas restantes. Deseja que eu continue com as próximas especificações?
