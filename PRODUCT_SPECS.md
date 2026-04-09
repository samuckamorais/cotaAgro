# FarmFlow - Especificações de Produto

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
FarmFlow é uma plataforma B2B que automatiza o processo de cotação agrícola via WhatsApp, conectando produtores rurais a fornecedores de insumos, ração, fertilizantes e outros produtos agrícolas.

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
│    FarmFlow     │  ← Título: text-2xl, font-medium
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
│  admin@farmflow.com / Farmflow0147*   │
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

## 7. ASSINATURAS

### 🎯 Objetivo
Gerenciar planos de assinatura dos produtores: visualizar status, alterar planos, renovar assinaturas e controlar limites de cotações mensais. Monetização principal da plataforma.

### 📐 Layout e Estrutura

#### Header da Página
```
┌─────────────────────────────────────────────────────────────┐
│  Assinaturas                                                │
│  Gerencie planos e cobranças dos produtores                 │
└─────────────────────────────────────────────────────────────┘
```
- Título: `text-2xl`, `font-medium`, `text-foreground`
- Descrição: `text-sm`, `text-muted-foreground`, `mt-1`
- Espaçamento: `mb-6`

#### KPIs de Assinaturas (4 colunas)
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Assinaturas  │ Receita      │ Taxa de      │ Cancelamentos│
│ Ativas       │ Mensal       │ Renovação    │ Este Mês     │
│              │              │              │              │
│   [42]       │  R$ 12.400   │   [94%]      │   [3]        │
│ produtores   │ recorrente   │ renovações   │ produtores   │
│ com plano    │ este mês     │ automáticas  │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Card KPI - Especificações:**
- Grid: `grid-cols-1 md:grid-cols-4 gap-3`
- Card: Mesmas especificações do Dashboard
- Ícone: `w-3.5 h-3.5 text-muted-foreground`
- Métrica: `text-2xl font-medium text-foreground`
- Label: `text-xs text-muted-foreground mt-1`

#### Distribuição por Plano (3 colunas)
```
┌───────────────────┬───────────────────┬───────────────────┐
│     BASIC         │       PRO         │    ENTERPRISE     │
│                   │                   │                   │
│   12 assinantes   │   24 assinantes   │    6 assinantes   │
│ R$ 79/mês         │ R$ 149/mês        │ R$ 299/mês        │
│ 20 cotações/mês   │ 100 cotações/mês  │ ilimitado         │
│                   │                   │                   │
│ [Ver Detalhes]    │ [Ver Detalhes]    │ [Ver Detalhes]    │
└───────────────────┴───────────────────┴───────────────────┘
```

**Card de Plano:**
```tsx
<Card className="hover:bg-secondary/50 transition-colors">
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between mb-2">
      <Badge variant="default" className="text-xs">BASIC</Badge>
      <span className="text-xs text-muted-foreground">12 assinantes</span>
    </div>
    <CardTitle className="text-xl font-medium text-primary">
      R$ 79<span className="text-sm text-muted-foreground">/mês</span>
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center gap-1.5">
        <CheckCircle className="w-3.5 h-3.5 text-primary" />
        <span>20 cotações por mês</span>
      </div>
      <div className="flex items-center gap-1.5">
        <CheckCircle className="w-3.5 h-3.5 text-primary" />
        <span>Rede de fornecedores</span>
      </div>
      <div className="flex items-center gap-1.5">
        <CheckCircle className="w-3.5 h-3.5 text-primary" />
        <span>Suporte via WhatsApp</span>
      </div>
    </div>
    <Button variant="outline" size="sm" className="w-full">
      Ver Detalhes
    </Button>
  </CardContent>
</Card>
```

**Grid:** `grid-cols-1 md:grid-cols-3 gap-4`

#### Filtros e Busca
```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔍 Buscar por produtor, CPF/CNPJ...                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Status ▼] [Plano ▼] [Período ▼] [Limpar filtros]         │
└─────────────────────────────────────────────────────────────┘
```

