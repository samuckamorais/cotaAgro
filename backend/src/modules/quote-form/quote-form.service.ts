import { prisma } from '../../config/database';
import { QuoteTokenService } from '../../services/quote-token.service';
import { dispatchQuoteJob } from '../../jobs/dispatch-quote.job';
import { whatsappService } from '../whatsapp/whatsapp.service';
import { Messages } from '../../flows/messages';

export interface QuoteFormItem {
  product: string;
  quantity: number;
  unit: string;
  observation?: string;
}

export interface QuoteFormSubmitData {
  category: string;
  items: QuoteFormItem[];
  region: string;
  deadline: string;
  observations?: string;
  freight: 'CIF' | 'FOB';
  paymentTerms: string;
  selectedSupplierIds: string[];
}

export class QuoteFormService {
  /**
   * Retorna os dados necessários para renderizar o formulário de cotação.
   */
  static async getFormData(token: string) {
    const record = await QuoteTokenService.validate(token);
    const { producer } = record;

    // Fornecedores próprios do produtor
    const ownSupplierLinks = await prisma.producerSupplier.findMany({
      where: { producerId: producer.id },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            company: true,
            categories: true,
            isNetworkSupplier: true,
            rating: true,
          },
        },
      },
    });

    const ownSuppliers = ownSupplierLinks.map((ps) => ({
      ...ps.supplier,
      isOwn: true,
    }));

    const ownSupplierIds = ownSuppliers.map((s) => s.id);

    // Fornecedores da rede (excluindo os que já são próprios)
    const networkSuppliers = await prisma.supplier.findMany({
      where: {
        isNetworkSupplier: true,
        id: { notIn: ownSupplierIds.length ? ownSupplierIds : [''] },
      },
      select: {
        id: true,
        name: true,
        company: true,
        categories: true,
        isNetworkSupplier: true,
        rating: true,
      },
    });

    const allSuppliers = [
      ...ownSuppliers,
      ...networkSuppliers.map((s) => ({ ...s, isOwn: false })),
    ];

    return {
      token: record.token,
      expiresAt: record.expiresAt.toISOString(),
      producer: {
        name: producer.name,
        city: producer.city,
        region: producer.region,
      },
      suppliers: allSuppliers,
    };
  }

  /**
   * Processa o formulário de cotação preenchido pelo produtor:
   * cria Quote + QuoteItems e dispara para fornecedores selecionados.
   */
  static async submitForm(token: string, data: QuoteFormSubmitData) {
    const record = await QuoteTokenService.validate(token);
    const { producer } = record;

    const quote = await prisma.$transaction(async (tx) => {
      const newQuote = await tx.quote.create({
        data: {
          producerId: producer.id,
          tenantId: producer.tenantId,
          category: data.category,
          // campos legados — preencher com primeiro item
          product: data.items[0].product,
          quantity: String(data.items[0].quantity),
          unit: data.items[0].unit,
          region: data.region,
          deadline: new Date(data.deadline),
          observations: data.observations,
          freight: data.freight,
          paymentTerms: data.paymentTerms,
          supplierScope: 'ALL',
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 120 * 60 * 1000),
        },
      });

      await tx.quoteItem.createMany({
        data: data.items.map((item) => ({
          quoteId: newQuote.id,
          product: item.product,
          quantity: item.quantity,
          unit: item.unit,
          observation: item.observation,
        })),
      });

      return newQuote;
    });

    // Incrementar cotações usadas na assinatura
    await prisma.subscription.updateMany({
      where: { producerId: producer.id },
      data: { quotesUsed: { increment: 1 } },
    });

    // Disparar para os fornecedores selecionados
    const suppliersCount = await dispatchQuoteJob(quote.id, data.selectedSupplierIds);

    // Marcar token como usado
    await QuoteTokenService.markUsed(token);

    // Salvar preferências da última cotação
    await prisma.producer.update({
      where: { id: producer.id },
      data: {
        lastQuotePreferences: {
          category: data.category,
          items: data.items,
          region: data.region,
          deadline: data.deadline,
        } as any,
      },
    });

    // Notificar produtor via WhatsApp e resetar estado do FSM
    await whatsappService.sendMessage({
      to: producer.phone,
      body: Messages.QUOTE_DISPATCHED(suppliersCount),
    });

    await prisma.conversationState.updateMany({
      where: { producerId: producer.id },
      data: { step: 'IDLE', context: {} },
    });

    return { quoteId: quote.id, suppliersCount };
  }
}
