import { FSMEngine } from './fsm';
import { Messages } from './messages';
import { whatsappService } from '../modules/whatsapp/whatsapp.service';
import { prisma } from '../config/database';
import { ProducerState, NLUResult, ConversationContext, ContactData } from '../types';
import { logger, logWithContext } from '../utils/logger';
import { parseDeadline } from '../utils/validators';
import { dispatchQuoteJob } from '../jobs/dispatch-quote.job';
import { contactExtractorService } from '../services/contact-extractor.service';

/**
 * FSM do Produtor - Gerencia fluxo de criação de cotações
 * Estados: IDLE → AWAITING_PRODUCT → ... → QUOTE_ACTIVE → CLOSED
 */
export class ProducerFSM extends FSMEngine<ProducerState> {
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
    if (normalized === '1' || normalized.includes('nova') || normalized.includes('cotação') || normalized.includes('cotacao')) {
      // Verificar limite de cotações
      const subscription = await prisma.subscription.findUnique({
        where: { producerId },
      });

      if (subscription && subscription.quotesUsed >= subscription.quotesLimit) {
        await whatsappService.sendMessage({
          to: phone,
          body: Messages.QUOTA_EXCEEDED(subscription.quotesLimit),
        });
        return;
      }

      // Iniciar fluxo
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
          body: Messages.ASK_REGION,
        });
        await this.setState(producerId, 'producer', 'AWAITING_REGION', context);
      } else {
        // Pular para confirmação
        await whatsappService.sendMessage({
          to: phone,
          body: Messages.ASK_DEADLINE,
        });
        await this.setState(producerId, 'producer', 'AWAITING_DEADLINE', context);
      }
      return;
    }

    // Mensagem padrão
    await whatsappService.sendMessage({
      to: phone,
      body: Messages.WELCOME,
    });
  }

  /**
   * Estado AWAITING_PRODUCT - Aguardando nome do produto
   */
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
      await whatsappService.sendMessage({
        to: phone,
        body: 'Por favor, informe a quantidade no formato: *100 sacos* ou *500 kg*',
      });
      return;
    }

    context.quantity = match[1];
    context.unit = match[2] || 'unidades';

    await whatsappService.sendMessage({
      to: phone,
      body: Messages.ASK_REGION,
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
      await whatsappService.sendMessage({
        to: phone,
        body: 'Por favor, informe uma região válida (mínimo 2 caracteres).',
      });
      return;
    }

    context.region = region;

    await whatsappService.sendMessage({
      to: phone,
      body: Messages.ASK_DEADLINE,
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
      await whatsappService.sendMessage({
        to: phone,
        body: 'Prazo inválido. Use: *amanhã*, *em 5 dias* ou *30/03/2024*',
      });
      return;
    }

    context.deadline = deadline.toISOString();

    await whatsappService.sendMessage({
      to: phone,
      body: Messages.ASK_OBSERVATIONS,
    });

    await this.setState(producerId, 'producer', 'AWAITING_OBSERVATIONS', context);
  }

  /**
   * Estado AWAITING_OBSERVATIONS - Aguardando observações
   */
  private async handleAwaitingObservations(
    producerId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const normalized = message.toLowerCase().trim();

    if (normalized !== 'não' && normalized !== 'nao') {
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
    const choice = message.trim();

    let scope: 'MINE' | 'NETWORK' | 'ALL';

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
    // Buscar fornecedores do produtor que atendem a categoria do produto
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
      },
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

    // Montar mensagem com lista numerada
    let message = '📋 *Seus Fornecedores*\n\n';
    message += 'Encontrei os seguintes fornecedores:\n\n';

    suppliers.forEach((supplier: any, index: number) => {
      message += `${index + 1}. ${supplier.name}\n`;
    });

    message += '\n❓ *Deseja excluir algum fornecedor desta lista?*\n\n';
    message += '✅ Digite *não* para manter todos\n';
    message += '❌ Digite os *números* dos fornecedores que deseja excluir (separados por vírgula)\n';
    message += '   Exemplo: 1,3';

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

    // Se não quer excluir ninguém
    if (normalized === 'não' || normalized === 'nao') {
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
   * Cria cotação e dispara para fornecedores
   */
  private async createAndDispatchQuote(
    producerId: string,
    phone: string,
    context: ConversationContext
  ): Promise<void> {
    // Criar cotação no banco
    const quote = await prisma.quote.create({
      data: {
        producerId,
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
      // Criar cotação no banco
      const quote = await prisma.quote.create({
        data: {
          producerId,
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
      // Verificar se fornecedor já existe
      const existingSupplier = await prisma.supplier.findUnique({
        where: { phone: contactData.phone },
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

      // Buscar região do produtor para usar como padrão
      const producer = await prisma.producer.findUniqueOrThrow({
        where: { id: producerId },
      });

      // Criar novo fornecedor
      const supplier = await prisma.supplier.create({
        data: {
          name: contactData.name,
          phone: contactData.phone,
          company: contactData.company,
          email: contactData.email,
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
