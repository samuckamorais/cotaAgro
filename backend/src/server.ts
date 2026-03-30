import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { logger } from './utils/logger';
import { startConsolidateQuoteJob } from './jobs/consolidate-quote.job';
import { startExpireQuotesJob } from './jobs/expire-quotes.job';

/**
 * Inicialização do servidor
 */
async function start() {
  try {
    // Verificar conexão com banco de dados
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Verificar conexão com Redis
    await redis.ping();
    logger.info('✅ Redis connected');

    // Iniciar jobs periódicos
    startConsolidateQuoteJob();
    startExpireQuotesJob();

    // Criar e iniciar Express app
    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
      logger.info(`📦 Environment: ${env.NODE_ENV}`);
      logger.info(`🔌 WhatsApp Provider: ${env.WHATSAPP_PROVIDER}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');

      server.close(async () => {
        await prisma.$disconnect();
        await redis.quit();
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');

      server.close(async () => {
        await prisma.$disconnect();
        await redis.quit();
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start server
start();
