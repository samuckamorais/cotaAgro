import { FSMEngine } from './fsm';
import { Messages } from './messages';
import { whatsappService } from '../modules/whatsapp/whatsapp.service';
import { prisma } from '../config/database';
import { ProducerState, NLUResult, ConversationContext, ContactData } from '../types';
import { logger, logWithContext } from '../utils/logger';
import { parseDeadline } from '../utils/validators';
import { dispatchQuoteJob } from '../jobs/dispatch-quote.job';
import { contactExtractorService } from '../services/contact-extractor.service';
import { nluExtractorService } from '../services/nlu-extractor.service';
import { openaiService } from '../services/openai.service';
import { supplierNotificationService } from '../services/supplier-notification.service';
import { ProducerSettingsService } from '../services/producer-settings.service';

/**
 * Mapa de progresso para cada estado do fluxo
 * Usado para mostrar "Passo X de Y" nas mensagens
 */
const FLOW_PROGRESS: Record<ProducerState, { step: number; total: number; label: string; icon: string } | null> = {
  'IDLE': null,
  'AWAITING_REPEAT_CHOICE': null,
  'AWAITING_IMAGE_CHOICE': null,
  'AWAITING_PROACTIVE_CHOICE': null,
  'AWAITING_CATEGORY': { step: 1, total: 7, label: 'Categoria', icon: '🏷️' },
  'AWAITING_PRODUCT': { step: 2, total: 7, label: 'Produto', icon: '📦' },
  'AWAITING_QUANTITY': { step: 3, total: 7, label: 'Quantidade', icon: '📊' },
  'AWAITING_MORE_ITEMS': null,
  'AWAITING_REGION': { step: 4, total: 7, label: 'Região', icon: '📍' },
  'AWAITING_DEADLINE': { step: 5, total: 7, label: 'Prazo', icon: '⏰' },
  'AWAITING_OBSERVATIONS': null,
  'AWAITING_FREIGHT': { step: 6, total: 7, label: 'Frete', icon: '🚚' },
  'AWAITING_PAYMENT_TERMS': { step: 7, total: 7, label: 'Pagamento', icon: '💳' },
  'AWAITING_SUPPLIER_SCOPE': null,
  'AWAITING_SUPPLIER_SELECTION': null,
  'AWAITING_SUPPLIER_EXCLUSION': null,
  'AWAITING_SUPPLIER_CONFIRMATION': null,
  'AWAITING_CONFIRMATION': null,
  'AWAITING_CHOICE': null,
  'AWAITING_SUPPLIER_CONTACT': null,
  'AWAITING_SUPPLIER_CATEGORY': null,
  'QUOTE_ACTIVE': null,
  'CLOSED': null,
};

/**
 * FSM do Produtor - Gerencia fluxo de criação de cotações
 * Estados: IDLE → AWAITING_PRODUCT → ... → QUOTE_ACTIVE → CLOSED
 */
export class ProducerFSM extends FSMEngine<ProducerState> {
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

