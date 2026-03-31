import { prisma } from '../../config/database';
import bcrypt from 'bcryptjs';
import { createError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import { PaginatedResponse } from '../../types';

interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  role?: 'ADMIN' | 'USER';
  permissions?: Array<{
    resource: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }>;
}

interface UpdateUserDTO {
  name?: string;
  email?: string;
  password?: string;
  role?: 'ADMIN' | 'USER';
  active?: boolean;
  permissions?: Array<{
    resource: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }>;
}

export class UserService {
  /**
   * Lista usuários com paginação
   */
  static async list(page = 1, limit = 10): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          permissions: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca usuário por ID
   */
  static async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        permissions: true,
      },
    });

    if (!user) {
      throw createError.notFound('Usuário não encontrado');
    }

    return user;
  }

  /**
   * Cria novo usuário
   */
  static async create(data: CreateUserDTO) {
    // Verificar se email já existe
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw createError.conflict('E-mail já cadastrado');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        role: data.role || 'USER',
        permissions: data.permissions
          ? {
              create: data.permissions.map((p) => ({
                resource: p.resource as any,
                canView: p.canView,
                canCreate: p.canCreate,
                canEdit: p.canEdit,
                canDelete: p.canDelete,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        permissions: true,
      },
    });

    logger.info('User created', { userId: user.id });

    return user;
  }

  /**
   * Atualiza usuário
   */
  static async update(id: string, data: UpdateUserDTO) {
    // Verificar se usuário existe
    await this.getById(id);

    // Se mudou email, verificar se novo email está disponível
    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: {
          email: data.email.toLowerCase(),
          id: { not: id },
        },
      });

      if (existing) {
        throw createError.conflict('E-mail já cadastrado por outro usuário');
      }
    }

    // Preparar dados para atualização
    const updateData: any = {
      name: data.name,
      email: data.email?.toLowerCase(),
      role: data.role,
      active: data.active,
    };

    // Se forneceu nova senha, fazer hash
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    // Atualizar usuário
    await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        updatedAt: true,
        permissions: true,
      },
    });

    // Atualizar permissões se fornecidas
    if (data.permissions) {
      // Deletar permissões antigas
      await prisma.permission.deleteMany({
        where: { userId: id },
      });

      // Criar novas permissões
      await prisma.permission.createMany({
        data: data.permissions.map((p) => ({
          userId: id,
          resource: p.resource as any,
          canView: p.canView,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
        })),
      });
    }

    logger.info('User updated', { userId: id });

    return await this.getById(id);
  }

  /**
   * Deleta usuário
   */
  static async delete(id: string) {
    await this.getById(id);

    await prisma.user.delete({
      where: { id },
    });

    logger.info('User deleted', { userId: id });
  }
}
