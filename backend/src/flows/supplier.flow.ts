import { FSMEngine } from './fsm';
import { Messages } from './messages';
import { whatsappService } from '../modules/whatsapp/whatsapp.service';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { SupplierState, ConversationContext } from '../types';
import { logger, logWithContext } from '../utils/logger';
import { supplierNotificationService } from '../services/supplier-notification.service';
import { ProposalTokenService } from '../services/proposal-token.service';
import { ProducerSettingsService } from '../services/producer-settings.service';

/**
 * FSM do Fornecedor - Gerencia fluxo de resposta a cotações
 * Estados: SUPPLIER_IDLE → SUPPLIER_AWAITING_RESPONSE → ... → SUPPLIER_PROPOSAL_SENT
 */
export class SupplierFSM extends FSMEngine<SupplierState> {
  /**
   * Handler principal que roteia mensagem para o handler do estado atual
   */
  async handleMessage(supplierId: string, message: string): Promise<void> {
    const supplier = await prisma.supplier.findUniqueOrThrow({
      where: { id: supplierId },
    });

    // Buscar estado no Redis (temporário, apenas durante resposta a cotação)
    const stateKey = `supplier_state:${supplierId}`;
    const stateData = await redis.get(stateKey);

    let currentState: SupplierState = 'SUPPLIER_IDLE';
    let context: ConversationContext = {};

    if (stateData) {
      const parsed = JSON.parse(stateData);
      currentState = parsed.state;
      context = parsed.context;
    }

    logWithContext('info', 'Supplier message received', {
      supplierId,
      currentState,
      message,
    });

    try {
      // Rotear para handler do estado
      switch (currentState) {
        case 'SUPPLIER_IDLE':
          await whatsappService.sendMessage({
            to: supplier.phone,
            body: 'Você receberá notificações quando houver novas cotações disponíveis. 📬',
          });
          break;

        case 'SUPPLIER_AWAITING_RESPONSE':
          await this.handleAwaitingResponse(supplierId, supplier.phone, message, context);
          break;

        case 'SUPPLIER_AWAITING_PRICE':
          await this.handleAwaitingPrice(supplierId, supplier.phone, message, context);
          break;

        case 'SUPPLIER_AWAITING_DELIVERY':
          await this.handleAwaitingDelivery(supplierId, supplier.phone, message, context);
          break;

        case 'SUPPLIER_AWAITING_PAYMENT':
          await this.handleAwaitingPayment(supplierId, supplier.phone, message, context);
          break;

        case 'SUPPLIER_AWAITING_OBS':
          await this.handleAwaitingObs(supplierId, supplier.phone, message, context);
          break;

        default:
          await whatsappService.sendMessage({
            to: supplier.phone,
            body: Messages.UNKNOWN_INPUT,
          });
      }
    } catch (error) {
      logger.error('Error in SupplierFSM', { error, supplierId, currentState });
      await whatsappService.sendMessage({
        to: supplier.phone,
        body: Messages.ERROR,
      });
    }
  }

  /**
   * Estado SUPPLIER_AWAITING_RESPONSE - Aguardando aceite/recusa da cotação
   */
  private async handleAwaitingResponse(
    supplierId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const choice = message.trim();

    if (choice === '1') {
      // Fornecedor quer enviar proposta
      await whatsappService.sendMessage({
        to: phone,
        body: Messages.ASK_PRICE,
      });

      await this.setSupplierState(supplierId, 'SUPPLIER_AWAITING_PRICE', context);
      return;
    }

    if (choice === '2') {
      // Fornecedor recusou
      await whatsappService.sendMessage({
        to: phone,
        body: Messages.PROPOSAL_DECLINED,
      });

      await this.deleteSupplierState(supplierId);
      return;
    }

    await whatsappService.sendMessage({
      to: phone,
      body: 'Opção inválida. Digite *1* para enviar proposta ou *2* para recusar.',
    });
  }

  /**
   * Estado SUPPLIER_AWAITING_PRICE - Aguardando preço da proposta (fluxo 1 item via WhatsApp)
   */
  private async handleAwaitingPrice(
    supplierId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const price = parseFloat(message.replace(/[^\d.,-]/g, '').replace(',', '.'));

    if (isNaN(price) || price <= 0) {
      await whatsappService.sendMessage({
        to: phone,
        body: 'Preço inválido. Digite apenas números. Exemplo: *15000*',
      });
      return;
    }

    context.price = price;
    // Para 1 item via WhatsApp, criar ProposalItem no final com base no price total
    if (context.quoteItems && context.quoteItems.length > 0) {
      const item = context.quoteItems[0];
      context.proposalItems = [{
        quoteItemId: item.id,
        unitPrice: price / item.quantity,
        totalPrice: price,
      }];
    }

    await whatsappService.sendMessage({
      to: phone,
      body: Messages.ASK_DELIVERY,
    });

    await this.setSupplierState(supplierId, 'SUPPLIER_AWAITING_DELIVERY', context);
  }

  /**
   * Estado SUPPLIER_AWAITING_DELIVERY - Aguardando prazo de entrega
   */
  private async handleAwaitingDelivery(
    supplierId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const deliveryDays = parseInt(message.trim());

    if (isNaN(deliveryDays) || deliveryDays <= 0) {
      await whatsappService.sendMessage({
        to: phone,
        body: 'Prazo inválido. Digite apenas o número de dias. Exemplo: *5*',
      });
      return;
    }

    context.deliveryDays = deliveryDays;

    await whatsappService.sendMessage({
      to: phone,
      body: Messages.ASK_PAYMENT,
    });

    await this.setSupplierState(supplierId, 'SUPPLIER_AWAITING_PAYMENT', context);
  }

