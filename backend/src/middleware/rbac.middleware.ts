import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { Resource, UserRole } from '@prisma/client';
import { createError } from '../utils/error-handler';

type PermissionAction = 'canView' | 'canCreate' | 'canEdit' | 'canDelete';

/**
 * Middleware RBAC genérico
 * Verifica se o usuário tem permissão para acessar um recurso com uma ação específica
 */
export const requirePermission = (resource: Resource, action: PermissionAction) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw createError.unauthorized('Não autenticado');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: { permissions: { where: { resource } } },
      });

      if (!user) {
        throw createError.unauthorized('Usuário não encontrado');
      }

      if (!user.active) {
        throw createError.unauthorized('Usuário inativo');
      }

      // ADMIN tem acesso total
      if (user.role === UserRole.ADMIN) {
        // Adicionar informações do usuário ao request
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId || undefined,
        };
        next();
        return;
      }

      // Verificar permissão específica
      const permission = user.permissions[0];
      if (!permission || !permission[action]) {
        throw createError.forbidden('Sem permissão para esta ação');
      }

      // Adicionar informações do usuário ao request
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
};

/**
 * Middleware que exige role ADMIN
 * Usado para rotas administrativas sensíveis
 */
export const requireAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userId) {
      throw createError.unauthorized('Não autenticado');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
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

    if (user.role !== UserRole.ADMIN) {
      throw createError.forbidden('Acesso restrito a administradores');
    }

    // Adicionar informações do usuário ao request
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
 * Middleware para WhatsApp Config
 * Requer ADMIN OU permissão específica de WHATSAPP_CONFIG
 */
export const requireWhatsAppConfigAccess = (action: PermissionAction) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw createError.unauthorized('Não autenticado');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: {
          permissions: {
            where: { resource: Resource.WHATSAPP_CONFIG },
          },
        },
      });

      if (!user) {
        throw createError.unauthorized('Usuário não encontrado');
      }

      if (!user.active) {
        throw createError.unauthorized('Usuário inativo');
      }

      // ADMIN tem acesso total
      if (user.role === UserRole.ADMIN) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId || undefined,
        };
        next();
        return;
      }

      // Verificar permissão específica de WhatsApp Config
      const permission = user.permissions[0];
      if (!permission || !permission[action]) {
        throw createError.forbidden(
          'Sem permissão para configurar WhatsApp. Entre em contato com o administrador.'
        );
      }

      // Adicionar informações do usuário ao request
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
};
