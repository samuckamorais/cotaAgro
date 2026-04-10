import { Request, Response } from 'express';
import { ErrorHandler } from '../../utils/error-handler';
import { ReportService } from './report.service';

export class ReportController {
  static funnel = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tenantId, id: userId } = (req as any).user;
    const { from, to, producerId } = req.query as Record<string, string>;

    const data = await ReportService.getFunnel(tenantId, userId, { from, to, producerId });
    res.json({ success: true, data });
  });

  static operational = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tenantId, id: userId } = (req as any).user;

    const data = await ReportService.getOperational(tenantId, userId);
    res.json({ success: true, data });
  });

  static savings = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tenantId, id: userId } = (req as any).user;
    const { from, to, producerId } = req.query as Record<string, string>;

    const data = await ReportService.getSavings(tenantId, userId, { from, to, producerId });
    res.json({ success: true, data });
  });

  static supplierPerformance = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tenantId, id: userId } = (req as any).user;
    const { from, to } = req.query as Record<string, string>;

    const data = await ReportService.getSupplierPerformance(tenantId, userId, { from, to });
    res.json({ success: true, data });
  });

  static categoryRegion = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tenantId, id: userId } = (req as any).user;
    const { from, to, producerId } = req.query as Record<string, string>;

    const data = await ReportService.getCategoryRegion(tenantId, userId, { from, to, producerId });
    res.json({ success: true, data });
  });
}
