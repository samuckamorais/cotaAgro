import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { createError } from '../utils/error-handler';
import { prisma } from '../config/database';

// Estender interface Request para incluir userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userPhone?: string;
    }
  }
}

interface JwtPayload {
  userId: string;
  phone?: string;
  email?: string;
  role?: string;
}

/**
 * Middleware de autenticação JWT
 * Verifica token no header Authorization: Bearer <token>
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extrair token do header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError.unauthorized('Token não fornecido');
    }

    const token = authHeader.substring(7);

    // Verificar e decodificar token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw createError.unauthorized('Token expirado');
      }
      throw createError.unauthorized('Token inválido');
    }

    // Verificar se usuário ainda existe (tabela User para painel admin)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        tenantId: true,
      },
    });

    if (!user) {
      throw createError.unauthorized('Usuário não encontrado');
    }

    if (!user.active) {
      throw createError.unauthorized('Usuário inativo');
    }

    // Adicionar informações ao request
    req.userId = decoded.userId;
    req.userPhone = decoded.phone;
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId || undefined,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware opcional de autenticação
 * Não retorna erro se token não for fornecido
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      req.userId = decoded.userId;
      req.userPhone = decoded.phone;
    } catch {
      // Ignora erros de token em auth opcional
    }

    next();
  } catch (error) {
    next(error);
  }
};
