import { prisma } from '../config/database';
import { ConversationContext, ProducerState, SupplierState } from '../types';
import { logger } from '../utils/logger';

/**
 * Engine genérica da Máquina de Estados Finitos (FSM)
 * Gerencia transições, persistência de estado e contexto de conversação
 */
export class FSMEngine<TState extends string> {
  /**
   * Busca estado atual da conversa
   */
  async getState(entityId: string, entityType: 'producer' | 'supplier'): Promise<{
    step: TState;
    context: ConversationContext;
  } | null> {
    if (entityType === 'producer') {
      const state = await prisma.conversationState.findUnique({
        where: { producerId: entityId },
      });

      if (!state) return null;

      return {
        step: state.step as TState,
        context: state.context as ConversationContext,
      };
    }

    // Suppliers armazenam estado no Redis (temporário)
    // TODO: implementar se necessário
    return null;
  }

  /**
   * Atualiza estado da conversa
   */
  async setState(
    entityId: string,
    entityType: 'producer' | 'supplier',
    step: TState,
    context: ConversationContext
  ): Promise<void> {
    if (entityType === 'producer') {
      await prisma.conversationState.upsert({
        where: { producerId: entityId },
        create: {
          producerId: entityId,
          step,
          context,
        },
        update: {
          step,
          context,
        },
      });

      logger.info('FSM state updated', { entityId, entityType, step });
    }
  }

  /**
   * Reseta estado para IDLE
   */
  async resetState(entityId: string, entityType: 'producer' | 'supplier'): Promise<void> {
    if (entityType === 'producer') {
      await prisma.conversationState.update({
        where: { producerId: entityId },
        data: {
          step: 'IDLE',
          context: {},
        },
      });

      logger.info('FSM state reset', { entityId, entityType });
    }
  }

  /**
   * Valida se a transição é permitida
   */
  isValidTransition(currentState: TState, nextState: TState, validTransitions: Record<TState, TState[]>): boolean {
    const allowedNextStates = validTransitions[currentState];
    return allowedNextStates?.includes(nextState) || false;
  }
}
