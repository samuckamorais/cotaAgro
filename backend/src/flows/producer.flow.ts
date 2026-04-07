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

/**
 * Mapa de progresso para cada estado do fluxo
 * Usado para mostrar "Passo X de Y" nas mensagens
 */
const FLOW_PROGRESS: Record<ProducerState, { step: number; total: number; label: string; icon: string } | null> = {
  'IDLE': null,
  'AWAITING_REPEAT_CHOICE': null,
  'AWAITING_IMAGE_CHOICE': null,
  'AWAITING_PROACTIVE_CHOICE': null,
  'AWAITING_PRODUCT': { step: 1, total: 4, label: 'Produto', icon: '📦' },
  'AWAITING_QUANTITY': { step: 2, total: 4, label: 'Quantidade', icon: '📊' },
  'AWAITING_REGION': { step: 3, total: 4, label: 'Região', icon: '📍' },
  'AWAITING_DEADLINE': { step: 4, total: 4, label: 'Prazo', icon: '⏰' },
  'AWAITING_OBSERVATIONS': null,
  'AWAITING_SUPPLIER_SCOPE': null,
  'AWAITING_SUPPLIER_SELECTION': null,
  'AWAITING_SUPPLIER_EXCLUSION': null,
  'AWAITING_SUPPLIER_CONFIRMATION': null,
  'AWAITING_CONFIRMATION': null,
  'AWAITING_CHOICE': null,
  'AWAITING_SUPPLIER_CONTACT': null,
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

        case 'AWAITING_PRODUCT':
          await this.handleAwaitingProduct(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_QUANTITY':
          await this.handleAwaitingQuantity(producerId, producer.phone, message, context);
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

      // Iniciar fluxo normal
      await whatsappService.sendMessage({
        to: phone,
        body: Messages.START_QUOTE,
      });

      await this.setState(producerId, 'producer', 'AWAITING_PRODUCT', {});
      return;
    }

    // Se NLU detectou intenção de nova cotação, pré-preencher contexto
    if (nluResult?.intent === 'nova_cotacao' && nluResult.entities.product) {
      const context: ConversationContext = {
        product: nluResult.entities.product,
        quantity: nluResult.entities.quantity,
        unit: nluResult.entities.unit,
        region: nluResult.entities.region,
        deadline: nluResult.entities.deadline,
      };

      // Determinar próximo estado baseado no que foi extraído
      if (!context.quantity) {
        await whatsappService.sendMessage({
          to: phone,
          body: Messages.ASK_QUANTITY(context.product!),
        });
        await this.setState(producerId, 'producer', 'AWAITING_QUANTITY', context);
      } else if (!context.region) {
        await whatsappService.sendMessage({
          to: phone,
          body: Messages.ASK_REGION(context.quantity, context.unit),
        });
        await this.setState(producerId, 'producer', 'AWAITING_REGION', context);
      } else {
        // Pular para confirmação
        await whatsappService.sendMessage({
          to: phone,
          body: Messages.ASK_DEADLINE(context.region),
        });
        await this.setState(producerId, 'producer', 'AWAITING_DEADLINE', context);
      }
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
      await whatsappService.sendMessage({
        to: phone,
        body: Messages.ASK_SUPPLIER_SCOPE,
      });

      await this.setState(producerId, 'producer', 'AWAITING_SUPPLIER_SCOPE', updatedContext);
      return;
    }

    if (normalized === '2' || normalized.includes('nova') || normalized.includes('diferente')) {
      // Nova cotação - iniciar fluxo normal
      await whatsappService.sendMessage({
        to: phone,
        body: Messages.START_QUOTE,
      });

      await this.setState(producerId, 'producer', 'AWAITING_PRODUCT', {});
      return;
    }

    // Opção inválida
    await whatsappService.sendMessage({
      to: phone,
      body: 'Por favor, digite *1* para repetir ou *2* para nova cotação.',
    });
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

    // Se extraiu tudo, mostrar resumo e pedir confirmação
    if (nextState === 'AWAITING_SUPPLIER_SCOPE') {
      const confirmationMessage = nluExtractorService.buildConfirmationMessage(context, nextState);

      await whatsappService.sendMessage({
        to: phone,
        body: confirmationMessage,
      });

      await this.setState(producerId, 'producer', nextState, context);
      return;
    }

    // Caso contrário, continuar fluxo normal com progress header
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
    const match = message.match(/(\d+)\s*(sacos?|kg|litros?|toneladas?|ton?|l|unidades?)?/i);

    if (!match) {
      // Tentar sugerir correções
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

    context.quantity = match[1];
    context.unit = match[2] || 'unidades';

    const progressHeader = this.getProgressHeader('AWAITING_REGION');

    await whatsappService.sendMessage({
      to: phone,
      body: progressHeader + Messages.ASK_REGION(context.quantity, context.unit),
    });

    await this.setState(producerId, 'producer', 'AWAITING_REGION', context);
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

    await whatsappService.sendMessage({
      to: phone,
      body: Messages.ASK_SUPPLIER_SCOPE,
    });

    await this.setState(producerId, 'producer', 'AWAITING_SUPPLIER_SCOPE', context);
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

    if (suppliers.length === 0) {
      await whatsappService.sendMessage({
        to: phone,
        body: 'Você ainda não possui fornecedores cadastrados. Vou enviar para a rede CotaAgro.',
      });
      context.supplierScope = 'NETWORK';
      await this.showQuoteConfirmation(producerId, phone, context);
      return;
    }

    // Salvar lista de fornecedores disponíveis no contexto
    context.availableSuppliers = suppliers.map((s: any) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
    }));
    context.excludedSuppliers = [];

    // Montar mensagem com lista numerada e informações
    let message = `📋 *Seus Fornecedores* (${suppliers.length} encontrados)\n\n`;

    suppliers.forEach((supplier: any, index: number) => {
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
    message += '┌───────────────────────┐\n';
    message += '│ 1️⃣ Enviar para todos   │\n';
    message += '└───────────────────────┘\n\n';
    message += '┌───────────────────────┐\n';
    message += '│ 2️⃣ Escolher fornecedores │\n';
    message += '└───────────────────────┘';

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
      // Mostrar mensagem para digitar números a excluir
      await whatsappService.sendMessage({
        to: phone,
        body: `Digite os *números* dos fornecedores que deseja *REMOVER* (separados por vírgula):\n\nExemplo: 1,3\n\nOu digite *voltar* para enviar para todos.`,
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

    const summary = {
      product: context.product!,
      quantity: context.quantity!,
      unit: context.unit!,
      region: context.region!,
      deadline: new Date(context.deadline!).toLocaleDateString('pt-BR'),
      observations: context.observations,
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
    // Criar cotação no banco
    const quote = await prisma.quote.create({
      data: {
        producerId,
        tenantId: producer.tenantId,
        product: context.product!,
        quantity: context.quantity!,
        unit: context.unit!,
        region: context.region!,
        deadline: new Date(context.deadline!),
        observations: context.observations,
        supplierScope: context.supplierScope!,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 120 * 60 * 1000), // 2 horas
      },
    });

    // Incrementar contador de cotações usadas
    await prisma.subscription.update({
      where: { producerId },
      data: { quotesUsed: { increment: 1 } },
    });

    // Adicionar job para disparar cotações
    // Se foi MINE e tem fornecedores selecionados, passar a lista
    let suppliersCount: number;

    if (context.supplierScope === 'MINE' && context.selectedSuppliers) {
      // Disparar apenas para fornecedores selecionados
      const selectedIds = context.selectedSuppliers.map((s) => s.id);
      suppliersCount = await dispatchQuoteJob(quote.id, selectedIds);
    } else {
      // Disparar normalmente
      suppliersCount = await dispatchQuoteJob(quote.id);
    }

    // Salvar preferências para próxima cotação
    await prisma.producer.update({
      where: { id: producerId },
      data: {
        lastQuotePreferences: {
          product: context.product,
          quantity: context.quantity,
          unit: context.unit,
          region: context.region,
          deadline: context.deadline,
        },
      },
    });

    await whatsappService.sendMessage({
      to: phone,
      body: Messages.QUOTE_DISPATCHED(quote.id, suppliersCount),
    });

    // Atualizar contexto com quoteId e mudar estado
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
      const producer = await prisma.producer.findUniqueOrThrow({
        where: { id: producerId },
        select: { tenantId: true },
      });
      // Criar cotação no banco
      const quote = await prisma.quote.create({
        data: {
          producerId,
          tenantId: producer.tenantId,
          product: context.product!,
          quantity: context.quantity!,
          unit: context.unit!,
          region: context.region!,
          deadline: new Date(context.deadline!),
          observations: context.observations,
          supplierScope: context.supplierScope!,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 120 * 60 * 1000), // 2 horas
        },
      });

      // Incrementar contador de cotações usadas
      await prisma.subscription.update({
        where: { producerId },
        data: { quotesUsed: { increment: 1 } },
      });

      // Adicionar job para disparar cotações
      const suppliersCount = await dispatchQuoteJob(quote.id);

      await whatsappService.sendMessage({
        to: phone,
        body: Messages.QUOTE_DISPATCHED(quote.id, suppliersCount),
      });

      // Atualizar contexto com quoteId e mudar estado
      context.quoteId = quote.id;
      await this.setState(producerId, 'producer', 'QUOTE_ACTIVE', context);
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

      await whatsappService.sendMessage({
        to: phone,
        body: Messages.SUPPLIER_ADDED_SUCCESS(supplier.name),
      });

      await this.resetState(producerId, 'producer');
    } catch (error) {
      logger.error('Failed to create supplier from contact', { error, producerId, contactData });
      await whatsappService.sendMessage({
        to: phone,
        body: Messages.SUPPLIER_ADD_ERROR,
      });
    }
  }
}
