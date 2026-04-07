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
    const { from, body, type, mediaUrl, mimeType } = incomingMessage;

    // Se for mensagem de áudio, transcrever primeiro
    let processedMessage = body;
    let extractedData: any = null;

    if (type === 'audio' && mediaUrl) {
      try {
        processedMessage = await this.transcribeAudioMessage(from, mediaUrl, mimeType);
      } catch (error) {
        logger.error('Failed to transcribe audio', { error, from });
        await this.sendMessage({
          to: from,
          body: '❌ Não consegui entender o áudio. Tente novamente ou digite sua mensagem.',
        });
        return;
      }
    }

    // Se for mensagem de imagem, extrair dados da nota fiscal
    if (type === 'image' && mediaUrl) {
      try {
        extractedData = await this.analyzeImageMessage(from, mediaUrl);
        // Criar mensagem confirmando dados extraídos
        processedMessage = `nota fiscal: ${JSON.stringify(extractedData)}`;
      } catch (error) {
        logger.error('Failed to analyze image', { error, from });
        await this.sendMessage({
          to: from,
          body: '❌ Não consegui analisar a imagem. Tente fotografar novamente com melhor iluminação.',
        });
        return;
      }
    }

    logger.info('Processing incoming message', { from, body: processedMessage, type });

    try {
      // Verificar se é produtor
      const producer = await prisma.producer.findFirst({
        where: { phone: from },
        include: { conversationState: true },
      });

      if (producer) {
        // Rotear para FSM de produtor
        await this.handleProducerMessage(producer.id, processedMessage);
        return;
      }

      // Verificar se é fornecedor
      const supplier = await prisma.supplier.findFirst({
        where: { phone: from },
      });

      if (supplier) {
        // Rotear para FSM de fornecedor
        await this.handleSupplierMessage(supplier.id, processedMessage);
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
   * Transcreve mensagem de áudio
   */
  private async transcribeAudioMessage(
    phone: string,
    mediaUrl: string,
    mimeType?: string
  ): Promise<string> {
    // Enviar feedback visual
    await this.sendMessage({
      to: phone,
      body: '🎙️ Ouvindo áudio...',
    });

    // Download do áudio
    const audioBuffer = await this.downloadMedia(mediaUrl);

    // Transcrever com Whisper
    const transcription = await openaiService.transcribeAudio(
      audioBuffer,
      mimeType || 'audio/ogg'
    );

    // Confirmar transcrição
    await this.sendMessage({
      to: phone,
      body: `✅ Transcrevi: "${transcription}"\n\nProcessando...`,
    });

    return transcription;
  }

  /**
   * Analisa mensagem de imagem (nota fiscal)
   */
  private async analyzeImageMessage(
    phone: string,
    mediaUrl: string
  ): Promise<{
    product?: string;
    quantity?: string;
    unit?: string;
    price?: number;
    supplier?: string;
  }> {
    // Enviar feedback visual
    await this.sendMessage({
      to: phone,
      body: '📷 Analisando nota fiscal...',
    });

    // Download da imagem
    const imageBuffer = await this.downloadMedia(mediaUrl);

    // Analisar com GPT-4 Vision
    const extracted = await openaiService.analyzeInvoiceImage(imageBuffer);

    // Confirmar dados extraídos
    let confirmationMsg = '✅ *Extraí os seguintes dados:*\n\n';

    if (extracted.product) confirmationMsg += `📦 *Produto:* ${extracted.product}\n`;
    if (extracted.quantity && extracted.unit) {
      confirmationMsg += `📊 *Quantidade:* ${extracted.quantity} ${extracted.unit}\n`;
    }
    if (extracted.price) confirmationMsg += `💰 *Preço anterior:* R$ ${extracted.price.toFixed(2)}\n`;
    if (extracted.supplier) confirmationMsg += `🏢 *Fornecedor:* ${extracted.supplier}\n`;

    confirmationMsg += '\n*Quer cotar o mesmo produto?*\n\n';
    confirmationMsg += '┌────────────────────────────┐\n';
    confirmationMsg += '│ 1️⃣ Sim, mesma quantidade      │\n';
    confirmationMsg += '└────────────────────────────┘\n\n';
    confirmationMsg += '┌────────────────────────────┐\n';
    confirmationMsg += '│ 2️⃣ Sim, mas alterar quantidade│\n';
    confirmationMsg += '└────────────────────────────┘\n\n';
    confirmationMsg += '┌────────────────────────────┐\n';
    confirmationMsg += '│ 3️⃣ Nova cotação               │\n';
    confirmationMsg += '└────────────────────────────┘';

    await this.sendMessage({
      to: phone,
      body: confirmationMsg,
    });

    return extracted;
  }

  /**
   * Download de arquivo de mídia
   */
  private async downloadMedia(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download media: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      logger.error('Failed to download media', { error, url });
      throw new Error('Não consegui baixar o arquivo de mídia.');
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
