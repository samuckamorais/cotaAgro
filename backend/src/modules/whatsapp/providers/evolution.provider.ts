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

    logger.debug('Evolution webhook raw payload', {
      event: body.event,
      dataKeys: body.data ? Object.keys(body.data as object) : [],
    });

    // Ignorar eventos que não são mensagens recebidas
    const event = body.event as string;
    if (event && event !== 'messages.upsert') {
      throw createError.badRequest(`Evento ignorado: ${event}`);
    }

    const data = body.data as Record<string, unknown>;
    const key = data?.key as Record<string, unknown>;
    const msgObj = data?.message as Record<string, unknown>;

    // Ignorar mensagens enviadas pelo próprio bot (fromMe = true)
    if (key?.fromMe === true) {
      throw createError.badRequest('Mensagem própria ignorada');
    }

    // Ignorar mensagens de grupos
    const remoteJid = key?.remoteJid as string;
    if (!remoteJid || remoteJid.includes('@g.us')) {
      throw createError.badRequest('Mensagem de grupo ignorada');
    }

    // Extrair texto da mensagem (suporta vários formatos)
    let conversation =
      (msgObj?.conversation as string) ||
      (msgObj?.extendedTextMessage as any)?.text ||
      (msgObj?.buttonsResponseMessage as any)?.selectedDisplayText ||
      (msgObj?.listResponseMessage as any)?.title ||
      (msgObj?.imageMessage as any)?.caption ||
      '';

    // Suporte a contatos compartilhados (contactMessage)
    // Evolution API envia: { contactMessage: { displayName, vcard } }
    const contactMsg = msgObj?.contactMessage as any;
    if (!conversation && contactMsg) {
      const vcard = contactMsg.vcard as string | undefined;
      const displayName = contactMsg.displayName as string | undefined;
      if (vcard) {
        conversation = vcard;
      } else if (displayName) {
        conversation = `CONTATO: ${displayName}`;
      }
    }

    if (!conversation) {
      throw createError.badRequest('Mensagem sem texto — tipo de mídia não suportado');
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