  /**
   * Estado SUPPLIER_AWAITING_PAYMENT - Aguardando condição de pagamento
   */
  private async handleAwaitingPayment(
    supplierId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const paymentTerms = message.trim();

    if (paymentTerms.length < 3) {
      await whatsappService.sendMessage({
        to: phone,
        body: 'Condição de pagamento muito curta. Digite pelo menos 3 caracteres.',
      });
      return;
    }

    context.paymentTerms = paymentTerms;

    await whatsappService.sendMessage({
      to: phone,
      body: Messages.ASK_SUPPLIER_OBS,
    });

    await this.setSupplierState(supplierId, 'SUPPLIER_AWAITING_OBS', context);
  }

  /**
   * Estado SUPPLIER_AWAITING_OBS - Aguardando observações
   */
  private async handleAwaitingObs(
    supplierId: string,
    phone: string,
    message: string,
    context: ConversationContext
  ): Promise<void> {
    const normalized = message.toLowerCase().trim();

    if (normalized !== 'não' && normalized !== 'nao') {
      context.observations = message.trim();
    }

    // Criar proposta no banco
    const quote = await prisma.quote.findUniqueOrThrow({
      where: { id: context.quoteId! },
      include: { items: true },
    });

    const proposalItems = context.proposalItems || [];
    const totalPrice = proposalItems.length > 0
      ? proposalItems.reduce((sum, it) => sum + it.totalPrice, 0)
      : context.price!;
    const isPartial = quote.items.length > 0 && proposalItems.length < quote.items.length;

    const proposal = await prisma.$transaction(async (tx) => {
      const newProposal = await tx.proposal.create({
        data: {
          quoteId: context.quoteId!,
          supplierId,
          tenantId: quote.tenantId,
          price: totalPrice,
          totalPrice,
          paymentTerms: context.paymentTerms!,
          deliveryDays: context.deliveryDays!,
          observations: context.observations,
          isOwnSupplier: context.isOwnSupplier || false,
          isPartial,
        },
      });

      if (proposalItems.length > 0) {
        await tx.proposalItem.createMany({
          data: proposalItems.map((it) => ({
            proposalId: newProposal.id,
            quoteItemId: it.quoteItemId,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice,
          })),
        });
      }

      return newProposal;
    });

    // Enviar feedback com ranking (assíncrono, não bloquear)
    supplierNotificationService.sendProposalRankingFeedback(proposal.id).catch((err) => {
      logger.error('Failed to send ranking feedback', { error: err, proposalId: proposal.id });
    });

    // Mensagem simples inicial (o ranking vem depois)
    await whatsappService.sendMessage({
      to: phone,
      body: Messages.PROPOSAL_SENT,
    });

    // Limpar estado
    await this.deleteSupplierState(supplierId);

    logger.info('Supplier proposal created', { supplierId, quoteId: context.quoteId });
  }

  /**
   * Salva estado do fornecedor no Redis (TTL de 30 minutos)
   */
  private async setSupplierState(
    supplierId: string,
    state: SupplierState,
    context: ConversationContext
  ): Promise<void> {
    const stateKey = `supplier_state:${supplierId}`;
    const data = JSON.stringify({ state, context });
    await redis.setex(stateKey, 7200, data); // 2 horas
  }

  /**
   * Remove estado do fornecedor do Redis
   */
  private async deleteSupplierState(supplierId: string): Promise<void> {
    const stateKey = `supplier_state:${supplierId}`;
    await redis.del(stateKey);
  }

  /**
   * Notifica fornecedor sobre nova cotação disponível
   * Define estado inicial como SUPPLIER_AWAITING_RESPONSE
   */
  async notifyNewQuote(supplierId: string, quoteId: string, isOwnSupplier: boolean): Promise<void> {
    const supplier = await prisma.supplier.findUniqueOrThrow({
      where: { id: supplierId },
    });

    const quote = await prisma.quote.findUniqueOrThrow({
      where: { id: quoteId },
      include: {
        producer: { select: { name: true, city: true } },
        items: true,
      },
    });

    const isMultiItem = quote.items.length > 1;

    // Carregar configurações do produtor para usar expiração personalizada
    const producerSettings = await ProducerSettingsService.getOrCreate(quote.producerId);

    // Para multi-item, gerar link do formulário web
    let proposalFormUrl: string | undefined;
    if (isMultiItem) {
      proposalFormUrl = await ProposalTokenService.generateFormUrl(
        quoteId,
        supplierId,
        producerSettings.proposalLinkExpiryHours
      );
    }

    const quoteData = {
      id: quote.id,
      producerName: quote.producer.name,
      producerCity: quote.producer.city,
      category: quote.category || undefined,
      items: quote.items.map((it) => ({
        product: it.product,
        quantity: it.quantity,
        unit: it.unit,
      })),
      region: quote.region,
      deadline: quote.deadline.toLocaleDateString('pt-BR'),
      observations: quote.observations || undefined,
      freight: quote.freight || undefined,
      proposalFormUrl,
    };

    await whatsappService.sendMessage({
      to: supplier.phone,
      body: Messages.NEW_QUOTE_NOTIFICATION(quoteData),
    });

    // Para 1 item: manter fluxo WhatsApp; para multi-item: só aguarda recusa (opção 2)
    const context: ConversationContext = {
      quoteId,
      isOwnSupplier,
      quoteItems: quote.items.map((it) => ({
        id: it.id,
        product: it.product,
        quantity: it.quantity,
        unit: it.unit,
      })),
    };

    await this.setSupplierState(supplierId, 'SUPPLIER_AWAITING_RESPONSE', context);

    logger.info('Supplier notified about new quote', { supplierId, quoteId, isMultiItem });
  }
}
