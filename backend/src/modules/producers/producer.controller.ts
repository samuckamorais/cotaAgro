import { Request, Response } from 'express';
import { ProducerService } from './producer.service';
import { ErrorHandler } from '../../utils/error-handler';
import { createProducerSchema, updateProducerSchema, paginationSchema } from '../../utils/validators';

export class ProducerController {
  /**
   * GET /api/producers
   * Lista produtores com paginação
   */
  static list = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = paginationSchema.parse(req.query);
    const tenantId = (req as any).user?.tenantId!;

    const result = await ProducerService.list(tenantId, page, limit);

    res.json({
      success: true,
      ...result,
    });
  });

  /**
   * GET /api/producers/:id
   * Busca produtor por ID
   */
  static getById = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const tenantId = (req as any).user?.tenantId!;

    const producer = await ProducerService.getById(tenantId, id);

    res.json({
      success: true,
      data: producer,
    });
  });

  /**
   * POST /api/producers
   * Cria novo produtor
   */
  static create = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = createProducerSchema.parse(req.body);
    const tenantId = (req as any).user?.tenantId!;

    const producer = await ProducerService.create(tenantId, data);

    res.status(201).json({
      success: true,
      data: producer,
    });
  });

  /**
   * PUT /api/producers/:id
   * Atualiza produtor
   */
  static update = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = updateProducerSchema.parse(req.body);
    const tenantId = (req as any).user?.tenantId!;

    const producer = await ProducerService.update(tenantId, id, data);

    res.json({
      success: true,
      data: producer,
    });
  });

  /**
   * DELETE /api/producers/:id
   * Deleta produtor
   */
  static delete = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const tenantId = (req as any).user?.tenantId!;

    await ProducerService.delete(tenantId, id);

    res.json({
      success: true,
      message: 'Produtor deletado com sucesso',
    });
  });

  /**
   * GET /api/producers/:id/suppliers
   * Lista fornecedores do produtor
   */
  static getSuppliers = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const tenantId = (req as any).user?.tenantId!;

    const suppliers = await ProducerService.getSuppliers(tenantId, id);

    res.json({
      success: true,
      data: suppliers,
    });
  });

  /**
   * POST /api/producers/:id/suppliers
   * Adiciona fornecedor ao produtor
   */
  static addSupplier = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { supplierId } = req.body;
    const tenantId = (req as any).user?.tenantId!;

    if (!supplierId) {
      throw ErrorHandler.asyncHandler;
    }

    const supplier = await ProducerService.addSupplier(tenantId, id, supplierId);

    res.status(201).json({
      success: true,
      data: supplier,
    });
  });

  /**
   * DELETE /api/producers/:id/suppliers/:supplierId
   * Remove fornecedor do produtor
   */
  static removeSupplier = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id, supplierId } = req.params;
    const tenantId = (req as any).user?.tenantId!;

    await ProducerService.removeSupplier(tenantId, id, supplierId);

    res.json({
      success: true,
      message: 'Fornecedor removido com sucesso',
    });
  });
}
