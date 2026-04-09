import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { ProducerSettingsService } from '../../services/producer-settings.service';
import { ErrorHandler, createError } from '../../utils/error-handler';

const updateSettingsSchema = z.object({
  proposalLinkExpiryHours: z.number().int().min(1).max(168).optional(), // 1h a 7 dias
  quoteDeadlineDays: z.number().int().min(1).max(30).optional(),
  defaultSupplierScope: z.enum(['OWN', 'NETWORK', 'ALL']).optional(),
  maxItemsPerQuote: z.number().int().min(1).max(20).optional(),
});

export class SettingsController {
  /**
   * GET /api/settings
   * Retorna as configurações do produtor vinculado ao usuário logado.
   */
  static get = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const producerId = await SettingsController.resolveProducerId(req);

    const settings = await ProducerSettingsService.getOrCreate(producerId);

    res.json({ success: true, data: settings });
  });

  /**
   * PUT /api/settings
   * Atualiza as configurações do produtor vinculado ao usuário logado.
   */
  static update = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const producerId = await SettingsController.resolveProducerId(req);

    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        },
      });
      return;
    }

    const settings = await ProducerSettingsService.update(producerId, parsed.data);

    res.json({ success: true, data: settings });
  });

  /**
   * Resolve o producerId a partir do usuário logado.
   * Usuário com role USER deve ter producerId vinculado.
   * Usuário ADMIN pode passar ?producerId= como query param (para gerenciamento).
   */
  private static async resolveProducerId(req: Request): Promise<string> {
    const user = req.user!;

    // Admin pode gerenciar qualquer produtor do tenant via query param
    if (user.role === 'ADMIN' && req.query.producerId) {
      const producerId = req.query.producerId as string;
      const producer = await prisma.producer.findFirst({
        where: { id: producerId, tenantId: user.tenantId },
        select: { id: true },
      });
      if (!producer) throw createError.notFound('Produtor não encontrado');
      return producer.id;
    }

    // Usuário comum: usa o producerId vinculado ao próprio usuário
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { producerId: true },
    });

    if (!userRecord?.producerId) {
      throw createError.forbidden('Usuário não está vinculado a um produtor');
    }

    return userRecord.producerId;
  }
}
