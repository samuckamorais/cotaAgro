import { FSMEngine } from './fsm';
import { Messages } from './messages';
import { whatsappService } from '../modules/whatsapp/whatsapp.service';
import { prisma } from '../config/database';
import { ProducerState, NLUResult, ConversationContext } from '../types';
import { logger, logWithContext } from '../utils/logger';
import { parseDeadline } from '../utils/validators';
import { dispatchQuoteJob } from '../jobs/dispatch-quote.job';

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

        case 'AWAITING_CONFIRMATION':
          await this.handleAwaitingConfirmation(producerId, producer.phone, message, context);
          break;

        case 'AWAITING_CHOICE':
          await this.handleAwaitingChoice(producerId, producer.phone, message, context);
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
    let scopeLabel: string;

    switch (choice) {
      case '1':
        scope = 'MINE';
        scopeLabel = 'Apenas seus fornecedores';
        break;
      case '2':
        scope = 'NETWORK';
        scopeLabel = 'Apenas rede CotaAgro';
        break;
      case '3':
        scope = 'ALL';
        scopeLabel = 'Todos (seus + rede)';
        break;
      default:
        await whatsappService.sendMessage({
          to: phone,
          body: 'Opção inválida. Digite *1*, *2* ou *3*.',
        });
        return;
    }

    context.supplierScope = scope;

    // Enviar resumo para confirmação
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

    await this.setState(producerId, 'producer', 'AWAITING_CONFIRMATION', context);
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
}
