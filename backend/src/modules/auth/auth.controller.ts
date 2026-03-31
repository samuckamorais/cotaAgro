import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ErrorHandler } from '../../utils/error-handler';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
});

export class AuthController {
  /**
   * POST /api/auth/login
   */
  static login = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = loginSchema.parse(req.body);

    const result = await AuthService.login(data);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * GET /api/auth/me
   */
  static me = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user.userId;

    const user = await AuthService.getUserWithPermissions(userId);

    res.json({
      success: true,
      data: user,
    });
  });

  /**
   * POST /api/auth/change-password
   */
  static changePassword = ErrorHandler.asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user.userId;
      const data = changePasswordSchema.parse(req.body);

      await AuthService.changePassword(userId, data.oldPassword, data.newPassword);

      res.json({
        success: true,
        message: 'Senha alterada com sucesso',
      });
    }
  );
}
