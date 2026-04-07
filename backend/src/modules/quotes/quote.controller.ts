import { Request, Response } from 'express';
import { QuoteService } from './quote.service';
import { ErrorHandler, createError } from '../../utils/error-handler';
import { createQuoteSchema, paginationSchema } from '../../utils/validators';
import { z } from 'zod';

export class QuoteController {
  /**
   * GET /api/quotes
   */
  static list = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = paginationSchema.parse(req.query);
    const tenantId = (req as any).user?.tenantId!;

    const filterSchema = z.object({
      status: z.enum(['PENDING', 'COLLECTING', 'SUMMARIZED', 'CLOSED', 'EXPIRED']).optional(),
      producerId: z.string().uuid().optional(),
      startDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
      endDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
    });

    const filters = filterSchema.parse(req.query);

    const result = await QuoteService.list(tenantId, page, limit, filters);

    res.json({
      success: true,
      ...result,
    });
  });

  /**
   * GET /api/quotes/:id
   */
  static getById = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const tenantId = (req as any).user?.tenantId!;

    const quote = await QuoteService.getById(tenantId, id);

    res.json({
      success: true,
      data: quote,
    });
  });

  /**
   * POST /api/quotes
   */
  static create = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = createQuoteSchema.parse(req.body);
    const tenantId = (req as any).user?.tenantId!;

    const quote = await QuoteService.create(tenantId, data);

    res.status(201).json({
      success: true,
      data: quote,
    });
  });

  /**
   * POST /api/quotes/:id/dispatch
   */
  static dispatch = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const tenantId = (req as any).user?.tenantId!;

    const result = await QuoteService.dispatch(tenantId, id);

    res.json({
      success: true,
      message: 'Cotação disparada com sucesso',
      data: result,
    });
  });

  /**
   * PUT /api/quotes/:id/close
   */
  static close = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { supplierId } = req.body;
    const tenantId = (req as any).user?.tenantId!;

    if (!supplierId) {
      throw createError.badRequest('supplierId é obrigatório');
    }

    const quote = await QuoteService.close(tenantId, id, supplierId);

    res.json({
      success: true,
      message: 'Cotação fechada com sucesso',
      data: quote,
    });
  });

  /**
   * GET /api/quotes/stats
   */
  static getStats = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = (req as any).user?.tenantId!;
    const stats = await QuoteService.getStats(tenantId);

    res.json({
      success: true,
      data: stats,
    });
  });
}
