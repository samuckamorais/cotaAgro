import { prisma } from '../../config/database';
import { CreateProducerDTO, UpdateProducerDTO, PaginatedResponse } from '../../types';
import { createError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';

export class ProducerService {
  /**
   * Lista produtores com paginação
   */
  static async list(tenantId: string, page = 1, limit = 10): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * limit;

    const [producers, total] = await Promise.all([
      prisma.producer.findMany({
        where: { tenantId },
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
      prisma.producer.count({ where: { tenantId } }),
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
  static async getById(tenantId: string, id: string) {
    const producer = await prisma.producer.findFirst({
      where: { id, tenantId },
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
  static async create(tenantId: string, data: CreateProducerDTO) {
    // Verificar se telefone já existe NO MESMO TENANT
    const existingPhone = await prisma.producer.findFirst({
      where: { tenantId, phone: data.phone },
    });

    if (existingPhone) {
      throw createError.conflict('Telefone já cadastrado');
    }

    // Verificar se CPF/CNPJ já existe NO MESMO TENANT
    const existingCpfCnpj = await prisma.producer.findFirst({
      where: { tenantId, cpfCnpj: data.cpfCnpj },
    });

    if (existingCpfCnpj) {
      throw createError.conflict('CPF/CNPJ já cadastrado');
    }

    const producer = await prisma.producer.create({
      data: {
        tenantId,
        name: data.name,
        cpfCnpj: data.cpfCnpj,
        stateRegistration: data.stateRegistration,
        farm: data.farm,
        city: data.city,
        phone: data.phone,
        region: data.region,
        conversationState: {
          create: {
            tenantId,
            step: 'IDLE',
            context: {},
          },
        },
      },
      include: {
        conversationState: true,
      },
    });

    logger.info('Producer created', { producerId: producer.id, tenantId });

    return producer;
  }

  /**
   * Atualiza produtor
   */
  static async update(tenantId: string, id: string, data: UpdateProducerDTO) {
    // Verificar se produtor existe e pertence ao tenant
    await this.getById(tenantId, id);

    // Se mudou telefone, verificar se novo telefone está disponível NO MESMO TENANT
    if (data.phone) {
      const existing = await prisma.producer.findFirst({
        where: {
          tenantId,
          phone: data.phone,
          id: { not: id },
        },
      });

      if (existing) {
        throw createError.conflict('Telefone já cadastrado por outro produtor');
      }
    }

    // Se mudou CPF/CNPJ, verificar se novo CPF/CNPJ está disponível NO MESMO TENANT
    if (data.cpfCnpj) {
      const existing = await prisma.producer.findFirst({
        where: {
          tenantId,
          cpfCnpj: data.cpfCnpj,
          id: { not: id },
        },
      });

      if (existing) {
        throw createError.conflict('CPF/CNPJ já cadastrado por outro produtor');
      }
    }

    const producer = await prisma.producer.update({
      where: { id },
      data,
      include: {
        subscription: true,
      },
    });

    logger.info('Producer updated', { producerId: id, tenantId });

    return producer;
  }

  /**
   * Deleta produtor
   */
  static async delete(tenantId: string, id: string) {
    await this.getById(tenantId, id);

    await prisma.producer.delete({
      where: { id },
    });

    logger.info('Producer deleted', { producerId: id, tenantId });
  }

  /**
   * Lista fornecedores do produtor
   */
  static async getSuppliers(tenantId: string, producerId: string) {
    await this.getById(tenantId, producerId);

    const suppliers = await prisma.producerSupplier.findMany({
      where: { tenantId, producerId },
      include: {
        supplier: true,
      },
    });

    return suppliers.map((ps: any) => ps.supplier);
  }

  /**
   * Adiciona fornecedor ao produtor
   */
  static async addSupplier(tenantId: string, producerId: string, supplierId: string) {
    // Verificar se produtor existe e pertence ao tenant
    await this.getById(tenantId, producerId);

    // Verificar se fornecedor existe e pertence ao tenant ou é da rede
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: supplierId,
        OR: [{ tenantId }, { tenantId: null }], // Tenant ou rede
      },
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
        tenantId,
        producerId,
        supplierId,
      },
      include: {
        supplier: true,
      },
    });

    logger.info('Supplier added to producer', { producerId, supplierId, tenantId });

    return link.supplier;
  }

  /**
   * Remove fornecedor do produtor
   */
  static async removeSupplier(tenantId: string, producerId: string, supplierId: string) {
    await this.getById(tenantId, producerId);

    const link = await prisma.producerSupplier.findFirst({
      where: {
        tenantId,
        producerId,
        supplierId,
      },
    });

    if (!link) {
      throw createError.notFound('Vínculo não encontrado');
    }

    await prisma.producerSupplier.delete({
      where: { id: link.id },
    });

    logger.info('Supplier removed from producer', { producerId, supplierId, tenantId });
  }
}
