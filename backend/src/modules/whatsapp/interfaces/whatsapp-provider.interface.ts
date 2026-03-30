import { IncomingMessage, OutgoingMessage } from '../../../types';

/**
 * Interface abstrata para providers de WhatsApp
 * Implementações: Twilio e Evolution API
 */
export interface IWhatsAppProvider {
  /**
   * Envia mensagem para um número de telefone
   */
  sendMessage(message: OutgoingMessage): Promise<void>;

  /**
   * Verifica webhook (usado para validação inicial)
   * Retorna true se webhook é válido
   */
  verifyWebhook(query: Record<string, unknown>): boolean;

  /**
   * Parseia payload do webhook e retorna mensagem normalizada
   */
  parseIncomingMessage(payload: unknown): IncomingMessage;

  /**
   * Nome do provider (para logs)
   */
  getProviderName(): string;
}
