import { Request, Response } from 'express';
import { SupplierService } from './supplier.service';
import { ErrorHandler } from '../../utils/error-handler';
import { createSupplierSchema, updateSupplierSchema, paginationSchema } from '../../utils/validators';
import { z } from 'zod';

export class SupplierController {
  /**
   * GET /api/suppliers
   */
  static list = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = paginationSchema.parse(req.query);
    const tenantId = (req as any).user?.tenantId!;

    const filterSchema = z.object({
      isNetworkSupplier: z.string().optional().transform((val) => val === 'true'),
      region: z.string().optional(),
      category: z.string().optional(),
      includeNetwork: z.string().optional().transform((val) => val !== 'false'),
    });

    const filters = filterSchema.parse(req.query);

    const result = await SupplierService.list(tenantId, page, limit, filters);

    res.json({
      success: true,
      ...result,
    });
  });

  /**
   * GET /api/suppliers/:id
   */
  static getById = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const tenantId = (req as any).user?.tenantId!;

    const supplier = await SupplierService.getById(tenantId, id);

    res.json({
      success: true,
      data: supplier,
    });
  });

  /**
   * POST /api/suppliers
   */
  static create = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = createSupplierSchema.parse(req.body);
    const tenantId = (req as any).user?.tenantId!;

    // Se isNetworkSupplier for true, passar null como tenantId (apenas ADMIN pode criar)
    const supplierTenantId = data.isNetworkSupplier ? null : tenantId;

    const supplier = await SupplierService.create(supplierTenantId, data);

    res.status(201).json({
      success: true,
      data: supplier,
    });
  });

  /**
   * PUT /api/suppliers/:id
   */
  static update = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = updateSupplierSchema.parse(req.body);
    const tenantId = (req as any).user?.tenantId!;

    const supplier = await SupplierService.update(tenantId, id, data);

    res.json({
      success: true,
      data: supplier,
    });
  });

  /**
   * DELETE /api/suppliers/:id
   */
  static delete = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const tenantId = (req as any).user?.tenantId!;

    await SupplierService.delete(tenantId, id);

    res.json({
      success: true,
      message: 'Fornecedor deletado com sucesso',
    });
  });
}
