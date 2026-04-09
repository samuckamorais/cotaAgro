# FarmFlow - Implementação de Melhorias UX WhatsApp
## Especificações Técnicas - Prioridade 1 (Quick Wins)

**Desenvolvedor:** Guia de Implementação  
**Data:** 02/04/2026  
**Estimativa Total:** 1-2 semanas  
**Impacto Esperado:** +67% taxa de conclusão (30% → 50%)

---

## 📋 Índice

1. [P1.1 - Onboarding Personalizado](#p11---onboarding-personalizado)
2. [P1.2 - NLU Full Flow](#p12---nlu-full-flow)
3. [P1.3 - Indicadores de Progresso](#p13---indicadores-de-progresso)
4. [P1.4 - Botões Nativos WhatsApp](#p14---botões-nativos-whatsapp)
5. [Ordem de Implementação](#ordem-de-implementação)
6. [Testes e Validação](#testes-e-validação)

---

## P1.1 - Onboarding Personalizado

### 🎯 Objetivo
Substituir mensagem de boas-vindas genérica por onboarding personalizado que usa o nome do produtor e apresenta value proposition claro.

### 📊 Impacto
- **Taxa de primeira resposta:** 40% → 70% (+75%)
- **Esforço:** 2 dias
- **Complexidade:** Baixa

---

### 🔧 Implementação

#### **Arquivo 1:** `backend/src/flows/messages.ts`

**Localização:** Linha 11-20

**❌ Código Atual:**
```typescript
WELCOME: `Olá! 👋 Bem-vindo ao *FarmFlow*!

Sou seu assistente de cotações de insumos agrícolas.

Para começar, envie:
• *1* ou *nova cotação* - Solicitar cotação
• *2* ou *cadastrar fornecedor* - Adicionar fornecedor
• *ajuda* - Ver instruções

Como posso ajudar?`,
```

**✅ Código Proposto:**
```typescript
WELCOME: (producerName: string) => `Olá ${producerName}! 👋 Bem-vindo ao *FarmFlow*

💡 *Economize até 5 horas por semana* em cotações de insumos agrícolas.

Vou te ajudar a encontrar os melhores preços de forma rápida e automática!

🚀 Pronto para sua primeira cotação?
• *1* ou *começar* - Solicitar cotação
• *2* ou *fornecedor* - Adicionar fornecedor
• *ajuda* - Ver como funciona`,
```

**Observação:** Transformar `WELCOME` de string para função que recebe `producerName`.

---

#### **Arquivo 2:** `backend/src/flows/producer.flow.ts`

**Localização:** Linha 206-209

**❌ Código Atual:**
```typescript
// Mensagem padrão
await whatsappService.sendMessage({
  to: phone,
  body: Messages.WELCOME,
});
```

**✅ Código Proposto:**
```typescript
// Buscar nome do produtor
const producer = await prisma.producer.findUniqueOrThrow({
  where: { id: producerId },
});

// Mensagem personalizada
await whatsappService.sendMessage({
  to: phone,
  body: Messages.WELCOME(producer.name),
});
```

**Mudanças:**
1. Adicionar query ao banco para buscar `producer.name`
2. Passar nome como parâmetro para `Messages.WELCOME()`

---

#### **Arquivo 3:** `backend/src/flows/producer.flow.ts`

**Localização:** Linha 122-210 (método `handleIdle`)

**Otimização Adicional:** Já que estamos buscando o `producer`, podemos reutilizar em outras partes do método.

**✅ Código Otimizado (início do método):**
```typescript
private async handleIdle(
  producerId: string,
  phone: string,
  message: string,
  nluResult?: NLUResult
): Promise<void> {
  // Buscar dados do produtor uma única vez
  const producer = await prisma.producer.findUniqueOrThrow({
    where: { id: producerId },
    include: { subscription: true }, // já incluir subscription para checar quotas
  });

  const normalized = message.toLowerCase().trim();

  // ... resto do código
```

**Benefício:** Evita múltiplas queries ao banco no mesmo método.

---

### 📦 Dependências
- Nenhuma dependência externa necessária
- Apenas refatoração de código existente

---

### ✅ Checklist de Implementação

- [ ] Modificar `Messages.WELCOME` para função com parâmetro `producerName`
- [ ] Atualizar chamada em `handleIdle()` para buscar `producer.name`
- [ ] Otimizar query para incluir `subscription` no mesmo fetch
- [ ] Testar com produtor existente no banco
- [ ] Verificar que nome aparece corretamente na mensagem
- [ ] Adicionar fallback se `producer.name` estiver vazio: `"Olá! 👋"` (sem nome)

---

### 🧪 Testes

**Teste 1: Nome Presente**
```typescript
// Input
producerId = "abc123"
producer.name = "João Silva"

// Expected Output
"Olá João Silva! 👋 Bem-vindo ao *FarmFlow*..."
```

**Teste 2: Nome Ausente**
```typescript
// Input
producerId = "abc123"
producer.name = null

// Expected Output
"Olá! 👋 Bem-vindo ao *FarmFlow*..." (sem nome)
```

---

## P1.2 - NLU Full Flow

### 🎯 Objetivo
Usar GPT-4 NLU em **todos os estados**, não apenas no IDLE. Extrair múltiplos dados de uma única mensagem para reduzir número de trocas.

### 📊 Impacto
- **Mensagens trocadas:** 10 → 4-5 (-60%)
- **Taxa de conclusão:** 30% → 50% (+67%)
- **Tempo médio:** 5min → 2min (-60%)
- **Esforço:** 5 dias
- **Complexidade:** Média

---

### 🔧 Implementação

#### **Passo 1: Criar Serviço de Extração de Entidades**

**Novo Arquivo:** `backend/src/services/nlu-extractor.service.ts`

```typescript
import { openaiService } from './openai.service';
import { ConversationContext, ProducerState } from '../types';

/**
 * Serviço para extrair múltiplas entidades de mensagens do usuário
 */
export class NLUExtractorService {
  /**
   * Extrai todas as entidades possíveis de uma mensagem
   */
  async extractEntities(
    message: string,
    currentState: ProducerState,
    context: ConversationContext
  ): Promise<Partial<ConversationContext>> {
    const prompt = this.buildExtractionPrompt(message, currentState, context);
    
    const response = await openaiService.chat([
      {
        role: 'system',
        content: 'Você é um assistente especializado em extrair dados de cotações agrícolas.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);

    return this.parseResponse(response);
  }

  /**
   * Constrói prompt contextualizado baseado no estado atual
   */
  private buildExtractionPrompt(
    message: string,
    currentState: ProducerState,
    context: ConversationContext
  ): string {
    let prompt = `Extraia TODOS os dados possíveis da seguinte mensagem:\n\n"${message}"\n\n`;
    
    prompt += `Contexto atual:\n`;
    prompt += `- Estado: ${currentState}\n`;
    if (context.product) prompt += `- Produto já definido: ${context.product}\n`;
    if (context.quantity) prompt += `- Quantidade já definida: ${context.quantity}\n`;
    if (context.region) prompt += `- Região já definida: ${context.region}\n`;
    
    prompt += `\nExtraia (se presente na mensagem):\n`;
    prompt += `1. Produto (nome do insumo agrícola)\n`;
    prompt += `2. Quantidade (número + unidade: sacas, kg, litros, etc)\n`;
    prompt += `3. Região/cidade de entrega\n`;
    prompt += `4. Prazo de entrega (data ou "em X dias")\n`;
    prompt += `5. Observações adicionais\n`;
    
    prompt += `\nRetorne APENAS um JSON válido no formato:\n`;
    prompt += `{\n`;
    prompt += `  "product": "ração para gado" ou null,\n`;
    prompt += `  "quantity": "100" ou null,\n`;
    prompt += `  "unit": "sacas" ou null,\n`;
    prompt += `  "region": "Rio Verde" ou null,\n`;
    prompt += `  "deadline": "2026-04-05" ou null,\n`;
    prompt += `  "observations": "preferência marca X" ou null\n`;
    prompt += `}\n\n`;
    prompt += `Se algum dado não estiver na mensagem, use null.`;
    
    return prompt;
  }

  /**
   * Parseia resposta do GPT-4 para objeto tipado
   */
  private parseResponse(response: string): Partial<ConversationContext> {
    try {
      // Limpar possível markdown
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      return {
        product: parsed.product || undefined,
        quantity: parsed.quantity || undefined,
        unit: parsed.unit || undefined,
        region: parsed.region || undefined,
        deadline: parsed.deadline || undefined,
        observations: parsed.observations || undefined,
      };
    } catch (error) {
      console.error('Failed to parse NLU response', { error, response });
      return {};
    }
  }

  /**
   * Determina próximo estado baseado nos dados extraídos
   */
  determineNextState(
    context: ConversationContext,
    extracted: Partial<ConversationContext>
  ): ProducerState {
    // Merge dos dados
    const merged = { ...context, ...extracted };

    // Lógica de próximo estado
    if (!merged.product) return 'AWAITING_PRODUCT';
    if (!merged.quantity) return 'AWAITING_QUANTITY';
    if (!merged.region) return 'AWAITING_REGION';
    if (!merged.deadline) return 'AWAITING_DEADLINE';
    
    // Pular observações (opcional) e ir direto para escopo
    return 'AWAITING_SUPPLIER_SCOPE';
  }
}

export const nluExtractorService = new NLUExtractorService();
```

---

#### **Passo 2: Modificar Fluxo do Produtor**

**Arquivo:** `backend/src/flows/producer.flow.ts`

**Localização:** Linhas 215-239 (método `handleAwaitingProduct`)

**❌ Código Atual:**
```typescript
private async handleAwaitingProduct(
  producerId: string,
  phone: string,
  message: string,
  context: ConversationContext
): Promise<void> {
  const product = message.trim();

  if (product.length < 2) {
    await whatsappService.sendMessage({
      to: phone,
      body: 'Por favor, informe um produto válido (mínimo 2 caracteres).',
    });
    return;
  }

  context.product = product;

  await whatsappService.sendMessage({
    to: phone,
    body: Messages.ASK_QUANTITY(product),
  });

  await this.setState(producerId, 'producer', 'AWAITING_QUANTITY', context);
}
```

**✅ Código Proposto com NLU:**
```typescript
private async handleAwaitingProduct(
  producerId: string,
  phone: string,
  message: string,
  context: ConversationContext
): Promise<void> {
  // Usar NLU para extrair múltiplas entidades
  const extracted = await nluExtractorService.extractEntities(
    message,
    'AWAITING_PRODUCT',
    context
  );

  // Merge dos dados extraídos
  Object.assign(context, extracted);

  // Validação mínima
  if (!context.product || context.product.length < 2) {
    await whatsappService.sendMessage({
      to: phone,
      body: 'Por favor, informe um produto válido (mínimo 2 caracteres).',
    });
    return;
  }

  // Determinar próximo estado baseado no que foi extraído
  const nextState = nluExtractorService.determineNextState(context, extracted);

  // Montar mensagem de confirmação + próxima pergunta
  let confirmationMessage = `✅ *Entendi:*\n`;
  if (context.product) confirmationMessage += `📦 Produto: ${context.product}\n`;
  if (context.quantity) confirmationMessage += `📊 Quantidade: ${context.quantity} ${context.unit}\n`;
  if (context.region) confirmationMessage += `📍 Região: ${context.region}\n`;
  if (context.deadline) confirmationMessage += `⏰ Prazo: ${new Date(context.deadline).toLocaleDateString('pt-BR')}\n`;
  
  confirmationMessage += `\n`;

  // Adicionar próxima pergunta
  switch (nextState) {
    case 'AWAITING_QUANTITY':
      confirmationMessage += `*Qual a quantidade?*\nExemplo: 100 sacas, 500 kg`;
      break;
    case 'AWAITING_REGION':
      confirmationMessage += `*Qual a região de entrega?*\nExemplo: Rio Verde, Goiânia`;
      break;
    case 'AWAITING_DEADLINE':
      confirmationMessage += `*Qual o prazo desejado?*\nExemplo: em 5 dias, 30/04`;
      break;
    case 'AWAITING_SUPPLIER_SCOPE':
      confirmationMessage += `Está correto? Digite *sim* para continuar ou *corrigir* para refazer.`;
      break;
  }

  await whatsappService.sendMessage({
    to: phone,
    body: confirmationMessage,
  });

  await this.setState(producerId, 'producer', nextState, context);
}
```

---

#### **Passo 3: Aplicar Mesmo Padrão aos Outros Estados**

Repetir a lógica acima para:
- `handleAwaitingQuantity()` (linha 244-270)
- `handleAwaitingRegion()` (linha 275-299)
- `handleAwaitingDeadline()` (linha 304-328)

**Template Genérico:**
```typescript
private async handleAwaiting[FIELD](
  producerId: string,
  phone: string,
  message: string,
  context: ConversationContext
): Promise<void> {
  // 1. Extrair entidades
  const extracted = await nluExtractorService.extractEntities(
    message,
    'AWAITING_[FIELD]',
    context
  );

  // 2. Merge
  Object.assign(context, extracted);

  // 3. Validação
  if (!context.[field]) {
    await whatsappService.sendMessage({
      to: phone,
      body: '[MENSAGEM DE ERRO]',
    });
    return;
  }

  // 4. Determinar próximo estado
  const nextState = nluExtractorService.determineNextState(context, extracted);

  // 5. Mensagem de confirmação + próxima pergunta
  const message = this.buildProgressMessage(context, nextState);

  await whatsappService.sendMessage({ to: phone, body: message });
  await this.setState(producerId, 'producer', nextState, context);
}
```

---

### 📦 Dependências
- OpenAI SDK (já instalado)
- Nenhuma dependência adicional

---

### ✅ Checklist de Implementação

- [ ] Criar `nlu-extractor.service.ts`
- [ ] Implementar `extractEntities()` com prompt contextualizado
- [ ] Implementar `determineNextState()`
- [ ] Refatorar `handleAwaitingProduct()` para usar NLU
- [ ] Refatorar `handleAwaitingQuantity()` para usar NLU
- [ ] Refatorar `handleAwaitingRegion()` para usar NLU
- [ ] Refatorar `handleAwaitingDeadline()` para usar NLU
- [ ] Criar mensagens de confirmação progressiva
- [ ] Adicionar tratamento de erros (timeout OpenAI, JSON inválido)
- [ ] Adicionar logs para debugging
- [ ] Testar fluxo completo com mensagem contendo múltiplos dados

---

### 🧪 Testes

**Teste 1: Extração Completa**
```typescript
// Input
message = "Preciso de 100 sacas de ração para gado, entrega em Rio Verde até sexta"
currentState = "AWAITING_PRODUCT"

// Expected Extracted
{
  product: "ração para gado",
  quantity: "100",
  unit: "sacas",
  region: "Rio Verde",
  deadline: "2026-04-05" // próxima sexta
}

// Expected NextState
"AWAITING_SUPPLIER_SCOPE" // pulou todos os estados intermediários
```

**Teste 2: Extração Parcial**
```typescript
// Input
message = "50 litros de herbicida"
currentState = "AWAITING_PRODUCT"

// Expected Extracted
{
  product: "herbicida",
  quantity: "50",
  unit: "litros"
}

// Expected NextState
"AWAITING_REGION" // ainda falta região e prazo
```

**Teste 3: Apenas Campo Esperado**
```typescript
// Input
message = "ração"
currentState = "AWAITING_PRODUCT"

// Expected Extracted
{
  product: "ração"
}

// Expected NextState
"AWAITING_QUANTITY" // comportamento normal, 1 campo por vez
```

---

### ⚠️ Considerações de Custos

**Aumento de chamadas OpenAI:**
- **Antes:** 1 chamada por cotação (apenas no IDLE)
- **Depois:** 1-4 chamadas por cotação (em cada estado)
- **Custo médio GPT-4:** ~$0.03 por 1K tokens
- **Estimativa:** +$0.05 por cotação

**Mitigação:**
- Cache de resultados (Redis) para mensagens idênticas
- Timeout curto (3s) para evitar custos em erros
- Fallback para fluxo linear se OpenAI falhar

---

## P1.3 - Indicadores de Progresso

### 🎯 Objetivo
Mostrar ao usuário em qual passo ele está e quantos faltam. Reduz ansiedade e aumenta taxa de conclusão.

### 📊 Impacto
- **Taxa de conclusão:** +15%
- **Esforço:** 1 dia
- **Complexidade:** Baixa

---

### 🔧 Implementação

#### **Passo 1: Definir Mapa de Progresso**

**Arquivo:** `backend/src/flows/producer.flow.ts`

**Localização:** Após os imports (linha ~10)

```typescript
/**
 * Mapa de progresso para cada estado do fluxo
 * Usado para mostrar "Passo X de Y" nas mensagens
 */
const FLOW_PROGRESS: Record<ProducerState, { step: number; total: number; label: string; icon: string } | null> = {
  'IDLE': null,
  'AWAITING_PRODUCT': { step: 1, total: 4, label: 'Produto', icon: '📦' },
  'AWAITING_QUANTITY': { step: 2, total: 4, label: 'Quantidade', icon: '📊' },
  'AWAITING_REGION': { step: 3, total: 4, label: 'Região', icon: '📍' },
  'AWAITING_DEADLINE': { step: 4, total: 4, label: 'Prazo', icon: '⏰' },
  'AWAITING_OBSERVATIONS': null, // Passo opcional
  'AWAITING_SUPPLIER_SCOPE': null,
  'AWAITING_SUPPLIER_SELECTION': null,
  'AWAITING_SUPPLIER_EXCLUSION': null,
  'AWAITING_SUPPLIER_CONFIRMATION': null,
  'AWAITING_CONFIRMATION': null,
  'AWAITING_CHOICE': null,
  'AWAITING_SUPPLIER_CONTACT': null,
  'QUOTE_ACTIVE': null,
};
```

---

#### **Passo 2: Criar Helper para Gerar Header de Progresso**

**Arquivo:** `backend/src/flows/producer.flow.ts`

**Localização:** Dentro da classe `ProducerFSM`, antes dos métodos handlers

```typescript
/**
 * Gera header de progresso para o estado atual
 * @returns String formatada ou string vazia se estado não tem progresso
 */
private getProgressHeader(state: ProducerState): string {
  const progress = FLOW_PROGRESS[state];
  
  if (!progress) return '';
  
  // Barra de progresso visual
  const filled = '▓'.repeat(progress.step);
  const empty = '░'.repeat(progress.total - progress.step);
  
  return `[${progress.step}/${progress.total}] ${progress.icon} *${progress.label}*\n${filled}${empty}\n\n`;
}
```

---

#### **Passo 3: Adicionar Header nas Mensagens**

**Exemplo no método `handleAwaitingProduct`:**

**❌ Código Atual:**
```typescript
await whatsappService.sendMessage({
  to: phone,
  body: Messages.ASK_QUANTITY(product),
});
```

**✅ Código Proposto:**
```typescript
const progressHeader = this.getProgressHeader('AWAITING_QUANTITY');

await whatsappService.sendMessage({
  to: phone,
  body: progressHeader + Messages.ASK_QUANTITY(product),
});
```

---

#### **Passo 4: Adicionar Confirmação Visual ao Preencher Campo**

**Modificar mensagens em `messages.ts`:**

**❌ Código Atual:**
```typescript
ASK_QUANTITY: (product: string) => `Perfeito! Você quer cotar *${product}*. ✅

*Qual a quantidade desejada?*

Exemplos: 100 sacos, 500 kg, 20 litros`,
```

**✅ Código Proposto:**
```typescript
ASK_QUANTITY: (product: string) => `✅ *Produto:* ${product}

*Qual a quantidade desejada?*

Exemplos: 100 sacos, 500 kg, 20 litros`,
```

**Padrão:** Sempre confirmar o campo que acabou de ser preenchido antes de pedir o próximo.

---

### 📦 Dependências
- Nenhuma

---

### ✅ Checklist de Implementação

- [ ] Adicionar constante `FLOW_PROGRESS` no topo do arquivo
- [ ] Criar método `getProgressHeader(state)`
- [ ] Modificar `handleAwaitingProduct()` para adicionar header
- [ ] Modificar `handleAwaitingQuantity()` para adicionar header
- [ ] Modificar `handleAwaitingRegion()` para adicionar header
- [ ] Modificar `handleAwaitingDeadline()` para adicionar header
- [ ] Atualizar mensagens em `messages.ts` para incluir confirmação visual
- [ ] Testar visualmente no WhatsApp

---

### 🧪 Testes

**Teste Visual:**

**Mensagem esperada em AWAITING_QUANTITY:**
```
[2/4] 📊 *Quantidade*
▓▓░░

✅ *Produto:* Ração para gado

*Qual a quantidade desejada?*

Exemplos: 100 sacos, 500 kg, 20 litros
```

---

## P1.4 - Botões Nativos WhatsApp

### 🎯 Objetivo
Substituir "Digite 1 ou 2" por botões clicáveis nativos do WhatsApp. Reduz erros de digitação em 90%.

### 📊 Impacto
- **Erros de input:** -90%
- **Velocidade de resposta:** +20%
- **Esforço:** 3 dias
- **Complexidade:** Média (requer ajuste no provider)

---

### 🔧 Implementação

#### **Passo 1: Adicionar Suporte a Botões na Interface do Provider**

**Arquivo:** `backend/src/modules/whatsapp/interfaces/whatsapp-provider.interface.ts`

**Adicionar tipos:**
```typescript
export interface WhatsAppButton {
  id: string;      // ID único do botão (ex: "confirm")
  title: string;   // Texto do botão (max 20 caracteres)
}

export interface WhatsAppListItem {
  id: string;
  title: string;
  description?: string;
}

export interface WhatsAppList {
  button: string;  // Texto do botão "Ver opções"
  sections: Array<{
    title: string;
    rows: WhatsAppListItem[];
  }>;
}

export interface OutgoingMessage {
  to: string;
  body: string;
  buttons?: WhatsAppButton[];  // ⬅️ NOVO
  list?: WhatsAppList;          // ⬅️ NOVO
}
```

---

#### **Passo 2: Implementar Botões no Provider Twilio**

**Arquivo:** `backend/src/modules/whatsapp/providers/twilio.provider.ts`

**Localização:** Método `sendMessage()`

**❌ Código Atual:**
```typescript
async sendMessage(message: OutgoingMessage): Promise<void> {
  await this.client.messages.create({
    from: `whatsapp:${this.twilioPhone}`,
    to: `whatsapp:${message.to}`,
    body: message.body,
  });
}
```

**✅ Código Proposto:**
```typescript
async sendMessage(message: OutgoingMessage): Promise<void> {
  const twilioMessage: any = {
    from: `whatsapp:${this.twilioPhone}`,
    to: `whatsapp:${message.to}`,
    body: message.body,
  };

  // Se houver botões, usar Interactive Message
  if (message.buttons && message.buttons.length > 0) {
    // Twilio WhatsApp suporta até 3 botões
    if (message.buttons.length > 3) {
      throw new Error('WhatsApp buttons limit is 3');
    }

    // Formato de botões do Twilio (Beta)
    twilioMessage.contentSid = 'HXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // Content Template SID
    twilioMessage.contentVariables = JSON.stringify({
      1: message.body,
      // Botões são definidos no template
    });
  }

  // Se houver lista, usar List Message
  if (message.list) {
    // Twilio WhatsApp suporta até 10 itens por lista
    twilioMessage.contentSid = 'HXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // Content Template SID
    twilioMessage.contentVariables = JSON.stringify({
      1: message.body,
      // Lista é definida no template
    });
  }

  await this.client.messages.create(twilioMessage);
}
```

**⚠️ Nota Importante:**
- Twilio WhatsApp Interactive Messages estão em **beta** e requerem aprovação
- Alternativa: Usar **WhatsApp Business API** direto (não via Twilio)
- Para MVP, podemos simular botões com **Quick Replies numéricas melhoradas**

---

#### **Passo 3: Alternativa MVP - Quick Replies Melhoradas**

Enquanto botões nativos não estão disponíveis, melhorar as opções textuais:

**Arquivo:** `backend/src/flows/messages.ts`

**❌ Código Atual:**
```typescript
ASK_SUPPLIER_SCOPE: `Entendido! 📝

*Para quais fornecedores deseja enviar a cotação?*

*1* - Apenas meus fornecedores
*2* - Apenas rede FarmFlow
*3* - Todos (meus + rede)

Digite o número da opção:`,
```

**✅ Código Proposto (Simulando Botões):**
```typescript
ASK_SUPPLIER_SCOPE: `Entendido! 📝

*Para quais fornecedores deseja enviar a cotação?*

┌─────────────────────────┐
│ 1️⃣ Apenas meus fornecedores │
└─────────────────────────┘

┌─────────────────────────┐
│ 2️⃣ Apenas rede FarmFlow    │
└─────────────────────────┘

┌─────────────────────────┐
│ 3️⃣ Todos (meus + rede)     │
└─────────────────────────┘

*Responda com o número:* 1, 2 ou 3`,
```

**Melhorias:**
- Opções visualmente destacadas (emojis numéricos + caixas)
- Instrução clara ao final
- Mais fácil de clicar (usuário pode copiar/colar o número)

---

#### **Passo 4: Adicionar Validação Tolerante**

**Arquivo:** `backend/src/flows/producer.flow.ts`

**Localização:** `handleAwaitingSupplierScope()` (linha 356-393)

**❌ Código Atual:**
```typescript
const choice = message.trim();

switch (choice) {
  case '1':
    scope = 'MINE';
    break;
  case '2':
    scope = 'NETWORK';
    break;
  case '3':
    scope = 'ALL';
    break;
  default:
    await whatsappService.sendMessage({
      to: phone,
      body: 'Opção inválida. Digite *1*, *2* ou *3*.',
    });
    return;
}
```

**✅ Código Proposto (Tolerante):**
```typescript
const normalized = message.toLowerCase().trim();

// Aceitar variações
let scope: 'MINE' | 'NETWORK' | 'ALL';

if (normalized === '1' || normalized.includes('meus') || normalized.includes('apenas meus')) {
  scope = 'MINE';
} else if (normalized === '2' || normalized.includes('rede') || normalized.includes('farmflow')) {
  scope = 'NETWORK';
} else if (normalized === '3' || normalized.includes('todos') || normalized.includes('meus + rede')) {
  scope = 'ALL';
} else {
  // Erro mais amigável
  await whatsappService.sendMessage({
    to: phone,
    body: `❌ Não entendi "${message}".

Por favor, responda com:
• *1* para apenas seus fornecedores
• *2* para rede FarmFlow
• *3* para todos`,
  });
  return;
}
```

---

### 📦 Dependências
- Nenhuma (para versão MVP de Quick Replies melhoradas)
- Para botões nativos: WhatsApp Business API ou Twilio Beta

---

### ✅ Checklist de Implementação

**Fase 1: MVP (Quick Replies Melhoradas)**
- [ ] Atualizar `OutgoingMessage` interface com campos `buttons` e `list`
- [ ] Redesenhar mensagens de escolha com visual destacado
- [ ] Adicionar validação tolerante em todos os handlers de escolha
- [ ] Adicionar emojis numéricos (1️⃣, 2️⃣, 3️⃣)
- [ ] Testar todas as opções de escolha

**Fase 2: Botões Nativos (Futuro)**
- [ ] Solicitar acesso ao WhatsApp Business API
- [ ] Criar templates de mensagens com botões no Meta Business Manager
- [ ] Implementar envio de botões no provider
- [ ] Implementar parsing de respostas de botões
- [ ] Migrar progressivamente mensagens de escolha para botões

---

### 🧪 Testes

**Teste 1: Entrada Padrão**
```typescript
// Input
message = "1"

// Expected
scope = 'MINE'
```

**Teste 2: Entrada Textual**
```typescript
// Input
message = "quero enviar apenas para meus fornecedores"

// Expected
scope = 'MINE'
```

**Teste 3: Entrada Inválida**
```typescript
// Input
message = "abc"

// Expected
Mensagem de erro amigável com instruções
```

---

## Ordem de Implementação

### 📅 Sprint 1 (Semana 1)

**Dia 1-2: P1.1 - Onboarding Personalizado**
- ✅ Fácil de implementar
- ✅ Impacto imediato visível
- ✅ Não depende de outras melhorias

**Dia 3: P1.3 - Indicadores de Progresso**
- ✅ Complementa o onboarding
- ✅ Implementação rápida
- ✅ Não altera lógica de negócio

**Dia 4-5: P1.4 - Botões Nativos (versão MVP)**
- ✅ Melhora UX das escolhas
- ✅ Reduz erros de digitação

---

### 📅 Sprint 2 (Semana 2)

**Dia 1-5: P1.2 - NLU Full Flow**
- ⚠️ Mais complexo
- ⚠️ Requer testes extensivos
- ✅ Maior impacto nas métricas

**Por que deixar por último?**
1. Requer refatoração em vários métodos
2. Precisa de testes A/B para validar
3. Pode impactar custos (OpenAI)
4. Melhorias anteriores já terão dado feedback positivo

---

### 🔄 Fluxo de Deploy

**Para cada melhoria:**
1. Implementar em branch separada
2. Testar localmente com conta de teste
3. Code review
4. Merge para staging
5. Testar em staging com ~10 produtores reais
6. Coletar métricas por 2-3 dias
7. Se métricas positivas → merge para production
8. Monitorar por 1 semana

---

## Testes e Validação

### 🧪 Testes Unitários

**Arquivo:** `backend/src/flows/__tests__/producer.flow.test.ts`

```typescript
import { ProducerFSM } from '../producer.flow';
import { nluExtractorService } from '../../services/nlu-extractor.service';

describe('ProducerFSM - P1 Improvements', () => {
  describe('P1.1 - Onboarding Personalizado', () => {
    it('deve usar nome do produtor na mensagem de boas-vindas', async () => {
      // TODO: Implementar teste
    });

    it('deve funcionar sem nome (fallback)', async () => {
      // TODO: Implementar teste
    });
  });

  describe('P1.2 - NLU Full Flow', () => {
    it('deve extrair múltiplos campos de uma mensagem', async () => {
      const message = "100 sacas de ração, entrega em Rio Verde";
      const extracted = await nluExtractorService.extractEntities(
        message,
        'AWAITING_PRODUCT',
        {}
      );

      expect(extracted.product).toBe('ração');
      expect(extracted.quantity).toBe('100');
      expect(extracted.unit).toBe('sacas');
      expect(extracted.region).toBe('Rio Verde');
    });

    it('deve determinar próximo estado corretamente', async () => {
      const context = {
        product: 'ração',
        quantity: '100',
        unit: 'sacas',
      };

      const nextState = nluExtractorService.determineNextState(context, {});
      expect(nextState).toBe('AWAITING_REGION');
    });
  });

  describe('P1.3 - Indicadores de Progresso', () => {
    it('deve gerar header de progresso correto', () => {
      const fsm = new ProducerFSM();
      const header = (fsm as any).getProgressHeader('AWAITING_QUANTITY');
      
      expect(header).toContain('[2/4]');
      expect(header).toContain('📊');
      expect(header).toContain('Quantidade');
    });
  });

  describe('P1.4 - Validação Tolerante', () => {
    it('deve aceitar "1" como MINE', () => {
      // TODO: Implementar teste
    });

    it('deve aceitar "meus fornecedores" como MINE', () => {
      // TODO: Implementar teste
    });
  });
});
```

---

### 📊 Testes de Integração (E2E)

**Criar fluxo completo simulando usuário real:**

```typescript
describe('Fluxo Completo de Cotação - P1 Improvements', () => {
  it('deve completar cotação com mensagem única (NLU full)', async () => {
    // 1. Usuário envia mensagem completa
    const message = "Quero cotar 100 sacas de ração para gado, entrega em Rio Verde até sexta";
    
    // 2. Sistema extrai tudo
    // 3. Pede apenas confirmação
    // 4. Usuário confirma
    // 5. Cotação criada
    
    // Verificar que foram apenas 3 mensagens (vs. 10 antes)
    expect(messageCount).toBe(3);
  });

  it('deve mostrar progresso em cada passo', async () => {
    // Verificar que cada mensagem tem header [X/Y]
  });
});
```

---

### 📈 Métricas para Acompanhar

**Antes vs. Depois das Melhorias P1:**

```typescript
interface ConversionMetrics {
  firstResponseRate: number;      // % que responde após primeira msg
  completionRate: number;          // % que completa cotação
  averageMessages: number;         // Qtd média de mensagens trocadas
  averageTimeMinutes: number;      // Tempo médio para completar
  errorRate: number;               // % de mensagens com erro de validação
  abandonmentByState: Record<ProducerState, number>; // Onde abandonam
}
```

**Instrumentar código:**

```typescript
// backend/src/flows/producer.flow.ts

private async trackMetric(event: string, producerId: string, metadata?: any) {
  await prisma.conversationMetric.create({
    data: {
      producerId,
      event,
      state: currentState,
      metadata: metadata || {},
      timestamp: new Date(),
    },
  });
}

// Chamar em pontos-chave:
await this.trackMetric('message_sent', producerId, { state: 'AWAITING_PRODUCT' });
await this.trackMetric('message_received', producerId, { message: message.substring(0, 50) });
await this.trackMetric('state_changed', producerId, { from: 'IDLE', to: 'AWAITING_PRODUCT' });
await this.trackMetric('error', producerId, { errorType: 'validation', field: 'quantity' });
await this.trackMetric('quote_completed', producerId, { messageCount: 5, duration: 120 });
```

---

## 🎯 Checklist Final de Entrega

Antes de dar as melhorias como concluídas:

### Código
- [ ] Todas as 4 melhorias implementadas
- [ ] Code review aprovado
- [ ] Testes unitários passando (cobertura > 80%)
- [ ] Testes E2E passando
- [ ] Sem erros no linter/prettier
- [ ] Logs adicionados para debugging

### Documentação
- [ ] README.md atualizado com novas features
- [ ] Comentários JSDoc em métodos novos
- [ ] Changelog atualizado

### Deploy
- [ ] Deploy em staging realizado
- [ ] Testado com usuários reais (3-5 produtores)
- [ ] Métricas coletadas por 2-3 dias
- [ ] Aprovação do PO/Stakeholder
- [ ] Deploy em produção

### Monitoramento
- [ ] Dashboard de métricas criado (Grafana/Metabase)
- [ ] Alertas configurados (taxa de erro > 5%)
- [ ] Logs centralizados funcionando

---

## 📞 Suporte

**Dúvidas durante implementação?**

1. Consultar WHATSAPP_UX_ANALYSIS.md para contexto de negócio
2. Ver código atual nos arquivos:
   - `backend/src/flows/producer.flow.ts`
   - `backend/src/flows/messages.ts`
   - `backend/src/modules/whatsapp/whatsapp.service.ts`
3. Testar em ambiente local com número de teste

**Problemas conhecidos:**
- OpenAI timeout → Implementar retry com backoff
- Twilio rate limit → Adicionar queue de mensagens
- Custos OpenAI altos → Cache + prompt optimization

---

**Última atualização:** 02/04/2026  
**Desenvolvedor responsável:** [Adicionar nome]  
**Prazo estimado:** 2 semanas  
**Status:** 🟡 Aguardando início
