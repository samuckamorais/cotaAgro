import { quoteDispatchQueue } from './queue.config';
import { prisma } from '../config/database';
import { SupplierFSM } from '../flows/supplier.flow';
import { logger, logWithContext } from '../utils/logger';

/**
 * Job para disparar cotação para fornecedores elegíveis
 * Adiciona job na fila Bull para processamento assíncrono
 */
export async function dispatchQuoteJob(quoteId: string): Promise<number> {
  // Adicionar job na fila
  await quoteDispatchQueue.add({ quoteId });

  logger.info('Quote dispatch job added to queue', { quoteId });

  // Retorna número estimado de fornecedores (cálculo rápido)
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: {
      producer: {
        include: {
          suppliers: true,
        },
      },
    },
  });

  let suppliersCount = 0;

  if (quote.supplierScope === 'MINE' || quote.supplierScope === 'ALL') {
    suppliersCount += quote.producer.suppliers.length;
  }

  if (quote.supplierScope === 'NETWORK' || quote.supplierScope === 'ALL') {
    const networkSuppliers = await prisma.supplier.count({
      where: {
        isNetworkSupplier: true,
        regions: { has: quote.region },
      },
    });
    suppliersCount += networkSuppliers;
  }

  return suppliersCount;
}

/**
 * Processor do job - executa o disparo efetivamente
 */
quoteDispatchQueue.process(async (job) => {
  const { quoteId } = job.data;

  logWithContext('info', 'Processing quote dispatch job', { quoteId });

  try {
    const quote = await prisma.quote.findUniqueOrThrow({
      where: { id: quoteId },
      include: {
        producer: {
          include: {
            suppliers: {
              include: {
                supplier: true,
              },
            },
          },
        },
      },
    });

    const supplierFSM = new SupplierFSM();
    const notifiedSuppliers = new Set<string>();

    // 1. Fornecedores próprios do produtor
    if (quote.supplierScope === 'MINE' || quote.supplierScope === 'ALL') {
      for (const ps of quote.producer.suppliers) {
        await supplierFSM.notifyNewQuote(ps.supplier.id, quoteId, true);
        notifiedSuppliers.add(ps.supplier.id);
      }
    }

    // 2. Fornecedores da rede
    if (quote.supplierScope === 'NETWORK' || quote.supplierScope === 'ALL') {
      const networkSuppliers = await prisma.supplier.findMany({
        where: {
          isNetworkSupplier: true,
          regions: { has: quote.region },
        },
      });

      for (const supplier of networkSuppliers) {
        // Evitar duplicatas (fornecedor que é próprio E da rede)
        if (!notifiedSuppliers.has(supplier.id)) {
          await supplierFSM.notifyNewQuote(supplier.id, quoteId, false);
          notifiedSuppliers.add(supplier.id);
        }
      }
    }

    // Atualizar status da cotação
    await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'COLLECTING' },
    });

    logWithContext('info', 'Quote dispatched successfully', {
      quoteId,
      suppliersCount: notifiedSuppliers.size,
    });

    return { success: true, suppliersCount: notifiedSuppliers.size };
  } catch (error) {
    logger.error('Error dispatching quote', { error, quoteId });
    throw error;
  }
});
