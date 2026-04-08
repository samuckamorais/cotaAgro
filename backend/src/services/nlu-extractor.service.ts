import { openaiService } from './openai.service';
import { ConversationContext, ProducerState } from '../types';
import { logger } from '../utils/logger';

/**
 * Serviço para extrair múltiplas entidades de mensagens do usuário usando GPT-4
 * Simplificado para reutilizar o OpenAI service existente
 */
export class NLUExtractorService {
  /**
   * Extrai todas as entidades possíveis de uma mensagem
   * Usa o OpenAI service existente para entender contexto
   */
  async extractEntities(
    message: string,
    currentState: ProducerState,
    context: ConversationContext
  ): Promise<Partial<ConversationContext>> {
    try {
      // Usar o método interpretMessage existente do OpenAI service
      const response = await openaiService.interpretMessage(
        message,
        `Estado atual: ${currentState}. Contexto: ${JSON.stringify(context)}`
      );

      // Se a resposta trouxe entities, usar elas diretamente
      if (response.entities && Object.keys(response.entities).length > 0) {
        return response.entities as Partial<ConversationContext>;
      }

      // Fallback: retornar vazio se não conseguiu extrair
      return {};
    } catch (error) {
      logger.error('NLU extraction failed', { error, message, currentState });
      // Fallback: retornar objeto vazio em caso de erro
      return {};
    }
  }

  /**
   * Determina próximo estado baseado nos dados que já foram coletados
   */
  determineNextState(context: ConversationContext): ProducerState {
    // Lógica de próximo estado baseado nos campos preenchidos
    if (!context.product) return 'AWAITING_PRODUCT';
    if (!context.quantity) return 'AWAITING_QUANTITY';
    if (!context.region) return 'AWAITING_REGION';
    if (!context.deadline) return 'AWAITING_DEADLINE';

    // Frete é obrigatório — sempre perguntar antes do escopo de fornecedores
    if (!context.freight) return 'AWAITING_FREIGHT';

    return 'AWAITING_SUPPLIER_SCOPE';
  }

  /**
   * Gera mensagem de confirmação com os dados extraídos
   */
  buildConfirmationMessage(context: ConversationContext, nextState: ProducerState): string {
    let message = `✅ *Entendi:*\n`;

    if (context.product) message += `📦 Produto: ${context.product}\n`;
    if (context.quantity && context.unit)
      message += `📊 Quantidade: ${context.quantity} ${context.unit}\n`;
    if (context.region) message += `📍 Região: ${context.region}\n`;
    if (context.deadline) {
      const deadlineDate = new Date(context.deadline);
      message += `⏰ Prazo: ${deadlineDate.toLocaleDateString('pt-BR')}\n`;
    }

    message += `\n`;

    // Adicionar próxima pergunta baseado no estado
    switch (nextState) {
      case 'AWAITING_PRODUCT':
        message += `*Qual produto você deseja cotar?*`;
        break;
      case 'AWAITING_QUANTITY':
        message += `*Qual a quantidade desejada?*\nExemplo: 100 sacas, 500 kg`;
        break;
      case 'AWAITING_REGION':
        message += `*Qual a região de entrega?*\nExemplo: Rio Verde, Goiânia`;
        break;
      case 'AWAITING_DEADLINE':
        message += `*Qual o prazo desejado?*\nExemplo: em 5 dias, 30/04`;
        break;
      case 'AWAITING_SUPPLIER_SCOPE':
        message += `Está correto? Digite *sim* para continuar ou *corrigir* para refazer.`;
        break;
      default:
        message += `Prosseguindo...`;
    }

    return message;
  }
}

export const nluExtractorService = new NLUExtractorService();
