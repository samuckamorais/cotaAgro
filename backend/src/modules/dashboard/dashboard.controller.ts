import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { ErrorHandler } from '../../utils/error-handler';

export class DashboardController {
  /**
   * GET /api/dashboard/stats
   */
  static getStats = ErrorHandler.asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const stats = await DashboardService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * GET /api/dashboard/quotes-by-day
   */
  static getQuotesByDay = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    const data = await DashboardService.getQuotesByDay(days);

    res.json({
      success: true,
      data,
    });
  });

  /**
   * GET /api/dashboard/top-products
   */
  static getTopProducts = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

    const data = await DashboardService.getTopProducts(limit);

    res.json({
      success: true,
      data,
    });
  });

  /**
   * GET /api/dashboard
   */
  static getDashboard = ErrorHandler.asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const data = await DashboardService.getDashboardData();

    res.json({
      success: true,
      data,
    });
  });
}
