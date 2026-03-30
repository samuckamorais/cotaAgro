import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useQuotes } from '../hooks/useQuotes';
import { formatDate } from '../lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  PENDING: 'default',
  COLLECTING: 'warning',
  SUMMARIZED: 'warning',
  CLOSED: 'success',
  EXPIRED: 'error',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  COLLECTING: 'Coletando',
  SUMMARIZED: 'Resumida',
  CLOSED: 'Fechada',
  EXPIRED: 'Expirada',
};

export function Quotes() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error } = useQuotes(page, limit);

  if (isLoading) {
    return <div className="text-center py-12">Carregando cotações...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Erro ao carregar cotações</p>
      </div>
    );
  }

  const quotes = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cotações</h1>
          <p className="text-gray-600">Gerencie todas as cotações do sistema</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas as Cotações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Produto</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Quantidade</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Produtor</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Propostas</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Data</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote: any) => (
                  <tr key={quote.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-mono text-gray-600">
                      {quote.id.substring(0, 8)}...
                    </td>
                    <td className="py-3 px-4 font-medium">{quote.product}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {quote.quantity} {quote.unit}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{quote.producer.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {quote._count.proposals}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={statusColors[quote.status]}>
                        {statusLabels[quote.status]}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(quote.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-gray-600">
                Página {pagination.page} de {pagination.totalPages} • Total: {pagination.total}{' '}
                cotações
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  Próxima
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
