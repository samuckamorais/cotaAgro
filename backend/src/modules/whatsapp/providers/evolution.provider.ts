import axios, { AxiosInstance } from 'axios';
import { IWhatsAppProvider } from '../interfaces/whatsapp-provider.interface';
import { IncomingMessage, OutgoingMessage } from '../../../types';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import { createError } from '../../../utils/error-handler';

/**
 * Provider Evolution API (Open Source) para WhatsApp
 * Requer: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME
 */
export class EvolutionProvider implements IWhatsAppProvider {
  private client: AxiosInstance;
  private instanceName: string;

  constructor() {
    if (!env.EVOLUTION_API_URL || !env.EVOLUTION_API_KEY || !env.EVOLUTION_INSTANCE_NAME) {
      logger.warn('Evolution API credentials not configured. Using mock mode.');
    }

    this.instanceName = env.EVOLUTION_INSTANCE_NAME || '';

    this.client = axios.create({
      baseURL: env.EVOLUTION_API_URL,
      headers: {
        'Content-Type': 'application/json',
        apikey: env.EVOLUTION_API_KEY || '',
      },
      timeout: 10000,
    });
  }

  async sendMessage(message: OutgoingMessage): Promise<void> {
    try {
      // Mock mode se credenciais não estiverem configuradas
      if (!env.EVOLUTION_API_URL) {
        logger.info('[MOCK] Evolution sendMessage', message);
        return;
      }

      // Remover '+' do número se houver (Evolution API não aceita)
      const number = message.to.replace('+', '');

      const payload = {
        number,
        text: message.body,
      };

      const response = await this.client.post(
        `/message/sendText/${this.instanceName}`,
        payload
      );

      logger.info('Evolution message sent', {
        to: message.to,
        status: response.status,
        messageId: response.data?.key?.id,
      });
    } catch (error) {
      logger.error('Evolution sendMessage error', { error, message });
      throw createError.badRequest('Erro ao enviar mensagem via Evolution API');
    }
  }

  verifyWebhook(_query: Record<string, unknown>): boolean {
    // Evolution API não requer verificação especial
    // A autenticação é feita via apikey no header
    return true;
  }

  parseIncomingMessage(payload: unknown): IncomingMessage {
    const body = payload as Record<string, unknown>;

    // Formato do webhook Evolution API:
    // {
    //   event: "messages.upsert",
    //   data: {
    //     key: { remoteJid: "5564999999999@s.whatsapp.net" },
    //     message: { conversation: "mensagem do usuário" },
    //     messageTimestamp: 1234567890
    //   }
    // }

    const data = body.data as Record<string, unknown>;
    const key = data?.key as Record<string, unknown>;
    const message = data?.message as Record<string, unknown>;

    const remoteJid = key?.remoteJid as string;
    const conversation = message?.conversation as string;

    if (!remoteJid || !conversation) {
      throw createError.badRequest('Invalid Evolution API webhook payload');
    }

    // Extrair número do remoteJid (formato: 5564999999999@s.whatsapp.net)
    const from = '+' + remoteJid.split('@')[0];

    return {
      from,
      body: conversation,
      timestamp: data.messageTimestamp
        ? new Date(Number(data.messageTimestamp) * 1000)
        : new Date(),
    };
  }

  getProviderName(): string {
    return 'Evolution API';
  }

  /**
   * Verifica status da instância Evolution API
   */
  async checkInstanceStatus(): Promise<boolean> {
    try {
      const response = await this.client.get(`/instance/connectionState/${this.instanceName}`);
      const state = response.data?.instance?.state;
      return state === 'open';
    } catch (error) {
      logger.error('Evolution instance status check failed', { error });
      return false;
    }
  }
}
