import { WhatsAppFactory } from './whatsapp.factory';
import { IWhatsAppProvider } from './interfaces/whatsapp-provider.interface';
import { IncomingMessage, OutgoingMessage } from '../../types';
import { logger } from '../../utils/logger';
import { openaiService } from '../../services/openai.service';
import { prisma } from '../../config/database';
import { ProducerFSM } from '../../flows/producer.flow';
import { SupplierFSM } from '../../flows/supplier.flow';

/**
 * Serviço principal de WhatsApp
 * Orquestra recebimento de mensagens, interpretação NLU e roteamento para FSM
 */
export class WhatsAppService {
  private provider: IWhatsAppProvider;
  private producerFSM: ProducerFSM;
  private supplierFSM: SupplierFSM;

  constructor() {
    this.provider = WhatsAppFactory.create();
    this.producerFSM = new ProducerFSM();
    this.supplierFSM = new SupplierFSM();
  }

  /**
   * Envia mensagem via provider configurado
   */
  async sendMessage(message: OutgoingMessage): Promise<void> {
    try {
      await this.provider.sendMessage(message);
      logger.info(`Message sent via ${this.provider.getProviderName()}`, {
        to: message.to,
        bodyLength: message.body.length,
      });
    } catch (error) {
      logger.error('Failed to send message', { error, message });
      throw error;
    }
  }

  /**
   * Processa mensagem recebida do webhook
   * 1. Identifica se é produtor ou fornecedor
   * 2. Interpreta mensagem com OpenAI (se necessário)
   * 3. Roteia para FSM apropriada
   */
  async handleIncomingMessage(incomingMessage: IncomingMessage): Promise<void> {
    const { from, body } = incomingMessage;

    logger.info('Processing incoming message', { from, body });

    try {
      // Verificar se é produtor
      const producer = await prisma.producer.findUnique({
        where: { phone: from },
        include: { conversationState: true },
      });

      if (producer) {
        // Rotear para FSM de produtor
        await this.handleProducerMessage(producer.id, body);
        return;
      }

      // Verificar se é fornecedor
      const supplier = await prisma.supplier.findUnique({
        where: { phone: from },
      });

      if (supplier) {
        // Rotear para FSM de fornecedor
        await this.handleSupplierMessage(supplier.id, body);
        return;
      }

      // Usuário não cadastrado
      logger.warn('Message from unknown number', { from });
      await this.sendMessage({
        to: from,
        body: `Olá! Seu número não está cadastrado no CotaAgro.\n\nPara começar a usar, entre em contato com nosso suporte.`,
      });
    } catch (error) {
      logger.error('Error handling incoming message', { error, from, body });

      // Enviar mensagem de erro genérica
      await this.sendMessage({
        to: from,
        body: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes.',
      }).catch((sendError) => {
        logger.error('Failed to send error message', { sendError });
      });
    }
  }

  /**
   * Processa mensagem de produtor
   */
  private async handleProducerMessage(producerId: string, message: string): Promise<void> {
    // Buscar estado da conversa
    let state = await prisma.conversationState.findUnique({
      where: { producerId },
    });

    // Se não houver estado ou estiver IDLE, interpretar com NLU
    if (!state || state.step === 'IDLE') {
      const nluResult = await openaiService.interpretMessage(message);

      // Se detectar intenção de nova cotação, iniciar fluxo
      if (nluResult.intent === 'nova_cotacao') {
        await this.producerFSM.handleMessage(producerId, message, nluResult);
        return;
      }
    }

    // Rotear para handler do estado atual
    await this.producerFSM.handleMessage(producerId, message);
  }

  /**
   * Processa mensagem de fornecedor
   */
  private async handleSupplierMessage(supplierId: string, message: string): Promise<void> {
    await this.supplierFSM.handleMessage(supplierId, message);
  }

  /**
   * Parseia payload do webhook
   */
  parseWebhookPayload(payload: unknown): IncomingMessage {
    return this.provider.parseIncomingMessage(payload);
  }

  /**
   * Verifica webhook (usado em GET requests)
   */
  verifyWebhook(query: Record<string, unknown>): boolean {
    return this.provider.verifyWebhook(query);
  }
}

// Singleton
export const whatsappService = new WhatsAppService();
