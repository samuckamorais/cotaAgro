import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useDashboard } from '../hooks/useDashboard';
import { FileText, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { formatDate } from '../lib/utils';

export function Dashboard() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Erro ao carregar dashboard</p>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Visão geral das cotações e atividades</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cotações Hoje</CardTitle>
            <FileText className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.quotesToday || 0}</div>
            <p className="text-xs text-gray-600">cotações criadas hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propostas Recebidas</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.proposalsReceived || 0}</div>
            <p className="text-xs text-gray-600">total de propostas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Fechamento</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.closureRate || 0}%</div>
            <p className="text-xs text-gray-600">cotações fechadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtores Ativos</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeProducers || 0}</div>
            <p className="text-xs text-gray-600">com assinatura ativa</p>
          </CardContent>
        </Card>
      </div>

      {/* Últimas Cotações */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Cotações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.recentQuotes?.slice(0, 5).map((quote: any) => (
              <div
                key={quote.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <p className="font-medium">{quote.product}</p>
                  <p className="text-sm text-gray-600">
                    {quote.quantity} {quote.unit} • {quote.producer.name}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(quote.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-600">
                    {quote._count.proposals} proposta(s)
                  </div>
                  <Badge
                    variant={
                      quote.status === 'CLOSED'
                        ? 'success'
                        : quote.status === 'COLLECTING'
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {quote.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
