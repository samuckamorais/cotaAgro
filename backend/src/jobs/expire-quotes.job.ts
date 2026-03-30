import cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Job periódico (cron) para marcar cotações expiradas
 * Verifica cotações em status COLLECTING que ultrapassaram o expiresAt
 */
export function startExpireQuotesJob(): void {
  // Executar a cada 10 minutos
  cron.schedule('*/10 * * * *', async () => {
    logger.info('Running expire quotes job');

    try {
      const result = await prisma.quote.updateMany({
        where: {
          status: 'COLLECTING',
          expiresAt: {
            lt: new Date(),
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      if (result.count > 0) {
        logger.info(`Expired ${result.count} quote(s)`);
      }
    } catch (error) {
      logger.error('Error in expire quotes job', { error });
    }
  });

  logger.info('✅ Expire quotes job scheduled (every 10 minutes)');
}
