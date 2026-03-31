import twilio from 'twilio';
import { IWhatsAppProvider } from '../interfaces/whatsapp-provider.interface';
import { IncomingMessage, OutgoingMessage } from '../../../types';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import { createError } from '../../../utils/error-handler';

/**
 * Provider Twilio para WhatsApp Business API
 * Requer: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER
 */
export class TwilioProvider implements IWhatsAppProvider {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor() {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_WHATSAPP_NUMBER) {
      logger.warn('Twilio credentials not configured. Using mock mode.');
    }

    this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    this.fromNumber = env.TWILIO_WHATSAPP_NUMBER || '';
  }

  async sendMessage(message: OutgoingMessage): Promise<void> {
    try {
      // Mock mode se credenciais não estiverem configuradas
      if (!env.TWILIO_ACCOUNT_SID) {
        logger.info('[MOCK] Twilio sendMessage', message);
        return;
      }

      // Twilio requer prefixo "whatsapp:" nos números
      const from = `whatsapp:${this.fromNumber}`;
      const to = `whatsapp:${message.to}`;

      const result = await this.client.messages.create({
        from,
        to,
        body: message.body,
      });

      logger.info('Twilio message sent', {
        sid: result.sid,
        to: message.to,
        status: result.status,
      });
    } catch (error) {
      logger.error('Twilio sendMessage error', { error, message });
      throw createError.badRequest('Erro ao enviar mensagem via Twilio');
    }
  }

  verifyWebhook(_query: Record<string, unknown>): boolean {
    // Twilio não requer verificação GET inicial (diferente do Facebook/Meta)
    // A validação é feita via assinatura X-Twilio-Signature no POST
    return true;
  }

  parseIncomingMessage(payload: unknown): IncomingMessage {
    const body = payload as Record<string, unknown>;

    // Formato do webhook Twilio:
    // {
    //   From: "whatsapp:+5564999999999",
    //   Body: "mensagem do usuário",
    //   MessageSid: "SM..."
    // }

    const from = (body.From as string)?.replace('whatsapp:', '') || '';
    const messageBody = (body.Body as string) || '';

    if (!from || !messageBody) {
      throw createError.badRequest('Invalid Twilio webhook payload');
    }

    return {
      from,
      body: messageBody,
      timestamp: new Date(),
    };
  }

  getProviderName(): string {
    return 'Twilio';
  }

  /**
   * Valida assinatura do webhook Twilio
   * Twilio assina cada requisição com X-Twilio-Signature
   */
  validateSignature(signature: string, url: string, params: Record<string, string>): boolean {
    if (!env.TWILIO_AUTH_TOKEN) {
      logger.warn('Twilio signature validation skipped (no auth token)');
      return true;
    }

    return twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, params);
  }
}