**Dropdowns de Filtro:**
- **Status**: Todos, Ativa, Trial, Expirada, Cancelada
- **Plano**: Todos, Basic, Pro, Enterprise
- **Período**: Todos, Vence em 7 dias, Vence em 30 dias, Expiradas

#### Lista de Assinaturas (Grid de Cards)

```
┌────────────────────────────────────────────────────────────┐
│ João Silva                                        [✓ Ativa]│
│ CPF: 123.456.789-00                                        │
│                                                            │
│ ┌──────────────┐  Fazenda Santa Maria • Rio Verde/GO     │
│ │    PRO       │  +55 64 99999-9999                       │
│ │  R$ 149/mês  │                                          │
│ └──────────────┘  📊 Uso: 45/100 cotações (45%)          │
│                   ██████████░░░░░░░░░░                    │
│                                                            │
│ 📅 Início: 01/01/2026    🔄 Renovação: 01/05/2026        │
│                                                            │
│ [Editar Plano] [Renovar] [Cancelar]                       │
└────────────────────────────────────────────────────────────┘
```

**Card de Assinatura - Estrutura Completa:**
```tsx
<Card className="hover:bg-secondary/50 transition-colors">
  <CardHeader className="pb-3">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <CardTitle className="text-base font-medium">João Silva</CardTitle>
          <Badge variant="success" className="text-xs gap-1">
            <CheckCircle className="w-3 h-3" />
            Ativa
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          CPF: 123.456.789-00
        </p>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Edit className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  </CardHeader>

  <CardContent className="space-y-3">
    {/* Plano atual */}
    <div className="flex items-start gap-3">
      <div className="bg-primary/10 text-primary px-3 py-2 rounded-md">
        <div className="text-xs font-normal">PRO</div>
        <div className="text-sm font-medium">R$ 149/mês</div>
      </div>
      <div className="flex-1 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          <span>Fazenda Santa Maria</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          <span>Rio Verde/GO</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5" />
          <span>+55 64 99999-9999</span>
        </div>
      </div>
    </div>

    {/* Uso de cotações */}
    <div className="pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">Uso mensal</span>
        <span className="text-xs font-normal text-foreground">45/100 cotações</span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div 
          className="bg-primary h-1.5 rounded-full transition-all"
          style={{ width: '45%' }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">45% utilizado</p>
    </div>

    {/* Datas */}
    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Calendar className="w-3.5 h-3.5" />
        <div>
          <span className="text-xs text-muted-foreground">Início</span>
          <p className="text-xs font-normal text-foreground">01/01/2026</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <RefreshCw className="w-3.5 h-3.5" />
        <div>
          <span className="text-xs text-muted-foreground">Renovação</span>
          <p className="text-xs font-normal text-foreground">01/05/2026</p>
        </div>
      </div>
    </div>

    {/* Ações */}
    <div className="flex gap-2 pt-3 border-t border-border">
      <Button variant="outline" size="sm" className="flex-1 gap-1.5">
        <Edit className="w-3.5 h-3.5" />
        Editar Plano
      </Button>
      <Button variant="outline" size="sm" className="flex-1 gap-1.5">
        <RefreshCw className="w-3.5 h-3.5" />
        Renovar
      </Button>
    </div>
  </CardContent>
</Card>
```

**Grid:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

#### Estados Visuais do Badge

**Status da Assinatura:**
- **Ativa**: `variant="success"`, ícone CheckCircle, verde
- **Trial**: `variant="info"`, ícone Clock, azul
- **Expirada**: `variant="error"`, ícone XCircle, vermelho
- **Cancelada**: `variant="outline"`, ícone Ban, cinza

**Alertas de Renovação:**
```
┌────────────────────────────────────────────────────────────┐
│ ⚠️  Renovação em 3 dias                                    │
│ Esta assinatura vence em 04/04/2026. Contate o produtor.  │
└────────────────────────────────────────────────────────────┘
```
- Aparece no card quando: `endDate - NOW() <= 7 days`
- Container: `bg-warning-bg`, `border-0.5`, `border-warning`, `p-2`, `rounded-md`, `text-xs`