  /**
   * Handler principal que roteia mensagem para o handler do estado atual
   */
  async handleMessage(producerId: string, message: string, nluResult?: NLUResult): Promise<void> {
    const producer = await prisma.producer.findUniqueOrThrow({
      where: { id: producerId },
      include: { conversationState: true, subscription: true },
    });

    const currentState = (producer.conversationState?.step as ProducerState) || 'IDLE';
    const context = (producer.conversationState?.context as ConversationContext) || {};

    logWithContext('info', 'Producer message received', {
      producerId,
      currentState,
      message,
    });

    try {
      // Verificar comando global de cancelar
      if (message.toLowerCase().trim() === 'cancelar') {
        await this.handleCancel(producerId, producer.phone);
        return;
      }

      // Verificar comando global de ajuda
      if (message.toLowerCase().trim() === 'ajuda') {
        await whatsappService.sendMessage({
          to: producer.phone,
          body: Messages.HELP,
        });
        return;
      }

      // Rotear para handler do estado
      switch (currentState) {
        case 'IDLE':
          await this.handleIdle(producerId, producer.phone, message, nluResult);
          break;

        case 'AWAITING_REPEAT_CHOICE':
          await this.handleAwaitingRepeatChoice(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_CATEGORY':
          await this.handleAwaitingCategory(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_PRODUCT':
          await this.handleAwaitingProduct(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_QUANTITY':
          await this.handleAwaitingQuantity(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_MORE_ITEMS':
          await this.handleAwaitingMoreItems(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_REGION':
          await this.handleAwaitingRegion(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_DEADLINE':
          await this.handleAwaitingDeadline(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_OBSERVATIONS':
          await this.handleAwaitingObservations(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_FREIGHT':
          await this.handleAwaitingFreight(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_PAYMENT_TERMS':
          await this.handleAwaitingPaymentTerms(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_SUPPLIER_SCOPE':
          await this.handleAwaitingSupplierScope(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_SUPPLIER_SELECTION':
          await this.handleAwaitingSupplierSelection(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_SUPPLIER_EXCLUSION':
          await this.handleAwaitingSupplierExclusion(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_SUPPLIER_CONFIRMATION':
          await this.handleAwaitingSupplierConfirmation(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_CONFIRMATION':
          await this.handleAwaitingConfirmation(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_CHOICE':
          await this.handleAwaitingChoice(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_SUPPLIER_CONTACT':
          await this.handleAwaitingSupplierContact(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_SUPPLIER_CATEGORY':
          await this.handleAwaitingSupplierCategory(producerId, producer.phone, message, context);
          break;

        default:
          await whatsappService.sendMessage({
            to: producer.phone,
            body: Messages.UNKNOWN_INPUT,
          });
      }
    } catch (error) {
      logger.error('Error in ProducerFSM', { error, producerId, currentState });
      await whatsappService.sendMessage({
        to: producer.phone,
        body: Messages.ERROR,
      });
    }
  }

  /**
   * Estado IDLE - Aguardando início de nova cotação
   */
  private async handleIdle(
    producerId: string,
    phone: string,
    message: string,
    nluResult?: NLUResult
  ): Promise<void> {
    // Buscar dados do produtor uma única vez (otimização)
    const producer = await prisma.producer.findUniqueOrThrow({
      where: { id: producerId },
      include: { subscription: true },
    });

    const normalized = message.toLowerCase().trim();

    // Verificar se é um vCard (contato compartilhado)
    if (contactExtractorService.isVCard(message)) {
      await this.handleContactShared(producerId, phone, message);
      return;
    }

    // Verificar se usuário quer cadastrar fornecedor
    if (normalized === '2' || normalized.includes('cadastrar') || normalized.includes('fornecedor')) {
      await whatsappService.sendMessage({
        to: phone,
        body: Messages.ADD_SUPPLIER_INSTRUCTIONS,
      });
      await this.setState(producerId, 'producer', 'AWAITING_SUPPLIER_CONTACT', {});
      return;
    }

    // Verificar se usuário quer iniciar cotação
    if (normalized === '1' || normalized === 'começar' || normalized === 'comecar' || normalized.includes('nova') || normalized.includes('cotação') || normalized.includes('cotacao')) {
      // Verificar limite de cotações (já temos subscription do fetch acima)
      if (producer.subscription && producer.subscription.quotesUsed >= producer.subscription.quotesLimit) {
        await whatsappService.sendMessage({
          to: phone,
          body: Messages.QUOTA_EXCEEDED(producer.subscription.quotesLimit),
        });
        return;
      }

      // Verificar se tem última cotação salva para oferecer repetir
      if (producer.lastQuotePreferences) {
        const last = producer.lastQuotePreferences as any;

        await whatsappService.sendMessage({
          to: phone,
          body: Messages.REPEAT_LAST_QUOTE(last),
        });

        // Aguardar resposta se quer repetir ou nova
        await this.setState(producerId, 'producer', 'AWAITING_REPEAT_CHOICE', {
          lastQuote: last,
        });
        return;
      }

      // Iniciar fluxo normal: perguntar categoria primeiro
      await this.startCategorySelection(producerId, phone, producer.tenantId);
      return;
    }

    // Se NLU detectou intenção de nova cotação, pré-preencher produto no contexto
    // mas ainda iniciar pelo passo de categoria
    if (nluResult?.intent === 'nova_cotacao' && nluResult.entities.product) {
      const prefilledContext: ConversationContext = {
        product: nluResult.entities.product,
        quantity: nluResult.entities.quantity,
        unit: nluResult.entities.unit,
        region: nluResult.entities.region,
        deadline: nluResult.entities.deadline,
      };
      await this.startCategorySelection(producerId, phone, producer.tenantId, prefilledContext);
      return;
    }

    // Mensagem padrão com nome personalizado
    await whatsappService.sendMessage({
      to: phone,
      body: Messages.WELCOME(producer.name),
    });
  }

  /**
   * Estado AWAITING_REPEAT_CHOICE - Aguardando escolha se repete ou nova cotação
   */
  private async handleAwaitingRepeatChoice(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const normalized = message.toLowerCase().trim();

    // Validação tolerante
    if (normalized === '1' || normalized.includes('sim') || normalized.includes('repetir')) {
      // Repetir última cotação - pré-preencher contexto
      const last = context.lastQuote as any;

      const updatedContext: ConversationContext = {
        product: last.product,
        quantity: last.quantity,
        unit: last.unit,
        region: last.region,
        deadline: last.deadline,
      };

      // Ir direto para confirmação de fornecedores
      await this.askOrApplySupplierScope(producerId, phone, updatedContext);
      return;
    }

    if (normalized === '2' || normalized.includes('nova') || normalized.includes('diferente')) {
      // Nova cotação - iniciar pelo passo de categoria
      const producer = await prisma.producer.findUniqueOrThrow({
        where: { id: producerId },
        select: { tenantId: true },
      });
      await this.startCategorySelection(producerId, phone, producer.tenantId);
      return;
    }

    // Opção inválida
    await whatsappService.sendMessage({
      to: phone,
      body: 'Por favor, digite *1* para repetir ou *2* para nova cotação.',
    });
  }

  /**
   * Busca categorias únicas dos fornecedores do tenant e inicia seleção de categoria
   */
  /**
   * Aplica o escopo de fornecedores: se o padrão nas settings for OWN ou NETWORK,
   * pula a pergunta e avança direto. Se for ALL, exibe a pergunta de seleção.
   */
  private async askOrApplySupplierScope(
    producerId: string,
    phone: string,
    context: ConversationContext
  ): Promise<void> {
    const settings = await ProducerSettingsService.getOrCreate(producerId);
    const scope = settings.defaultSupplierScope;

    if (scope === 'MINE') {
      context.supplierScope = 'MINE';
      await this.showSupplierListForSelection(producerId, phone, context);
      return;
    }

    if (scope === 'NETWORK') {
      context.supplierScope = 'NETWORK';
      await this.showQuoteConfirmation(producerId, phone, context);
      return;
    }

    // ALL — perguntar ao usuário
    await whatsappService.sendMessage({
      to: phone,
      body: Messages.ASK_SUPPLIER_SCOPE,
    });
    await this.setState(producerId, 'producer', 'AWAITING_SUPPLIER_SCOPE', context);
  }

  private async startCategorySelection(
    producerId: string,
    phone: string,
    tenantId: string,
    prefilledContext: ConversationContext = {}
  ): Promise<void> {
    // Buscar categorias únicas de todos os fornecedores do tenant (cadastrados)
    const suppliers = await prisma.supplier.findMany({
      where: { tenantId },
      select: { categories: true },
    });

    const categories = [...new Set(suppliers.flatMap((s: any) => s.categories))]
      .filter((c: string) => c && c.trim().length > 0)
      .sort();

    const progressHeader = this.getProgressHeader('AWAITING_CATEGORY');

    await whatsappService.sendMessage({
      to: phone,
      body: progressHeader + Messages.START_QUOTE + '\n\n' + Messages.ASK_CATEGORY(categories),
    });

    await this.setState(producerId, 'producer', 'AWAITING_CATEGORY', {
      ...prefilledContext,
      availableCategories: categories,
    });
  }

  /**
   * Estado AWAITING_CATEGORY - Aguardando escolha da categoria
   */
  private async handleAwaitingCategory(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const normalized = message.trim();
    const categories = context.availableCategories || [];

    let selectedCategory: string;

    // Verificar se é um número válido
    const num = parseInt(normalized);
    if (!isNaN(num) && num >= 1 && num <= categories.length) {
      selectedCategory = categories[num - 1];
    } else if (normalized.length >= 2) {
      // Aceitar texto livre como categoria
      selectedCategory = normalized;
    } else {
      await whatsappService.sendMessage({
        to: phone,
        body: categories.length > 0
          ? `Responda com o *número* da categoria (1 a ${categories.length}) ou digite o nome.`
          : 'Por favor, informe a categoria (mínimo 2 caracteres).',
      });
      return;
    }

    context.category = selectedCategory;

    const progressHeader = this.getProgressHeader('AWAITING_PRODUCT');

    await whatsappService.sendMessage({
      to: phone,
      body: `${progressHeader}✅ *Categoria:* ${selectedCategory}\n\n*Qual produto você deseja cotar?*\n\nExemplos: soja, milho, fertilizante, defensivo, semente`,
    });

    await this.setState(producerId, 'producer', 'AWAITING_PRODUCT', context);
  }

  /**
   * Estado AWAITING_FREIGHT - Aguardando escolha do tipo de frete (CIF/FOB)
   */
  private async handleAwaitingFreight(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const normalized = message.toLowerCase().trim();

    let freight: 'CIF' | 'FOB';

    if (normalized === '1' || normalized === 'cif' || normalized.includes('entrega') || normalized.includes('incluso')) {
      freight = 'CIF';
    } else if (normalized === '2' || normalized === 'fob' || normalized.includes('retira') || normalized.includes('busca')) {
      freight = 'FOB';
    } else {
      await whatsappService.sendMessage({
        to: phone,
        body: `❌ Não entendi "${message}".\n\nDigite *1* para CIF (entrega inclusa) ou *2* para FOB (retira no fornecedor).`,
      });
      return;
    }

    context.freight = freight;

    const progressHeader = this.getProgressHeader('AWAITING_PAYMENT_TERMS');
    await whatsappService.sendMessage({
      to: phone,
      body: progressHeader + Messages.ASK_PAYMENT_TERMS(freight),
    });
    await this.setState(producerId, 'producer', 'AWAITING_PAYMENT_TERMS', context);
  }

  /**
   * Estado AWAITING_PAYMENT_TERMS - Aguardando forma de pagamento desejada pelo produtor
   */
  private async handleAwaitingPaymentTerms(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const terms = message.trim();

    if (terms.length < 2) {
      await whatsappService.sendMessage({
        to: phone,
        body: 'Por favor, informe a forma de pagamento. Exemplo: *à vista*, *30 dias*, *30/60/90 dias*.',
      });
      return;
    }

    context.quotePaymentTerms = terms;

    await this.askOrApplySupplierScope(producerId, phone, context);
  }

  /**
   * Estado AWAITING_PRODUCT - Aguardando nome do produto
   * Usa NLU para extrair múltiplas entidades de uma vez
   */
  private async handleAwaitingProduct(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    // Usar NLU para extrair todas as entidades possíveis
    const extracted = await nluExtractorService.extractEntities(
      message,
      'AWAITING_PRODUCT',
      context
    );

    // Merge dos dados extraídos (NLU pode ter falhado, então usar fallback)
    if (Object.keys(extracted).length > 0) {
      Object.assign(context, extracted);
    } else {
      // Fallback: comportamento antigo (pegar apenas o produto)
      const product = message.trim();
      if (product.length >= 2) {
        context.product = product;
      }
    }

    // Validação mínima
    if (!context.product || context.product.length < 2) {
      // Tentar sugerir correções usando OpenAI
      const suggestions = await openaiService.suggestCorrections(
        message,
        'product',
        'Insumos agrícolas comuns'
      );

      if (suggestions.length > 0) {
        await whatsappService.sendMessage({
          to: phone,
          body: Messages.ERROR_WITH_SUGGESTIONS(message, suggestions),
        });
      } else {
        // Fallback se OpenAI falhar
        await whatsappService.sendMessage({
          to: phone,
          body: 'Por favor, informe um produto válido (mínimo 2 caracteres).\n\nExemplos: ração, soja, milho, fertilizante',
        });
      }
      return;
    }

    // Determinar próximo estado baseado no que foi extraído
    const nextState = nluExtractorService.determineNextState(context);

    // Continuar fluxo com progress header
    const progressHeader = this.getProgressHeader(nextState);
    let askMessage = '';

    switch (nextState) {
      case 'AWAITING_QUANTITY':
        askMessage = Messages.ASK_QUANTITY(context.product);
        break;
      case 'AWAITING_REGION':
        askMessage = Messages.ASK_REGION(context.quantity, context.unit);
        break;
      case 'AWAITING_DEADLINE':
        askMessage = Messages.ASK_DEADLINE(context.region);
        break;
      case 'AWAITING_FREIGHT':
        askMessage = Messages.ASK_FREIGHT;
        break;
      default:
        // Se tudo foi extraído (AWAITING_SUPPLIER_SCOPE), ir para confirmação
        await this.showQuoteConfirmation(producerId, phone, context);
        return;
    }

    await whatsappService.sendMessage({
      to: phone,
      body: progressHeader + askMessage,
    });

    await this.setState(producerId, 'producer', nextState, context);
  }

  /**
   * Estado AWAITING_QUANTITY - Aguardando quantidade + unidade
   */
  private async handleAwaitingQuantity(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    // Extrair quantidade e unidade (ex: "100 sacos", "500kg")
    const match = message.match(/(\d+(?:[.,]\d+)?)\s*(sacos?|sacas?|kg|quilos?|litros?|toneladas?|ton?|l|unidades?|sc|ha|hectares?)?/i);

    if (!match) {
      const suggestions = await openaiService.suggestCorrections(
        message,
        'quantity',
        'Formato: número + unidade (sacas, kg, litros)'
      );

      if (suggestions.length > 0) {
        await whatsappService.sendMessage({
          to: phone,
          body: Messages.ERROR_WITH_SUGGESTIONS(message, suggestions),
        });
      } else {
        await whatsappService.sendMessage({
          to: phone,
          body: 'Por favor, informe a quantidade no formato: *100 sacas* ou *500 kg*',
        });
      }
      return;
    }

    const quantityFloat = parseFloat(match[1].replace(',', '.'));
    const unit = match[2] || 'unidades';

    // Acumular item na lista
    if (!context.items) context.items = [];
    context.items.push({
      product: context.product!,
      quantity: quantityFloat,
      unit,
    });

    // Limpar campos temporários do item
    context.quantity = String(quantityFloat);
    context.unit = unit;

    // Verificar limite de itens das configurações do produtor
    const settings = await ProducerSettingsService.getOrCreate(producerId);
    const itemsList = context.items
      .map((it, i) => `${i + 1}. ${it.product} — ${it.quantity} ${it.unit}`)
      .join('\n');

    if (context.items.length >= settings.maxItemsPerQuote) {
      // Limite atingido — avança direto para região
      await whatsappService.sendMessage({
        to: phone,
        body: `✅ *Item adicionado!*\n\n📦 *Itens da cotação (${context.category}):*\n${itemsList}\n\n⚠️ Limite de ${settings.maxItemsPerQuote} itens por cotação atingido.`,
      });
      const progressHeader = this.getProgressHeader('AWAITING_REGION');
      await whatsappService.sendMessage({
        to: phone,
        body: progressHeader + Messages.ASK_REGION(context.quantity, context.unit),
      });
      await this.setState(producerId, 'producer', 'AWAITING_REGION', context);
      return;
    }

    // Perguntar se quer adicionar mais itens (mesma categoria)
    await whatsappService.sendMessage({
      to: phone,
      body: `✅ *Item adicionado!*\n\n📦 *Itens da cotação (${context.category}):*\n${itemsList}\n\n*Deseja adicionar mais um produto desta categoria?*\n\n*1* — Sim, adicionar outro\n*2* — Não, continuar`,
    });

    await this.setState(producerId, 'producer', 'AWAITING_MORE_ITEMS', context);
  }

  /**
   * Estado AWAITING_MORE_ITEMS - Pergunta se quer adicionar mais itens
   */
  private async handleAwaitingMoreItems(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const normalized = message.toLowerCase().trim();

    if (normalized === '1' || normalized.includes('sim') || normalized.includes('adicionar')) {
      // Limpar produto/quantidade temporários e voltar para AWAITING_PRODUCT
      context.product = undefined;
      context.quantity = undefined;
      context.unit = undefined;

      const progressHeader = this.getProgressHeader('AWAITING_PRODUCT');
      const itemCount = context.items?.length || 0;

      await whatsappService.sendMessage({
        to: phone,
        body: `${progressHeader}*Qual o próximo produto?* (item ${itemCount + 1})\n\nCategoria: *${context.category}*`,
      });

      await this.setState(producerId, 'producer', 'AWAITING_PRODUCT', context);
      return;
    }

    if (normalized === '2' || normalized.includes('não') || normalized.includes('nao') || normalized.includes('continuar')) {
      const progressHeader = this.getProgressHeader('AWAITING_REGION');

      await whatsappService.sendMessage({
        to: phone,
        body: progressHeader + Messages.ASK_REGION(context.quantity, context.unit),
      });

      await this.setState(producerId, 'producer', 'AWAITING_REGION', context);
      return;
    }

    await whatsappService.sendMessage({
      to: phone,
      body: 'Digite *1* para adicionar mais um produto ou *2* para continuar.',
    });
  }

  /**
   * Estado AWAITING_REGION - Aguardando região de entrega
   */
  private async handleAwaitingRegion(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const region = message.trim();

    if (region.length < 2) {
      // Tentar sugerir correções
      const suggestions = await openaiService.suggestCorrections(
        message,
        'region',
        'Cidades ou regiões do Brasil'
      );

      if (suggestions.length > 0) {
        await whatsappService.sendMessage({
          to: phone,
          body: Messages.ERROR_WITH_SUGGESTIONS(message, suggestions),
        });
      } else {
        await whatsappService.sendMessage({
          to: phone,
          body: 'Por favor, informe uma região válida (mínimo 2 caracteres).\n\nExemplos: Goiânia, Rio Verde, Jataí',
        });
      }
      return;
    }

    context.region = region;

    const progressHeader = this.getProgressHeader('AWAITING_DEADLINE');

    await whatsappService.sendMessage({
      to: phone,
      body: progressHeader + Messages.ASK_DEADLINE(context.region),
    });

    await this.setState(producerId, 'producer', 'AWAITING_DEADLINE', context);
  }

  /**
   * Estado AWAITING_DEADLINE - Aguardando prazo de entrega
   */
  private async handleAwaitingDeadline(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const deadline = parseDeadline(message);

    if (!deadline) {
      // Tentar sugerir correções
      const suggestions = await openaiService.suggestCorrections(
        message,
        'deadline',
        'Formato: amanhã, em X dias, ou data DD/MM/AAAA'
      );

      if (suggestions.length > 0) {
        await whatsappService.sendMessage({
          to: phone,
          body: Messages.ERROR_WITH_SUGGESTIONS(message, suggestions),
        });
      } else {
        await whatsappService.sendMessage({
          to: phone,
          body: 'Prazo inválido. Use: *amanhã*, *em 5 dias* ou *30/03/2024*',
        });
      }
      return;
    }

    context.deadline = deadline.toISOString();

    // Pular observações (agora opcional) e ir direto para escopo de fornecedores
    // Se usuário quiser adicionar observações, pode digitar antes de confirmar
    const deadlineFormatted = deadline.toLocaleDateString('pt-BR');

    await whatsappService.sendMessage({
      to: phone,
      body: Messages.ASK_OBSERVATIONS_OPTIONAL(deadlineFormatted),
    });

    await this.setState(producerId, 'producer', 'AWAITING_OBSERVATIONS', context);
  }

  /**
   * Estado AWAITING_OBSERVATIONS - Aguardando observações (agora opcional)
   */
  private async handleAwaitingObservations(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const normalized = message.toLowerCase().trim();

    // Validação tolerante para "continuar sem observações"
    const skipObservations =
      normalized === 'continuar' ||
      normalized === 'continuar sem observações' ||
      normalized === 'continuar sem observacoes' ||
      normalized === 'não' ||
      normalized === 'nao' ||
      normalized === 'sem observações' ||
      normalized === 'sem observacoes';

    if (!skipObservations) {
      // Usuário digitou algo, considerar como observação
      context.observations = message.trim();
    }

    const progressHeader = this.getProgressHeader('AWAITING_FREIGHT');

    await whatsappService.sendMessage({
      to: phone,
      body: progressHeader + Messages.ASK_FREIGHT,
    });

    await this.setState(producerId, 'producer', 'AWAITING_FREIGHT', context);
  }

  /**
   * Estado AWAITING_SUPPLIER_SCOPE - Aguardando escolha de escopo de fornecedores
   */
  private async handleAwaitingSupplierScope(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const normalized = message.toLowerCase().trim();

    // Validação tolerante - aceita variações
    let scope: 'MINE' | 'NETWORK' | 'ALL';

    if (normalized === '1' || normalized.includes('meus') || normalized.includes('apenas meus')) {
      scope = 'MINE';
    } else if (normalized === '2' || normalized.includes('rede') || normalized.includes('cotaagro')) {
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
• *2* para rede CotaAgro
• *3* para todos`,
      });
      return;
    }

    context.supplierScope = scope;

    // Se escolheu "Apenas seus fornecedores" (MINE), mostrar lista para seleção
    if (scope === 'MINE') {
      await this.showSupplierListForSelection(producerId, phone, context);
    } else {
      // Para NETWORK ou ALL, ir direto para confirmação
      await this.showQuoteConfirmation(producerId, phone, context);
    }
  }

  /**
   * Mostra lista de fornecedores para seleção
   */
  private async showSupplierListForSelection(
    producerId: string,
    phone: string,
    context: ConversationContext
  ): Promise<void> {
    // Buscar fornecedores do produtor com rating e última proposta
    const suppliers = await prisma.supplier.findMany({
      where: {
        isNetworkSupplier: false,
        producers: {
          some: {
            producerId: producerId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        categories: true,
        rating: true,
        totalProposals: true,
        acceptedProposals: true,
        proposals: {
          where: {
            quote: {
              producerId: producerId,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            price: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { rating: 'desc' }, // Ordenar por rating (melhores primeiro)
        { name: 'asc' },
      ],
    });

    // Filtrar por categoria da cotação (case-insensitive)
    const filteredSuppliers = context.category
      ? suppliers.filter((s: any) =>
          s.categories.some(
            (cat: string) => cat.toLowerCase() === context.category!.toLowerCase()
          )
        )
      : suppliers;

    const suppliersToUse = filteredSuppliers.length > 0 ? filteredSuppliers : suppliers;
    const categoryWarning =
      context.category && filteredSuppliers.length === 0
        ? `⚠️ Nenhum fornecedor cadastrado para a categoria *${context.category}*. Mostrando todos.\n\n`
        : '';

    if (suppliersToUse.length === 0) {
      await whatsappService.sendMessage({
        to: phone,
        body: 'Você ainda não possui fornecedores cadastrados. Vou enviar para a rede CotaAgro.',
      });
      context.supplierScope = 'NETWORK';
      await this.showQuoteConfirmation(producerId, phone, context);
      return;
    }

    // Salvar lista de fornecedores disponíveis no contexto
    context.availableSuppliers = suppliersToUse.map((s: any) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
    }));
    context.excludedSuppliers = [];

    // Montar mensagem com lista numerada e informações
    const categoryLabel = context.category ? ` — ${context.category}` : '';
    let message = `${categoryWarning}📋 *Seus Fornecedores*${categoryLabel} (${suppliersToUse.length} encontrados)\n\n`;

    suppliersToUse.forEach((supplier: any, index: number) => {
      // Rating com estrelas
      const stars = supplier.rating > 0 ? `⭐ ${supplier.rating.toFixed(1)}` : '🆕 Novo';

      // Última cotação
      let lastQuoteInfo = '';
      if (supplier.proposals && supplier.proposals.length > 0) {
        const lastProposal = supplier.proposals[0];
        const lastDate = new Date(lastProposal.createdAt).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        });
        lastQuoteInfo = ` | Última: R$ ${lastProposal.price.toFixed(2)} (${lastDate})`;
      }

      message += `${index + 1}. *${supplier.name}* ${stars}${lastQuoteInfo}\n`;
    });

    message += '\n❓ *Enviar para todos ou escolher?*\n\n';
    message += '1️⃣ Enviar para todos\n';
    message += '2️⃣ Escolher fornecedores';

    await whatsappService.sendMessage({
      to: phone,
      body: message,
    });

    await this.setState(producerId, 'producer', 'AWAITING_SUPPLIER_SELECTION', context);
  }

  /**
   * Estado AWAITING_SUPPLIER_SELECTION - Aguardando seleção inicial dos fornecedores
   */
  private async handleAwaitingSupplierSelection(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const normalized = message.toLowerCase().trim();

    // Opção 1: Enviar para todos
    if (normalized === '1' || normalized.includes('todos') || normalized.includes('enviar para todos')) {
      // Não excluir ninguém, ir direto para confirmação
      await this.showSupplierListForConfirmation(producerId, phone, context);
      return;
    }

    // Opção 2: Escolher fornecedores
    if (normalized === '2' || normalized.includes('escolher')) {
      const availableSuppliers = context.availableSuppliers || [];
      const supplierList = availableSuppliers
        .map((s, i) => `${i + 1}. ${s.name}`)
        .join('\n');
      await whatsappService.sendMessage({
        to: phone,
        body: `Fornecedores selecionados:\n${supplierList}\n\nDigite os *números* dos fornecedores que deseja *REMOVER* (separados por vírgula):\n\nExemplo: 1,3\n\nOu digite *voltar* para enviar para todos.`,
      });
      // Continuar no mesmo estado aguardando os números
      return;
    }

    // Se digitou números ou "voltar"
    if (normalized === 'voltar' || normalized === 'não' || normalized === 'nao') {
      await this.showSupplierListForConfirmation(producerId, phone, context);
      return;
    }

    // Processar números para exclusão
    const numbers = message
      .split(',')
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n));

    if (numbers.length === 0) {
      await whatsappService.sendMessage({
        to: phone,
        body: 'Por favor, digite os números separados por vírgula ou *não* para manter todos.',
      });
      return;
    }

    // Validar números
    const availableSuppliers = context.availableSuppliers || [];
    const invalidNumbers = numbers.filter((n) => n < 1 || n > availableSuppliers.length);

    if (invalidNumbers.length > 0) {
      await whatsappService.sendMessage({
        to: phone,
        body: `Números inválidos: ${invalidNumbers.join(', ')}. Use números de 1 a ${availableSuppliers.length}.`,
      });
      return;
    }

    // Marcar fornecedores como excluídos
    context.excludedSuppliers = numbers.map((n) => availableSuppliers[n - 1].id);

    await this.showSupplierListForConfirmation(producerId, phone, context);
  }

  /**
   * Mostra lista final de fornecedores e pede confirmação
   */
  private async showSupplierListForConfirmation(
    producerId: string,
    phone: string,
    context: ConversationContext
  ): Promise<void> {
    const availableSuppliers = context.availableSuppliers || [];
    const excludedIds = context.excludedSuppliers || [];

    // Filtrar fornecedores selecionados (não excluídos)
    const selectedSuppliers = availableSuppliers.filter((s) => !excludedIds.includes(s.id));

    if (selectedSuppliers.length === 0) {
      await whatsappService.sendMessage({
        to: phone,
        body: 'Você excluiu todos os fornecedores. Vamos recomeçar a seleção.',
      });
      await this.showSupplierListForSelection(producerId, phone, context);
      return;
    }

    context.selectedSuppliers = selectedSuppliers;

    // Montar mensagem de confirmação
    let message = '✅ *Lista Final de Fornecedores*\n\n';
    message += 'A cotação será enviada para:\n\n';

    selectedSuppliers.forEach((supplier, index) => {
      message += `${index + 1}. ${supplier.name}\n`;
    });

    message += `\n📊 *Total: ${selectedSuppliers.length} fornecedor(es)*\n\n`;
    message += '❓ *Deseja continuar com esta lista?*\n\n';
    message += '✅ Digite *sim* para confirmar\n';
    message += '🔄 Digite *refazer* para ajustar a seleção';

    await whatsappService.sendMessage({
      to: phone,
      body: message,
    });

    await this.setState(producerId, 'producer', 'AWAITING_SUPPLIER_EXCLUSION', context);
  }

  /**
   * Estado AWAITING_SUPPLIER_EXCLUSION - Aguardando confirmação de mais exclusões
   */
  private async handleAwaitingSupplierExclusion(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const normalized = message.toLowerCase().trim();

    if (normalized === 'sim') {
      // Ir para confirmação final da cotação
      await this.showQuoteConfirmation(producerId, phone, context);
      return;
    }

    if (normalized === 'refazer') {
      // Resetar exclusões e mostrar lista novamente
      context.excludedSuppliers = [];
      await this.showSupplierListForSelection(producerId, phone, context);
      return;
    }

    await whatsappService.sendMessage({
      to: phone,
      body: 'Digite *sim* para confirmar ou *refazer* para ajustar.',
    });
  }

  /**
   * Mostra resumo da cotação e pede confirmação final
   */
  private async showQuoteConfirmation(
    producerId: string,
    phone: string,
    context: ConversationContext
  ): Promise<void> {
    let scopeLabel: string;

    switch (context.supplierScope) {
      case 'MINE':
        const count = context.selectedSuppliers?.length || 0;
        scopeLabel = `Seus fornecedores selecionados (${count})`;
        break;
      case 'NETWORK':
        scopeLabel = 'Rede CotaAgro';
        break;
      case 'ALL':
        scopeLabel = 'Todos (seus + rede)';
        break;
      default:
        scopeLabel = 'Não definido';
    }

    const items = context.items && context.items.length > 0
      ? context.items
      : [{ product: context.product!, quantity: parseFloat(context.quantity || '1'), unit: context.unit || 'unidades' }];

    const summary = {
      category: context.category,
      items,
      region: context.region!,
      deadline: new Date(context.deadline!).toLocaleDateString('pt-BR'),
      observations: context.observations,
      freight: context.freight,
      quotePaymentTerms: context.quotePaymentTerms,
      scope: scopeLabel,
    };

    await whatsappService.sendMessage({
      to: phone,
      body: Messages.CONFIRM_QUOTE(summary),
    });

    await this.setState(producerId, 'producer', 'AWAITING_SUPPLIER_CONFIRMATION', context);
  }

  /**
   * Estado AWAITING_SUPPLIER_CONFIRMATION - Confirmação final antes de enviar
   */
  private async handleAwaitingSupplierConfirmation(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const normalized = message.toLowerCase().trim();

    // Validação tolerante
    if (normalized === 'sim' || normalized === 's' || normalized.includes('enviar') || normalized.includes('confirmar')) {
      await this.createAndDispatchQuote(producerId, phone, context);
      return;
    }

    if (normalized === 'corrigir' || normalized === 'não' || normalized === 'nao' || normalized.includes('editar')) {
      await whatsappService.sendMessage({
        to: phone,
        body: 'Vamos recomeçar. Digite *nova cotação* quando estiver pronto.',
      });
      await this.resetState(producerId, 'producer');
      return;
    }

    await whatsappService.sendMessage({
      to: phone,
      body: 'Digite *sim* para confirmar ou *corrigir* para refazer.',
    });
  }

  /**
   * Cria cotação e dispara para fornecedores
   */
  private async createAndDispatchQuote(
    producerId: string,
    phone: string,
    context: ConversationContext
  ): Promise<void> {
    const producer = await prisma.producer.findUniqueOrThrow({
      where: { id: producerId },
      select: { tenantId: true },
    });

    // Normalizar itens: se não há context.items (fluxo legado), criar a partir dos campos soltos
    const items = context.items && context.items.length > 0
      ? context.items
      : [{
          product: context.product!,
          quantity: parseFloat(context.quantity || '1'),
          unit: context.unit || 'unidades',
        }];

    // Criar cotação + QuoteItems em uma única transaction
    const quote = await prisma.$transaction(async (tx) => {
      const newQuote = await tx.quote.create({
        data: {
          producerId,
          tenantId: producer.tenantId,
          category: context.category,
          // Campos legados — preencher com o primeiro item para compatibilidade
          product: items[0].product,
          quantity: String(items[0].quantity),
          unit: items[0].unit,
          region: context.region!,
          deadline: new Date(context.deadline!),
          observations: context.observations,
          freight: context.freight,
          paymentTerms: context.quotePaymentTerms,
          supplierScope: context.supplierScope!,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 120 * 60 * 1000),
        },
      });

      await tx.quoteItem.createMany({
        data: items.map((item) => ({
          quoteId: newQuote.id,
          product: item.product,
          quantity: item.quantity,
          unit: item.unit,
        })),
      });

      return newQuote;
    });

    // Incrementar contador de cotações usadas (1 cota independente do nº de itens)
    await prisma.subscription.updateMany({
      where: { producerId },
      data: { quotesUsed: { increment: 1 } },
    });

    // Disparar para fornecedores
    let suppliersCount: number;
    if (context.supplierScope === 'MINE' && context.selectedSuppliers) {
      const selectedIds = context.selectedSuppliers.map((s) => s.id);
      suppliersCount = await dispatchQuoteJob(quote.id, selectedIds);
    } else {
      suppliersCount = await dispatchQuoteJob(quote.id);
    }

    // Salvar preferências para próxima cotação (array de itens)
    await prisma.producer.update({
      where: { id: producerId },
      data: {
        lastQuotePreferences: {
          category: context.category,
          items: items as any,
          region: context.region,
          deadline: context.deadline,
        } as any,
      },
    });

    await whatsappService.sendMessage({
      to: phone,
      body: Messages.QUOTE_DISPATCHED(quote.id, suppliersCount),
    });

    context.quoteId = quote.id;
    await this.setState(producerId, 'producer', 'QUOTE_ACTIVE', context);
  }

  /**
   * Estado AWAITING_CONFIRMATION - Aguardando confirmação da cotação
   */
  private async handleAwaitingConfirmation(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const normalized = message.toLowerCase().trim();

    if (normalized === 'sim') {
      await this.createAndDispatchQuote(producerId, phone, context);
      return;
    }

    if (normalized === 'corrigir') {
      await whatsappService.sendMessage({
        to: phone,
        body: 'Vamos recomeçar. Digite *nova cotação* quando estiver pronto.',
      });
      await this.resetState(producerId, 'producer');
      return;
    }

    await whatsappService.sendMessage({
      to: phone,
      body: 'Digite *sim* para confirmar ou *corrigir* para refazer.',
    });
  }

  /**
   * Estado AWAITING_CHOICE - Aguardando escolha do fornecedor
   */
  private async handleAwaitingChoice(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const normalized = message.toLowerCase().trim();

    if (normalized === 'cancelar') {
      await this.handleCancel(producerId, phone);
      return;
    }

    // Verificar se é um número válido
    const choice = parseInt(message);
    if (isNaN(choice) || choice < 1) {
      await whatsappService.sendMessage({
        to: phone,
        body: 'Opção inválida. Digite o *número* do fornecedor ou *cancelar*.',
      });
      return;
    }

    // Buscar propostas da cotação
    const proposals = await prisma.proposal.findMany({
      where: { quoteId: context.quoteId! },
      include: { supplier: true },
      orderBy: [{ price: 'asc' }, { deliveryDays: 'asc' }],
    });

    const selectedProposal = proposals[choice - 1];

    if (!selectedProposal) {
      await whatsappService.sendMessage({
        to: phone,
        body: `Fornecedor não encontrado. Digite um número de *1* a *${proposals.length}*.`,
      });
      return;
    }

    // Fechar cotação
    await prisma.quote.update({
      where: { id: context.quoteId! },
      data: {
        status: 'CLOSED',
        closedSupplierId: selectedProposal.supplierId,
      },
    });

    // Notificar todos os fornecedores sobre o resultado (assíncrono)
    supplierNotificationService.notifyQuoteResult(context.quoteId!).catch((err) => {
      logger.error('Failed to notify quote result', { error: err, quoteId: context.quoteId });
    });

    await whatsappService.sendMessage({
      to: phone,
      body: Messages.QUOTE_CLOSED(selectedProposal.supplier.name),
    });

    await this.resetState(producerId, 'producer');
  }

  /**
   * Cancela a ação atual e volta para IDLE
   */
  private async handleCancel(producerId: string, phone: string): Promise<void> {
    await whatsappService.sendMessage({
      to: phone,
      body: Messages.QUOTE_CANCELLED,
    });

    await this.resetState(producerId, 'producer');
  }

  /**
   * Estado AWAITING_SUPPLIER_CONTACT - Aguardando contato do fornecedor
   */
  private async handleAwaitingSupplierContact(
    producerId: string,
    phone: string,
    message: string,
    _context: ConversationContext
  ): Promise<void> {
    // Verificar se é um vCard
    if (contactExtractorService.isVCard(message)) {
      await this.handleContactShared(producerId, phone, message);
      return;
    }

    // Tentar extrair dados do texto livre
    const contactData = await contactExtractorService.extractContactData(message);

    if (!contactData) {
      await whatsappService.sendMessage({
        to: phone,
        body: Messages.SUPPLIER_ADD_ERROR,
      });
      return;
    }

    // Criar fornecedor
    await this.createSupplierFromContact(producerId, phone, contactData);
  }

  /**
   * Estado AWAITING_SUPPLIER_CATEGORY - Aguardando categoria do fornecedor recém-cadastrado
   */
  private async handleAwaitingSupplierCategory(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const normalized = message.trim();
    const categories = (context.availableCategories as string[]) || [];
    const supplierId = context.supplierId as string;
    const supplierName = context.supplierName as string;

    if (!supplierId) {
      await this.resetState(producerId, 'producer');
      return;
    }

    // Resolver seleção: números separados por vírgula e/ou texto livre
    const selectedCategories: string[] = [];

    const parts = normalized.split(',').map((p) => p.trim()).filter(Boolean);

    for (const part of parts) {
      const num = parseInt(part);
      if (!isNaN(num) && num >= 1 && num <= categories.length) {
        // Número válido → mapear para nome da categoria
        selectedCategories.push(categories[num - 1]);
      } else if (part.length >= 2) {
        // Texto livre → nova categoria ou nome digitado
        selectedCategories.push(part.toLowerCase());
      }
    }

    if (selectedCategories.length === 0) {
      await whatsappService.sendMessage({
        to: phone,
        body: categories.length > 0
          ? `Informe o(s) número(s) da(s) categoria(s) (ex: *1* ou *1,3*) ou digite o nome.`
          : `Por favor, informe a categoria do fornecedor (mínimo 2 caracteres).`,
      });
      return;
    }

    // Remover duplicatas
    const uniqueCategories = [...new Set(selectedCategories)];

    // Atualizar o fornecedor com as categorias
    await prisma.supplier.update({
      where: { id: supplierId },
      data: { categories: uniqueCategories },
    });

    logWithContext('info', 'Supplier categories saved', {
      producerId,
      supplierId,
      categories: uniqueCategories,
    });

    await whatsappService.sendMessage({
      to: phone,
      body: Messages.SUPPLIER_CATEGORY_SAVED(supplierName, uniqueCategories),
    });

    await this.resetState(producerId, 'producer');
  }

  /**
   * Processa contato compartilhado (vCard ou estruturado)
   */
  private async handleContactShared(
    producerId: string,
    phone: string,
    message: string
  ): Promise<void> {
    logWithContext('info', 'Processing shared contact', { producerId });

    // Extrair dados do vCard
    const contactData = contactExtractorService.extractFromVCard(message);

    if (!contactData) {
      // Tentar extrair com OpenAI
      const extracted = await contactExtractorService.extractContactData(message);
      if (!extracted) {
        await whatsappService.sendMessage({
          to: phone,
          body: Messages.SUPPLIER_ADD_ERROR,
        });
        return;
      }
      await this.createSupplierFromContact(producerId, phone, extracted);
      return;
    }

    await this.createSupplierFromContact(producerId, phone, contactData);
  }

  /**
   * Cria fornecedor a partir dos dados do contato
   */
  private async createSupplierFromContact(
    producerId: string,
    phone: string,
    contactData: ContactData
  ): Promise<void> {
    try {
      // Buscar produtor para obter tenantId e região
      const producer = await prisma.producer.findUniqueOrThrow({
        where: { id: producerId },
      });

      // Verificar se fornecedor já existe no mesmo tenant
      const existingSupplier = await prisma.supplier.findFirst({
        where: { phone: contactData.phone, tenantId: producer.tenantId },
      });

      if (existingSupplier) {
        // Verificar se já está vinculado ao produtor
        const link = await prisma.producerSupplier.findFirst({
          where: {
            producerId,
            supplierId: existingSupplier.id,
          },
        });

        if (!link) {
          // Vincular ao produtor
          await prisma.producerSupplier.create({
            data: {
              producerId,
              supplierId: existingSupplier.id,
              tenantId: producer.tenantId,
            },
          });
        }

        await whatsappService.sendMessage({
          to: phone,
          body: Messages.SUPPLIER_ALREADY_EXISTS(existingSupplier.name),
        });
        await this.resetState(producerId, 'producer');
        return;
      }

      // Criar novo fornecedor
      const supplier = await prisma.supplier.create({
        data: {
          name: contactData.name,
          phone: contactData.phone,
          company: contactData.company,
          email: contactData.email,
          tenantId: producer.tenantId,
          regions: [producer.region], // região do produtor como padrão
          categories: [], // será preenchido posteriormente
          isNetworkSupplier: false, // fornecedor da rede do produtor
        },
      });

      // Vincular ao produtor
      await prisma.producerSupplier.create({
        data: {
          producerId,
          supplierId: supplier.id,
          tenantId: producer.tenantId,
        },
      });

      logWithContext('info', 'Supplier created from contact', {
        producerId,
        supplierId: supplier.id,
        supplierName: supplier.name,
      });

      // Buscar categorias existentes no tenant para exibir como opções
      const tenantSuppliers = await prisma.supplier.findMany({
        where: { tenantId: producer.tenantId },
        select: { categories: true },
      });
      const availableCategories = [...new Set(
        tenantSuppliers.flatMap((s: any) => s.categories as string[])
      )].filter((c: string) => c && c.trim().length > 0).sort();

      await whatsappService.sendMessage({
        to: phone,
        body: Messages.ASK_SUPPLIER_CATEGORY(supplier.name, availableCategories),
      });

      await this.setState(producerId, 'producer', 'AWAITING_SUPPLIER_CATEGORY', {
        supplierId: supplier.id,
        supplierName: supplier.name,
        availableCategories,
      });
    } catch (error) {
      logger.error('Failed to create supplier from contact', { error, producerId, contactData });
      await whatsappService.sendMessage({
        to: phone,
        body: Messages.SUPPLIER_ADD_ERROR,
      });
    }
  }
}
