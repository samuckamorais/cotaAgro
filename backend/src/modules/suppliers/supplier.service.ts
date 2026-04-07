import { prisma } from '../../config/database';
import { CreateSupplierDTO, UpdateSupplierDTO, PaginatedResponse } from '../../types';
import { createError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';

export class SupplierService {
  /**
   * Lista fornecedores com paginação
   * @param tenantId - ID do tenant (obrigatório)
   * @param includeNetwork - Se true, inclui fornecedores da rede (tenantId null)
   */
  static async list(tenantId: string, page = 1, limit = 10, filters?: {
    isNetworkSupplier?: boolean;
    region?: string;
    category?: string;
    includeNetwork?: boolean;
  }): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * limit;

    const where: any = {};

    // Incluir fornecedores do tenant E da rede (se includeNetwork for true)
    const includeNetwork = filters?.includeNetwork !== false; // default true
    if (includeNetwork) {
      where.OR = [{ tenantId }, { tenantId: null }];
    } else {
      where.tenantId = tenantId;
    }

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
   * Permite acesso se for do tenant OU se for fornecedor da rede (tenantId null)
   */
  static async getById(tenantId: string, id: string) {
    const supplier = await prisma.supplier.findFirst({
      where: {
        id,
        OR: [{ tenantId }, { tenantId: null }], // Tenant ou rede
      },
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
   * @param tenantId - ID do tenant (null para fornecedores da rede)
   */
  static async create(tenantId: string | null, data: CreateSupplierDTO) {
    // Verificar se telefone já existe NO MESMO TENANT (ou na rede se tenantId for null)
    const existing = await prisma.supplier.findFirst({
      where: {
        tenantId: tenantId,
        phone: data.phone,
      },
    });

    if (existing) {
      throw createError.conflict('Telefone já cadastrado');
    }

    const supplier = await prisma.supplier.create({
      data: {
        ...data,
        tenantId,
      },
    });

    logger.info('Supplier created', { supplierId: supplier.id, tenantId });

    return supplier;
  }

  /**
   * Atualiza fornecedor
   */
  static async update(tenantId: string, id: string, data: UpdateSupplierDTO) {
    // Verificar se fornecedor existe e pode ser acessado
    const supplier = await this.getById(tenantId, id);

    // Se mudou telefone, verificar se novo telefone está disponível NO MESMO TENANT
    if (data.phone) {
      const existing = await prisma.supplier.findFirst({
        where: {
          tenantId: supplier.tenantId, // Mesmo tenant do fornecedor atual
          phone: data.phone,
          id: { not: id },
        },
      });

      if (existing) {
        throw createError.conflict('Telefone já cadastrado por outro fornecedor');
      }
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data,
    });

    logger.info('Supplier updated', { supplierId: id, tenantId });

    return updated;
  }

  /**
   * Deleta fornecedor
   * Apenas fornecedores do próprio tenant podem ser deletados (não da rede)
   */
  static async delete(tenantId: string, id: string) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, tenantId }, // Só pode deletar do próprio tenant
    });

    if (!supplier) {
      throw createError.notFound('Fornecedor não encontrado ou não pode ser deletado');
    }

    await prisma.supplier.delete({
      where: { id },
    });

    logger.info('Supplier deleted', { supplierId: id, tenantId });
  }
}
