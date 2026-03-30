import { prisma } from '../../config/database';
import { DashboardStats, QuotesByDay, TopProduct } from '../../types';

export class DashboardService {
  /**
   * KPIs principais do dashboard
   */
  static async getStats(): Promise<DashboardStats> {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));

    const [quotesToday, proposalsReceived, closedQuotes, totalQuotes, activeProducers] =
      await Promise.all([
        // Cotações criadas hoje
        prisma.quote.count({
          where: {
            createdAt: {
              gte: todayStart,
            },
          },
        }),

        // Propostas recebidas (total)
        prisma.proposal.count(),

        // Cotações fechadas
        prisma.quote.count({
          where: { status: 'CLOSED' },
        }),

        // Total de cotações
        prisma.quote.count(),

        // Produtores com assinatura ativa
        prisma.producer.count({
          where: {
            subscription: {
              active: true,
            },
          },
        }),
      ]);

    // Taxa de fechamento
    const closureRate = totalQuotes > 0 ? (closedQuotes / totalQuotes) * 100 : 0;

    return {
      quotesToday,
      proposalsReceived,
      closureRate: parseFloat(closureRate.toFixed(2)),
      activeProducers,
    };
  }

  /**
   * Gráfico de cotações por dia (últimos 30 dias)
   */
  static async getQuotesByDay(days = 30): Promise<QuotesByDay[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const quotes = await prisma.quote.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Agrupar por dia
    const groupedByDay = quotes.reduce((acc, quote) => {
      const date = quote.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Converter para array ordenado
    const result: QuotesByDay[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: groupedByDay[dateStr] || 0,
      });
    }

    return result;
  }

  /**
   * Top 5 produtos mais cotados
   */
  static async getTopProducts(limit = 5): Promise<TopProduct[]> {
    const quotes = await prisma.quote.groupBy({
      by: ['product'],
      _count: {
        product: true,
      },
      orderBy: {
        _count: {
          product: 'desc',
        },
      },
      take: limit,
    });

    return quotes.map((q) => ({
      product: q.product,
      count: q._count.product,
    }));
  }

  /**
   * Últimas cotações (10 mais recentes)
   */
  static async getRecentQuotes(limit = 10) {
    return await prisma.quote.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        producer: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            proposals: true,
          },
        },
      },
    });
  }

  /**
   * Dashboard completo (combina todos os dados)
   */
  static async getDashboardData() {
    const [stats, quotesByDay, topProducts, recentQuotes] = await Promise.all([
      this.getStats(),
      this.getQuotesByDay(30),
      this.getTopProducts(5),
      this.getRecentQuotes(10),
    ]);

    return {
      stats,
      charts: {
        quotesByDay,
        topProducts,
      },
      recentQuotes,
    };
  }
}