#### Paginação
```
┌────────────────────────────────────────────────────────────┐
│ Página 1 de 5 • Mostrando 1-15 de 42 assinaturas          │
│                     [← Anterior] [Próxima →]               │
└────────────────────────────────────────────────────────────┘
```

**Especificações:** Mesmas da tela de Cotações

#### Empty State
```
┌────────────────────────────────────────────────────────────┐
│                         💳                                 │
│              Nenhuma assinatura ativa                      │
│                                                            │
│  Quando produtores criarem suas primeiras cotações,       │
│  as assinaturas aparecerão aqui automaticamente.          │
└────────────────────────────────────────────────────────────┘
```

### 🔄 Estados e Comportamentos

#### Loading State
- Skeleton cards (3-6 placeholders)
- KPIs com shimmer effect
- Desabilitar filtros durante loading

#### Filtragem em Tempo Real
- Debounce de 500ms na busca
- Filtros aplicam imediatamente
- URL params persistem filtros: `/subscriptions?status=ACTIVE&plan=PRO`

#### Atualização de Uso de Cotações
- Polling a cada 60 segundos
- Atualiza apenas o campo `quotesUsed/quotesLimit`
- Progress bar com animação suave

#### Alertas Contextuais

**90% do limite usado:**
```
┌────────────────────────────────────────────────────────────┐
│ 📊 Uso: 90/100 cotações (90%)                              │
│ ██████████████████░░                                       │
│ ⚠️  Produtor está próximo do limite mensal.               │
└────────────────────────────────────────────────────────────┘
```

**100% do limite usado:**
```
┌────────────────────────────────────────────────────────────┐
│ 📊 Uso: 100/100 cotações (100%)                            │
│ ████████████████████                                       │
│ 🚫 Limite mensal atingido. Upgrade ou aguarde renovação.  │
└────────────────────────────────────────────────────────────┘
```

**Trial expirando:**
```
┌────────────────────────────────────────────────────────────┐
│ 🕐 TRIAL - Expira em 2 dias                                │
│ Contate o produtor para conversão em plano pago.          │
└────────────────────────────────────────────────────────────┘
```

### 🎨 Interações

#### 1. Editar Plano (Modal)
```
┌────────────────────────────────────────────────────────┐
│  Editar Plano de Assinatura                           │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Produtor: João Silva                                 │
│  Plano Atual: PRO (R$ 149/mês)                        │
│                                                        │
│  Novo Plano:                                          │
│  ○ BASIC    - R$ 79/mês  - 20 cotações/mês           │
│  ● PRO      - R$ 149/mês - 100 cotações/mês          │
│  ○ ENTERPRISE - R$ 299/mês - ilimitado               │
│                                                        │
│  Data de Início:                                      │
│  ○ Imediatamente (prorrateado)                       │
│  ○ Próxima renovação (01/05/2026)                    │
│                                                        │
│               [Cancelar] [Salvar Alterações]          │
└────────────────────────────────────────────────────────┘
```

**Validações:**
- Não permitir downgrade se `quotesUsed > novo quotesLimit`
- Calcular valor proporcional se mudança imediata
- Confirmar alteração com admin

#### 2. Renovar Assinatura (Modal)
```
┌────────────────────────────────────────────────────────┐
│  Renovar Assinatura                                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Produtor: João Silva                                 │
│  Plano: PRO (R$ 149/mês)                              │
│  Vencimento atual: 01/05/2026                         │
│                                                        │
│  Período de Renovação:                                │
│  ○ 1 mês  - R$ 149                                    │
│  ● 3 meses - R$ 424 (5% desconto)                     │
│  ○ 6 meses - R$ 805 (10% desconto)                    │
│  ○ 12 meses - R$ 1.521 (15% desconto)                 │
│                                                        │
│  Nova data de vencimento: 01/08/2026                  │
│                                                        │
│  Método de Pagamento:                                 │
│  ○ PIX                                                │
│  ○ Boleto                                             │
│  ○ Cartão de Crédito                                  │
│                                                        │
│               [Cancelar] [Confirmar Renovação]        │
└────────────────────────────────────────────────────────┘
```

