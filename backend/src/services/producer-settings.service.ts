import { prisma } from '../config/database';
import { SupplierScope } from '@prisma/client';

export interface ProducerSettingsData {
  proposalLinkExpiryHours: number;
  quoteDeadlineDays: number;
  defaultSupplierScope: SupplierScope;
  maxItemsPerQuote: number;
}

const DEFAULTS: ProducerSettingsData = {
  proposalLinkExpiryHours: 24,
  quoteDeadlineDays: 3,
  defaultSupplierScope: 'ALL',
  maxItemsPerQuote: 10,
};

export class ProducerSettingsService {
  /**
   * Retorna as configurações do produtor, criando com valores padrão se não existir.
   */
  static async getOrCreate(producerId: string): Promise<ProducerSettingsData> {
    const settings = await prisma.producerSettings.upsert({
      where: { producerId },
      create: { producerId, ...DEFAULTS },
      update: {},
    });

    return {
      proposalLinkExpiryHours: settings.proposalLinkExpiryHours,
      quoteDeadlineDays: settings.quoteDeadlineDays,
      defaultSupplierScope: settings.defaultSupplierScope,
      maxItemsPerQuote: settings.maxItemsPerQuote,
    };
  }

  /**
   * Atualiza as configurações do produtor (upsert).
   */
  static async update(
    producerId: string,
    data: Partial<ProducerSettingsData>
  ): Promise<ProducerSettingsData> {
    const settings = await prisma.producerSettings.upsert({
      where: { producerId },
      create: { producerId, ...DEFAULTS, ...data },
      update: data,
    });

    return {
      proposalLinkExpiryHours: settings.proposalLinkExpiryHours,
      quoteDeadlineDays: settings.quoteDeadlineDays,
      defaultSupplierScope: settings.defaultSupplierScope,
      maxItemsPerQuote: settings.maxItemsPerQuote,
    };
  }
}
