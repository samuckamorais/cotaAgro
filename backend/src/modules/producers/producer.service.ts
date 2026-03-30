import { prisma } from '../../config/database';
import { CreateProducerDTO, UpdateProducerDTO, PaginatedResponse } from '../../types';
import { createError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';

export class ProducerService {
  /**
   * Lista produtores com paginação
   */
  static async list(page = 1, limit = 10): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * limit;

    const [producers, total] = await Promise.all([
      prisma.producer.findMany({
        skip,
        take: limit,
        include: {
          subscription: true,
          _count: {
            select: {
              quotes: true,
              suppliers: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.producer.count(),
    ]);

    return {
      data: producers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca produtor por ID
   */
  static async getById(id: string) {
    const producer = await prisma.producer.findUnique({
      where: { id },
      include: {
        subscription: true,
        suppliers: {
          include: {
            supplier: true,
          },
        },
        quotes: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { proposals: true },
            },
          },
        },
      },
    });

    if (!producer) {
      throw createError.notFound('Produtor não encontrado');
    }

    return producer;
  }

  /**
   * Cria novo produtor
   */
  static async create(data: CreateProducerDTO) {
    // Verificar se telefone já existe
    const existing = await prisma.producer.findUnique({
      where: { phone: data.phone },
    });

    if (existing) {
      throw createError.conflict('Telefone já cadastrado');
    }

    const producer = await prisma.producer.create({
      data: {
        name: data.name,
        phone: data.phone,
        region: data.region,
        conversationState: {
          create: {
            step: 'IDLE',
            context: {},
          },
        },
      },
      include: {
        conversationState: true,
      },
    });

    logger.info('Producer created', { producerId: producer.id });

    return producer;
  }

  /**
   * Atualiza produtor
   */
  static async update(id: string, data: UpdateProducerDTO) {
    // Verificar se produtor existe
    await this.getById(id);

    // Se mudou telefone, verificar se novo telefone está disponível
    if (data.phone) {
      const existing = await prisma.producer.findFirst({
        where: {
          phone: data.phone,
          id: { not: id },
        },
      });

      if (existing) {
        throw createError.conflict('Telefone já cadastrado por outro produtor');
      }
    }

    const producer = await prisma.producer.update({
      where: { id },
      data,
      include: {
        subscription: true,
      },
    });

    logger.info('Producer updated', { producerId: id });

    return producer;
  }

  /**
   * Deleta produtor
   */
  static async delete(id: string) {
    await this.getById(id);

    await prisma.producer.delete({
      where: { id },
    });

    logger.info('Producer deleted', { producerId: id });
  }

  /**
   * Lista fornecedores do produtor
   */
  static async getSuppliers(producerId: string) {
    await this.getById(producerId);

    const suppliers = await prisma.producerSupplier.findMany({
      where: { producerId },
      include: {
        supplier: true,
      },
    });

    return suppliers.map((ps) => ps.supplier);
  }

  /**
   * Adiciona fornecedor ao produtor
   */
  static async addSupplier(producerId: string, supplierId: string) {
    // Verificar se produtor e fornecedor existem
    await this.getById(producerId);

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw createError.notFound('Fornecedor não encontrado');
    }

    // Verificar se já não está vinculado
    const existing = await prisma.producerSupplier.findUnique({
      where: {
        producerId_supplierId: {
          producerId,
          supplierId,
        },
      },
    });

    if (existing) {
      throw createError.conflict('Fornecedor já vinculado a este produtor');
    }

    const link = await prisma.producerSupplier.create({
      data: {
        producerId,
        supplierId,
      },
      include: {
        supplier: true,
      },
    });

    logger.info('Supplier added to producer', { producerId, supplierId });

    return link.supplier;
  }

  /**
   * Remove fornecedor do produtor
   */
  static async removeSupplier(producerId: string, supplierId: string) {
    await this.getById(producerId);

    const link = await prisma.producerSupplier.findUnique({
      where: {
        producerId_supplierId: {
          producerId,
          supplierId,
        },
      },
    });

    if (!link) {
      throw createError.notFound('Vínculo não encontrado');
    }

    await prisma.producerSupplier.delete({
      where: { id: link.id },
    });

    logger.info('Supplier removed from producer', { producerId, supplierId });
  }
}
