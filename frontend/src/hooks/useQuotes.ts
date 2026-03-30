import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, PaginatedResponse } from '../api/client';

interface Quote {
  id: string;
  product: string;
  quantity: string;
  unit: string;
  region: string;
  status: string;
  createdAt: string;
  producer: {
    id: string;
    name: string;
  };
  _count: {
    proposals: number;
  };
}

export function useQuotes(page = 1, limit = 10, filters?: any) {
  return useQuery({
    queryKey: ['quotes', page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });
      const { data } = await api.get<PaginatedResponse<Quote> & { success: boolean }>(
        `/quotes?${params}`
      );
      return data;
    },
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ['quote', id],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: any }>(`/quotes/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCloseQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quoteId, supplierId }: { quoteId: string; supplierId: string }) => {
      const { data } = await api.put(`/quotes/${quoteId}/close`, { supplierId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
