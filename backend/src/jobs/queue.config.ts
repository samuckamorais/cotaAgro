import Bull from 'bull';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Configuração das filas Bull (Redis)
 */

// Fila para disparo de cotações
export const quoteDispatchQueue = new Bull('quote-dispatch', env.REDIS_URL, {
  defaultJobOptions: {
    removeOnComplete: 100, // manter últimos 100 jobs completos
    removeOnFail: 200, // manter últimos 200 jobs com falha
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Event handlers
quoteDispatchQueue.on('completed', (job) => {
  logger.info('Job completed', { jobId: job.id, queue: 'quote-dispatch' });
});

quoteDispatchQueue.on('failed', (job, err) => {
  logger.error('Job failed', {
    jobId: job?.id,
    queue: 'quote-dispatch',
    error: err.message,
  });
});

quoteDispatchQueue.on('error', (error) => {
  logger.error('Queue error', { queue: 'quote-dispatch', error });
});

logger.info('✅ Bull queues configured');
