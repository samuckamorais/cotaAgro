import { prisma } from '../../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

interface LoginDTO {
  email: string;
  password: string;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class AuthService {
  /**
   * Faz login do usuário
   */
  static async login(data: LoginDTO) {
    const { email, password } = data;

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        permissions: true,
      },
    });

    if (!user) {
      throw createError.unauthorized('E-mail ou senha inválidos');
    }

    if (!user.active) {
      throw createError.forbidden('Usuário inativo');
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw createError.unauthorized('E-mail ou senha inválidos');
    }

    // Gerar token JWT
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    logger.info('User logged in', { userId: user.id, email: user.email });

    // Remover senha da resposta
    const { password: _, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
    };
  }

  /**
   * Verifica e decodifica um token JWT
   */
  static async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (error) {
      throw createError.unauthorized('Token inválido ou expirado');
    }
  }

  /**
   * Busca usuário com permissões
   */
  static async getUserWithPermissions(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissions: true,
      },
    });

    if (!user) {
      throw createError.notFound('Usuário não encontrado');
    }

    if (!user.active) {
      throw createError.forbidden('Usuário inativo');
    }

    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  /**
   * Altera senha do usuário
   */
  static async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw createError.notFound('Usuário não encontrado');
    }

    // Verificar senha antiga
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      throw createError.unauthorized('Senha atual inválida');
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    logger.info('User password changed', { userId });
  }

  /**
   * Verifica se usuário tem permissão para uma ação
   */
  static async checkPermission(
    userId: string,
    resource: string,
    action: 'view' | 'create' | 'edit' | 'delete'
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissions: {
          where: {
            resource: resource as any,
          },
        },
      },
    });

    if (!user) {
      return false;
    }

    // Admin tem acesso total
    if (user.role === 'ADMIN') {
      return true;
    }

    // Verificar permissão específica
    const permission = user.permissions[0];

    if (!permission) {
      return false;
    }

    switch (action) {
      case 'view':
        return permission.canView;
      case 'create':
        return permission.canCreate;
      case 'edit':
        return permission.canEdit;
      case 'delete':
        return permission.canDelete;
      default:
        return false;
    }
  }
}
