import { prisma } from '../../config/database';
import { CreateSupplierDTO, UpdateSupplierDTO, PaginatedResponse } from '../../types';
import { createError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';

export class SupplierService {
  /**
   * Lista fornecedores com paginação
   */
  static async list(page = 1, limit = 10, filters?: {
    isNetworkSupplier?: boolean;
    region?: string;
    category?: string;
  }): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.isNetworkSupplier !== undefined) {
      where.isNetworkSupplier = filters.isNetworkSupplier;
    }

    if (filters?.region) {
      where.regions = { has: filters.region };
    }

    if (filters?.category) {
      where.categories = { has: filters.category };
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        skip,
        take: limit,
        where,
        include: {
          _count: {
            select: {
              producers: true,
              proposals: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplier.count({ where }),
    ]);

    return {
      data: suppliers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca fornecedor por ID
   */
  static async getById(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        producers: {
          include: {
            producer: true,
          },
        },
        proposals: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            quote: {
              include: {
                producer: true,
              },
            },
          },
        },
      },
    });

    if (!supplier) {
      throw createError.notFound('Fornecedor não encontrado');
    }

    return supplier;
  }

  /**
   * Cria novo fornecedor
   */
  static async create(data: CreateSupplierDTO) {
    const existing = await prisma.supplier.findUnique({
      where: { phone: data.phone },
    });

    if (existing) {
      throw createError.conflict('Telefone já cadastrado');
    }

    const supplier = await prisma.supplier.create({
      data,
    });

    logger.info('Supplier created', { supplierId: supplier.id });

    return supplier;
  }

  /**
   * Atualiza fornecedor
   */
  static async update(id: string, data: UpdateSupplierDTO) {
    await this.getById(id);

    if (data.phone) {
      const existing = await prisma.supplier.findFirst({
        where: {
          phone: data.phone,
          id: { not: id },
        },
      });

      if (existing) {
        throw createError.conflict('Telefone já cadastrado por outro fornecedor');
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data,
    });

    logger.info('Supplier updated', { supplierId: id });

    return supplier;
  }

  /**
   * Deleta fornecedor
   */
  static async delete(id: string) {
    await this.getById(id);

    await prisma.supplier.delete({
      where: { id },
    });

    logger.info('Supplier deleted', { supplierId: id });
  }
}
