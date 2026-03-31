import { FSMEngine } from './fsm';
import { Messages } from './messages';
import { whatsappService } from '../modules/whatsapp/whatsapp.service';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { SupplierState, ConversationContext } from '../types';
import { logger, logWithContext } from '../utils/logger';

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
   * Estado SUPPLIER_AWAITING_PRICE - Aguardando preço da proposta
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
    await prisma.quote.findUniqueOrThrow({
      where: { id: context.quoteId! },
    });

    await prisma.proposal.create({
      data: {
        quoteId: context.quoteId!,
        supplierId,
        price: context.price!,
        totalPrice: context.price!, // pode ser calculado diferente
        paymentTerms: context.paymentTerms!,
        deliveryDays: context.deliveryDays!,
        observations: context.observations,
        isOwnSupplier: context.isOwnSupplier || false,
      },
    });

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
    await redis.setex(stateKey, 1800, data); // 30 minutos
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
    });

    const quoteData = {
      id: quote.id,
      product: quote.product,
      quantity: quote.quantity,
      unit: quote.unit,
      region: quote.region,
      deadline: quote.deadline.toLocaleDateString('pt-BR'),
      observations: quote.observations || undefined,
    };

    await whatsappService.sendMessage({
      to: supplier.phone,
      body: Messages.NEW_QUOTE_NOTIFICATION(quoteData),
    });

    // Definir estado inicial
    const context: ConversationContext = {
      quoteId,
      isOwnSupplier,
    };

    await this.setSupplierState(supplierId, 'SUPPLIER_AWAITING_RESPONSE', context);

    logger.info('Supplier notified about new quote', { supplierId, quoteId });
  }
}
