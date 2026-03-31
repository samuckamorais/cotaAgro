import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../modules/auth/auth.service';
import { createError } from '../utils/error-handler';

/**
 * Middleware de autenticação
 * Verifica se o token JWT é válido
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw createError.unauthorized('Token não fornecido');
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw createError.unauthorized('Formato de token inválido');
    }

    // Verificar token
    const decoded = await AuthService.verifyToken(token);

    // Adicionar informações do usuário à requisição
    (req as any).user = decoded;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware de autorização
 * Verifica se o usuário tem permissão para acessar um recurso
 */
export function authorize(resource: string, action: 'view' | 'create' | 'edit' | 'delete') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        throw createError.unauthorized('Usuário não autenticado');
      }

      const hasPermission = await AuthService.checkPermission(userId, resource, action);

      if (!hasPermission) {
        throw createError.forbidden('Você não tem permissão para realizar esta ação');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware que verifica se o usuário é admin
 */
export async function adminOnly(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;

    if (!user || user.role !== 'ADMIN') {
      throw createError.forbidden('Acesso restrito a administradores');
    }

    next();
  } catch (error) {
    next(error);
  }
}