#### 3. Cancelar Assinatura (Dialog de Confirmação)
```
┌────────────────────────────────────────────────────────┐
│  ⚠️  Cancelar Assinatura                              │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Tem certeza que deseja cancelar a assinatura de:    │
│                                                        │
│  • Produtor: João Silva                               │
│  • Plano: PRO (R$ 149/mês)                            │
│  • Vencimento: 01/05/2026                             │
│                                                        │
│  ⚠️  Atenção:                                         │
│  • O acesso permanece até 01/05/2026                 │
│  • Não haverá renovação automática                   │
│  • Produtor será notificado por WhatsApp             │
│                                                        │
│  Motivo do cancelamento (opcional):                  │
│  ┌──────────────────────────────────────────────┐    │
│  │                                              │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│               [Voltar] [Confirmar Cancelamento]       │
└────────────────────────────────────────────────────────┘
```

#### 4. Criar Nova Assinatura (Modal)
```
┌────────────────────────────────────────────────────────┐
│  Nova Assinatura                                      │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Produtor:                                            │
│  ┌──────────────────────────────────────────────┐    │
│  │ [Buscar produtor...] 🔍                      │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  Selecione o Plano:                                   │
│  ┌────────────┬────────────┬────────────┐            │
│  │   BASIC    │    PRO     │ ENTERPRISE │            │
│  │  R$ 79/mês │ R$ 149/mês │ R$ 299/mês │            │
│  └────────────┴────────────┴────────────┘            │
│                                                        │
│  Tipo:                                                │
│  ○ Trial (14 dias grátis)                            │
│  ● Pago                                               │
│                                                        │
│  Data de Início:                                      │
│  [📅 02/04/2026]                                      │
│                                                        │
│  Duração:                                             │
│  ○ 1 mês                                              │
│  ● 3 meses                                            │
│  ○ 6 meses                                            │
│  ○ 12 meses                                           │
│                                                        │
│               [Cancelar] [Criar Assinatura]           │
└────────────────────────────────────────────────────────┘
```

### ✅ Critérios de Aceite

**Listagem:**
- [ ] Lista todas as assinaturas com paginação (15 por página)
- [ ] Ordenação: Status (Ativa primeiro) > Renovação próxima
- [ ] KPIs carregam corretamente do backend
- [ ] Progress bar de uso atualiza em tempo real
- [ ] Skeleton loading durante carregamento

**Busca e Filtros:**
- [ ] Busca por nome do produtor (parcial, case-insensitive)
- [ ] Busca por CPF/CNPJ (apenas números)
- [ ] Filtro por status (Ativa, Trial, Expirada, Cancelada)
- [ ] Filtro por plano (Basic, Pro, Enterprise)
- [ ] Filtro por período de renovação
- [ ] Debounce de 500ms na busca
- [ ] Filtros persistem na URL

**Visual:**
- [ ] Cards com Clean Minimal Design
- [ ] Badges coloridos por status
- [ ] Progress bar com porcentagem correta
- [ ] Alertas contextuais aparecem quando aplicável
- [ ] Responsivo (1/2/3 colunas)
- [ ] Hover states aplicados

**Funcionalidades:**
- [ ] Editar plano abre modal correto
- [ ] Renovar calcula valores e descontos corretamente
- [ ] Cancelar exige confirmação e motivo opcional
- [ ] Criar nova assinatura valida campos obrigatórios
- [ ] Notificações são enviadas ao produtor (WhatsApp)

**Regras de Negócio:**
- [ ] Limite de cotações respeitado (bloqueia novas cotações)
- [ ] Trial expira após 14 dias automaticamente
- [ ] Renovação automática se configurada
- [ ] Downgrades só permitem se quotesUsed <= novo quotesLimit
- [ ] Cálculo proporcional em mudanças de plano

