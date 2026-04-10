import { Request, Response } from 'express';
import { z } from 'zod';
import { QuoteFormService } from './quote-form.service';
import { ErrorHandler } from '../../utils/error-handler';
import { logger } from '../../utils/logger';

const submitSchema = z.object({
  category: z.string().min(2, 'Informe a categoria'),
  items: z
    .array(
      z.object({
        product: z.string().min(2, 'Nome do produto muito curto'),
        quantity: z.number().positive('Quantidade deve ser maior que zero'),
        unit: z.string().min(1, 'Informe a unidade'),
        observation: z.string().optional(),
      })
    )
    .min(1, 'Adicione ao menos um item'),
  region: z.string().min(2, 'Informe a região de entrega'),
  deadline: z.string().min(1, 'Informe o prazo'),
  observations: z.string().optional(),
  freight: z.enum(['CIF', 'FOB'], { errorMap: () => ({ message: 'Selecione CIF ou FOB' }) }),
  paymentTerms: z.string().min(2, 'Informe a condição de pagamento'),
  selectedSupplierIds: z.array(z.string()).min(1, 'Selecione ao menos um fornecedor'),
});

const TOKEN_ERROR_MESSAGES: Record<string, string> = {
  TOKEN_NOT_FOUND: 'Link inválido ou expirado.',
  TOKEN_ALREADY_USED: 'Esta cotação já foi enviada.',
  TOKEN_EXPIRED: 'Este link expirou. Solicite um novo pelo WhatsApp.',
};

export class QuoteFormController {
  /**
   * GET /api/cotacao/:token
   * Retorna dados do formulário de cotação (público)
   */
  static getForm = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;

    let data;
    try {
      data = await QuoteFormService.getFormData(token);
    } catch (err: any) {
      res.status(410).json({
        success: false,
        error: {
          code: err.message,
          message: TOKEN_ERROR_MESSAGES[err.message] || 'Link inválido.',
        },
      });
      return;
    }

    res.json({ success: true, data });
  });

  /**
   * POST /api/cotacao/:token
   * Recebe cotação preenchida no formulário (público)
   */
  static submitForm = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;

    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: parsed.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
      return;
    }

    let result;
    try {
      result = await QuoteFormService.submitForm(token, parsed.data);
    } catch (err: any) {
      res.status(410).json({
        success: false,
        error: {
          code: err.message,
          message: TOKEN_ERROR_MESSAGES[err.message] || 'Erro ao processar cotação.',
        },
      });
      return;
    }

    logger.info('Quote submitted via web form', result);

    res.status(201).json({ success: true, data: result });
  });
}
