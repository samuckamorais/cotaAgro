import { prisma } from '../config/database';
import { ConversationContext } from '../types';
import { logger } from '../utils/logger';
import { metricsService } from '../services/metrics.service';

/**
 * Engine genérica da Máquina de Estados Finitos (FSM)
 * Gerencia transições, persistência de estado e contexto de conversação
 */
export class FSMEngine<TState extends string> {
  // Armazena timestamp da entrada no estado atual (para calcular duração)
  private stateTimestamps = new Map<string, number>();
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
    context: ConversationContext,
    previousStep?: TState
  ): Promise<void> {
    // Calcular duração no estado anterior
    let durationMs: number | undefined;
    if (previousStep) {
      const key = `${entityId}:${previousStep}`;
      const startTime = this.stateTimestamps.get(key);
      if (startTime) {
        durationMs = Date.now() - startTime;
        this.stateTimestamps.delete(key);
      }
    }

    // Registrar entrada no novo estado
    const newKey = `${entityId}:${step}`;
    this.stateTimestamps.set(newKey, Date.now());

    if (entityType === 'producer') {
      const producer = await prisma.producer.findUniqueOrThrow({
        where: { id: entityId },
        select: { tenantId: true },
      });
      await prisma.conversationState.upsert({
        where: { producerId: entityId },
        create: {
          producerId: entityId,
          tenantId: producer.tenantId,
          step,
          context: context as object,
        },
        update: {
          step,
          context: context as object,
        },
      });

      logger.info('FSM state updated', { entityId, entityType, step });
    }

    // Trackear transição de estado
    if (previousStep) {
      await metricsService.trackEvent({
        userId: entityId,
        userType: entityType,
        eventType: 'state_changed',
        state: step as string,
        previousState: previousStep as string,
        durationMs,
      });
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

  /**
   * Trackeia mensagem recebida
   */
  async trackMessageReceived(
    entityId: string,
    entityType: 'producer' | 'supplier',
    currentState: TState,
    metadata?: Record<string, any>
  ): Promise<void> {
    await metricsService.trackEvent({
      userId: entityId,
      userType: entityType,
      eventType: 'message_received',
      state: currentState as string,
      metadata,
    });
  }

  /**
   * Trackeia mensagem enviada
   */
  async trackMessageSent(
    entityId: string,
    entityType: 'producer' | 'supplier',
    currentState: TState,
    metadata?: Record<string, any>
  ): Promise<void> {
    await metricsService.trackEvent({
      userId: entityId,
      userType: entityType,
      eventType: 'message_sent',
      state: currentState as string,
      metadata,
    });
  }

  /**
   * Trackeia erro
   */
  async trackError(
    entityId: string,
    entityType: 'producer' | 'supplier',
    currentState: TState,
    errorType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await metricsService.trackEvent({
      userId: entityId,
      userType: entityType,
      eventType: 'error',
      state: currentState as string,
      errorType,
      metadata,
    });
  }
}