### 🔐 Regras de Negócio

#### Planos e Preços

**BASIC:**
- Preço: R$ 79/mês
- Limite: 20 cotações/mês
- Rede: Fornecedores da plataforma
- Suporte: Via WhatsApp
- Target: Pequenos produtores

**PRO:**
- Preço: R$ 149/mês
- Limite: 100 cotações/mês
- Rede: Fornecedores da plataforma + próprios fornecedores
- Suporte: Prioritário via WhatsApp
- Target: Médios produtores

**ENTERPRISE:**
- Preço: R$ 299/mês
- Limite: Ilimitado
- Rede: Fornecedores da plataforma + próprios fornecedores
- Suporte: Dedicado (WhatsApp + telefone)
- Gestor de conta dedicado
- Target: Grandes produtores / Cooperativas

#### Descontos por Período

- **1 mês**: Preço cheio
- **3 meses**: 5% desconto
- **6 meses**: 10% desconto
- **12 meses**: 15% desconto

Cálculo: `(precoMensal × meses) × (1 - desconto)`

#### Trial

- Duração: 14 dias
- Limite: 10 cotações (independente do plano escolhido)
- Sem cobrança
- Conversão: Manual (admin contata produtor)
- Expiração: Status muda para EXPIRED, bloqueia novas cotações

#### Renovação

**Automática:**
- 3 dias antes do vencimento, notifica produtor via WhatsApp
- Se configurado pagamento recorrente: renova automaticamente
- Atualiza `endDate` e reseta `quotesUsed = 0`

**Manual:**
- Admin pode renovar antecipadamente
- Gera cobrança (PIX, Boleto ou Cartão)
- Envia link de pagamento ao produtor

#### Limites e Bloqueios

**Quando atingir limite:**
- Bloqueia criação de novas cotações via WhatsApp
- Mensagem ao produtor: "Você atingiu o limite de X cotações do plano [PLANO]. Faça upgrade ou aguarde a renovação em [DATA]."
- Admin pode: Resetar contador manualmente (emergência) ou fazer upgrade

**Quando expirar:**
- Status muda para EXPIRED
- Bloqueia novas cotações
- Cotações em andamento continuam
- Propostas existentes ainda visíveis (read-only)
- Mensagem: "Sua assinatura expirou. Renove para continuar criando cotações."

#### Upgrade/Downgrade

**Upgrade (ex: BASIC → PRO):**
- Mudança imediata
- Calcula valor proporcional dos dias restantes
- Aumenta `quotesLimit` imediatamente
- Mantém `quotesUsed` atual

**Downgrade (ex: PRO → BASIC):**
- Validação: `quotesUsed <= novo quotesLimit`
- Se falhar: Bloqueia downgrade até próxima renovação
- Mudança: Apenas na próxima renovação (não imediata)
- Aviso ao produtor

#### Cancelamento

**Cancelamento imediato:**
- Admin pode forçar cancelamento
- Bloqueia acesso imediatamente
- Reembolso proporcional (se aplicável)

**Cancelamento ao final do período:**
- Acesso permanece até `endDate`
- `active = false` mas ainda funcional
- Não renova automaticamente
- Produtor notificado

#### Notificações WhatsApp

**Eventos que geram notificação:**
1. Nova assinatura criada (boas-vindas)
2. Trial iniciado (instruções de uso)
3. 7 dias antes da renovação (lembrete)
4. 3 dias antes da renovação (urgente)
5. Renovação concluída (confirmação)
6. Limite de 80% atingido (alerta)
7. Limite de 100% atingido (bloqueio)
8. Assinatura expirada (renovação necessária)
9. Upgrade/Downgrade confirmado
10. Cancelamento confirmado

#### Permissões

**Admin:**
- Ver todas as assinaturas
- Criar nova assinatura
- Editar plano
- Renovar
- Cancelar
- Resetar contador de cotações

**Operador com permissão SUBSCRIPTIONS:**
- `canView`: Ver lista e detalhes
- `canCreate`: Criar nova assinatura
- `canEdit`: Editar plano e renovar
- `canDelete`: Cancelar assinatura

