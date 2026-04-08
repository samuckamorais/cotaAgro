import { Request, Response } from 'express';
import { whatsappService } from './whatsapp.service';
import { ErrorHandler } from '../../utils/error-handler';
import { logger } from '../../utils/logger';

/**
 * Controller para webhook do WhatsApp
 * Recebe mensagens dos providers (Twilio/Evolution API)
 */
export class WhatsAppController {
  /**
   * GET /api/whatsapp/webhook
   * Verificação inicial do webhook (usado por alguns providers)
   */
  static verifyWebhook = ErrorHandler.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const isValid = whatsappService.verifyWebhook(req.query);

      if (isValid) {
        res.status(200).send('Webhook verified');
      } else {
        res.status(403).send('Webhook verification failed');
      }
    }
  );

  /**
   * POST /api/whatsapp/webhook
   * Recebe mensagens do WhatsApp via provider
   */
  static handleWebhook = ErrorHandler.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      logger.info('Webhook received', { event: req.body?.event, from: req.body?.data?.key?.remoteJid });

      let incomingMessage;
      try {
        incomingMessage = whatsappService.parseWebhookPayload(req.body);
      } catch (err: any) {
        // Eventos ignorados (fromMe, grupos, eventos não-mensagem) — responder 200 silenciosamente
        logger.debug('Webhook payload skipped', { reason: err.message });
        res.status(200).json({ success: true });
        return;
      }

      // Processar mensagem de forma assíncrona (não bloqueia resposta)
      whatsappService.handleIncomingMessage(incomingMessage).catch((error) => {
        logger.error('Error processing webhook message asynchronously', { error });
      });

      // Responder imediatamente (200 OK) para o provider
      res.status(200).json({ success: true });
    }
  );
}
