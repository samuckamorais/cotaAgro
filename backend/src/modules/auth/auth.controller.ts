import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ErrorHandler } from '../../utils/error-handler';
import { z } from 'zod';
import { phoneSchema } from '../../utils/validators';

export class AuthController {
  /**
   * POST /api/auth/otp
   * Solicita código OTP
   */
  static requestOTP = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const schema = z.object({ phone: phoneSchema });
    const { phone } = schema.parse(req.body);

    await AuthService.requestOTP(phone);

    res.json({
      success: true,
      message: 'Código enviado via WhatsApp',
    });
  });

  /**
   * POST /api/auth/login
   * Valida OTP e retorna JWT token
   */
  static login = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const schema = z.object({
      phone: phoneSchema,
      code: z.string().length(6),
    });
    const { phone, code } = schema.parse(req.body);

    const token = await AuthService.validateOTP(phone, code);

    res.json({
      success: true,
      data: { token },
    });
  });
}
