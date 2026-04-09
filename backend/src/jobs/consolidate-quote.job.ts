import cron from 'node-cron';
import { prisma } from '../config/database';
import { whatsappService } from '../modules/whatsapp/whatsapp.service';
import { Messages } from '../flows/messages';
import { logger, logWithContext } from '../utils/logger';
import { env } from '../config/env';

function resultsUrl(quoteId: string): string {
  return `${env.FRONTEND_URL}/quotes/${quoteId}/resultados`;
}

/**
 * Job periódico (cron) para consolidar cotações
 * Verifica a cada X minutos se há cotações prontas para consolidação
 *
 * Condições de consolidação:
 * 1. Status = COLLECTING
 * 2. expiresAt atingido OU todos fornecedores responderam
 */
export function startConsolidateQuoteJob(): void {
  const intervalMinutes = env.CONSOLIDATE_CHECK_INTERVAL;

  // Executar a cada X minutos
  cron.schedule(`*/${intervalMinutes} * * * *`, async () => {
    logger.info('Running consolidate quote job');

    try {
      // Buscar cotações elegíveis para consolidação
      const quotes = await prisma.quote.findMany({
        where: {
          status: 'COLLECTING',
          expiresAt: {
            lte: new Date(),
          },
        },
        include: {
          producer: true,
          proposals: {
            include: {
              supplier: true,
            },
          },
        },
      });

      for (const quote of quotes) {
        await consolidateQuote(quote.id);
      }

      logger.info(`Consolidate job completed`, { quotesProcessed: quotes.length });
    } catch (error) {
      logger.error('Error in consolidate quote job', { error });
    }
  });

  logger.info(`✅ Consolidate quote job scheduled (every ${intervalMinutes} minutes)`);
}

/**
 * Consolida uma cotação específica
 * Ordena propostas e envia resumo ao produtor
 */
export async function consolidateQuote(quoteId: string): Promise<void> {
  logWithContext('info', 'Consolidating quote', { quoteId });

  try {
    const quote = await prisma.quote.findUniqueOrThrow({
      where: { id: quoteId },
      include: {
        producer: true,
        proposals: {
          include: {
            supplier: true,
          },
        },
      },
    });

    // Se não houver propostas, marcar como EXPIRED
    if (quote.proposals.length === 0) {
      await prisma.quote.update({
        where: { id: quoteId },
        data: { status: 'EXPIRED' },
      });

      // Pegar produto do primeiro item ou campo legado
      const itemName = (quote as any).items?.[0]?.product || quote.product || 'cotação';

      await whatsappService.sendMessage({
        to: quote.producer.phone,
        body: `⏰ Sua cotação *${itemName}* expirou sem receber propostas.\n\nTente novamente com um prazo maior ou outros fornecedores.`,
      });

      logWithContext('warn', 'Quote expired without proposals', { quoteId });
      return;
    }

    // Ordenar propostas: price ASC → deliveryDays ASC → isOwnSupplier DESC
    const sortedProposals = quote.proposals.sort((a, b) => {
      if (a.price !== b.price) return a.price - b.price;
      if (a.deliveryDays !== b.deliveryDays) return a.deliveryDays - b.deliveryDays;
      return a.isOwnSupplier === b.isOwnSupplier ? 0 : a.isOwnSupplier ? -1 : 1;
    });

    // Formatar propostas para mensagem
    const formattedProposals = sortedProposals.map((p, index) => ({
      rank: index + 1,
      supplierName: p.supplier.name,
      isOwn: p.isOwnSupplier,
      totalPrice: p.totalPrice,
      deliveryDays: p.deliveryDays,
      paymentTerms: p.paymentTerms,
      observations: p.observations || undefined,
    }));

    // Enviar resumo ao produtor + link para página de resultados
    const resultsLink = resultsUrl(quoteId);

    await whatsappService.sendMessage({
      to: quote.producer.phone,
      body: Messages.QUOTE_SUMMARY(formattedProposals),
    });

    await whatsappService.sendMessage({
      to: quote.producer.phone,
      body: `📊 *Veja o comparativo completo e escolha o vencedor:*\n\n🔗 ${resultsLink}`,
    });

    // Atualizar status e estado da conversa do produtor
    await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'SUMMARIZED' },
    });

    await prisma.conversationState.update({
      where: { producerId: quote.producerId },
      data: {
        step: 'AWAITING_CHOICE',
        context: { quoteId },
      },
    });

    logWithContext('info', 'Quote consolidated successfully', {
      quoteId,
      proposalsCount: sortedProposals.length,
    });
  } catch (error) {
    logger.error('Error consolidating quote', { error, quoteId });
    throw error;
  }
}