### 📊 Query e Performance

**Endpoint Principal:**
```typescript
GET /api/subscriptions?page=1&limit=15&status=ACTIVE&plan=PRO&search=joao

Response: {
  data: Array<{
    id: string;
    producer: {
      id: string;
      name: string;
      cpfCnpj: string;
      phone: string;
      city: string;
      farm: string;
    };
    plan: 'BASIC' | 'PRO' | 'ENTERPRISE';
    quotesLimit: number;
    quotesUsed: number;
    startDate: string; // ISO
    endDate: string;   // ISO
    active: boolean;
    daysUntilRenewal: number; // calculado
    usagePercentage: number;  // (quotesUsed / quotesLimit) × 100
  }>;
  pagination: {
    page: 1,
    limit: 15,
    total: 42,
    totalPages: 3
  };
  stats: {
    activeSubscriptions: 42;
    monthlyRevenue: 12400;    // soma de todos os planos ativos
    renewalRate: 94;          // % de renovações automáticas
    cancellationsThisMonth: 3;
    planDistribution: {
      BASIC: 12,
      PRO: 24,
      ENTERPRISE: 6
    };
  }
}
```

**Endpoints Adicionais:**
```typescript
// Criar assinatura
POST /api/subscriptions
Body: {
  producerId: string;
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE';
  duration: 1 | 3 | 6 | 12; // meses
  startDate: string;
  isTrial: boolean;
}

// Editar plano
PATCH /api/subscriptions/:id/plan
Body: {
  newPlan: 'BASIC' | 'PRO' | 'ENTERPRISE';
  applyImmediately: boolean; // true = agora com proporcional, false = próxima renovação
}

// Renovar
POST /api/subscriptions/:id/renew
Body: {
  duration: 1 | 3 | 6 | 12;
  paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
}

// Cancelar
POST /api/subscriptions/:id/cancel
Body: {
  immediate: boolean;
  reason?: string;
}

// Resetar contador (emergência)
POST /api/subscriptions/:id/reset-quota
```

**Otimizações:**
- Índices: `producerId`, `active`, `endDate`, `plan`
- Eager loading: `producer` data
- Cache de 60s para stats
- Cálculos: `daysUntilRenewal` e `usagePercentage` no backend

**Job Cron (diário, 00:00):**
```typescript
// Verifica assinaturas expiradas
UPDATE subscriptions 
SET active = false, status = 'EXPIRED'
WHERE endDate < NOW() AND active = true;

// Envia lembretes de renovação
SELECT * FROM subscriptions 
WHERE active = true 
AND endDate BETWEEN NOW() AND NOW() + INTERVAL '7 days'
→ Envia WhatsApp notification

// Renovações automáticas (se configurado)
UPDATE subscriptions
SET endDate = endDate + INTERVAL '30 days',
    quotesUsed = 0
WHERE active = true 
AND endDate <= NOW() + INTERVAL '3 days'
AND autoRenew = true;
```

### 📱 Comportamento Responsivo

**Desktop (>1024px):**
- KPIs: 4 colunas
- Planos: 3 colunas
- Assinaturas: 3 colunas

**Tablet (768px - 1024px):**
- KPIs: 4 colunas
- Planos: 3 colunas
- Assinaturas: 2 colunas

**Mobile (<768px):**
- Tudo em 1 coluna
- Filtros stack vertical
- Progress bar sempre visível
- Botões de ação empilhados

### ♿ Acessibilidade

- Labels descritivos em todos os campos
- ARIA labels em progress bars: "45 de 100 cotações utilizadas"
- Focus trap em modais
- Escape fecha modais
- Mensagens de erro anunciadas
- Contraste WCAG AA em badges de status

---

**[FIM DAS ESPECIFICAÇÕES DA TELA DE ASSINATURAS]**

---

Este documento continua com o mesmo nível de detalhamento para todas as telas restantes. Deseja que eu continue com as próximas especificações?
