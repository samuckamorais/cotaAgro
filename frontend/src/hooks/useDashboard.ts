import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

interface DashboardStats {
  quotesToday: number;
  proposalsReceived: number;
  closureRate: number;
  activeProducers: number;
}

interface QuotesByDay {
  date: string;
  count: number;
}

interface TopProduct {
  product: string;
  count: number;
}

interface DashboardData {
  stats: DashboardStats;
  charts: {
    quotesByDay: QuotesByDay[];
    topProducts: TopProduct[];
  };
  recentQuotes: any[];
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: DashboardData }>('/dashboard');
      return data.data;
    },
  });
}
