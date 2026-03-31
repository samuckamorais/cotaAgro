import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useDashboard } from '../hooks/useDashboard';
import {
  FileText,
  TrendingUp,
  Users,
  CheckCircle,
  Package,
  DollarSign,
  UserCheck,
  Building2,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import { getCategoryLabel } from '../types/supplier';

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
  const supplierStats = data?.supplierStats;
  const producerStats = data?.producerStats;
  const proposalStats = data?.proposalStats;
  const charts = data?.charts;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      PENDING: { label: 'Pendente', variant: 'default' },
      COLLECTING: { label: 'Coletando', variant: 'default' },
      SUMMARIZED: { label: 'Resumida', variant: 'default' },
      CLOSED: { label: 'Fechada', variant: 'default' },
      EXPIRED: { label: 'Expirada', variant: 'outline' },
    };
    return statusMap[status] || { label: status, variant: 'default' };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Visão geral completa do sistema</p>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cotações Hoje</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.quotesToday || 0}</div>
            <p className="text-xs text-gray-600">cotações criadas hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propostas Recebidas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.proposalsReceived || 0}</div>
            <p className="text-xs text-gray-600">total de propostas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Fechamento</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats?.closureRate || 0}%</div>
            <p className="text-xs text-gray-600">cotações fechadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtores Ativos</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.activeProducers || 0}</div>
            <p className="text-xs text-gray-600">com assinatura ativa</p>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas de Propostas e Valores */}
      {proposalStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Volume Total</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(proposalStats.totalVolume)}
              </div>
              <p className="text-xs text-gray-600">
                em {proposalStats.totalProposals} propostas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(proposalStats.avgProposalValue)}
              </div>
              <p className="text-xs text-gray-600">valor médio por proposta</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(proposalStats.thisMonth.volume)}
              </div>
              <p className="text-xs text-gray-600">
                {proposalStats.thisMonth.count} propostas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estatísticas de Produtores */}
        {producerStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                Produtores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {producerStats.totalProducers}
                  </div>
                  <p className="text-xs text-gray-600">Total</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {producerStats.producersWithQuotes}
                  </div>
                  <p className="text-xs text-gray-600">Com Cotações</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {producerStats.producersWithActiveSubscription}
                  </div>
                  <p className="text-xs text-gray-600">Ativos</p>
                </div>
              </div>

              {producerStats.topProducers.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Top Produtores (por cotações)
                  </p>
                  <div className="space-y-2">
                    {producerStats.topProducers.map((producer, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{producer.name}</span>
                        <Badge variant="outline">{producer.quotesCount} cotações</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Estatísticas de Fornecedores */}
        {supplierStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-600" />
                Fornecedores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {supplierStats.totalSuppliers}
                  </div>
                  <p className="text-xs text-gray-600">Total</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {supplierStats.networkSuppliers}
                  </div>
                  <p className="text-xs text-gray-600">Rede</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {supplierStats.producerSuppliers}
                  </div>
                  <p className="text-xs text-gray-600">Produtores</p>
                </div>
              </div>

              {supplierStats.topSuppliers.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Top Fornecedores (por propostas)
                  </p>
                  <div className="space-y-2">
                    {supplierStats.topSuppliers.map((supplier, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{supplier.name}</span>
                        <Badge variant="outline">{supplier.proposalsCount} propostas</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Produtos */}
        {charts?.topProducts && charts.topProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                Produtos Mais Cotados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {charts.topProducts.map((product, index) => {
                  const maxCount = charts.topProducts[0]?.count || 1;
                  const percentage = (product.count / maxCount) * 100;

                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">{product.product}</span>
                        <span className="text-gray-600">{product.count} cotações</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status das Cotações */}
        {charts?.quoteStatusStats && charts.quoteStatusStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Status das Cotações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {charts.quoteStatusStats.map((statusItem, index) => {
                  const badge = getStatusBadge(statusItem.status);
                  const totalQuotes = charts.quoteStatusStats.reduce(
                    (sum, s) => sum + s.count,
                    0
                  );
                  const percentage = (statusItem.count / totalQuotes) * 100;

                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <span className="text-gray-600">
                          {statusItem.count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Categorias de Fornecedores */}
      {charts?.categoryStats && charts.categoryStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              Fornecedores por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {charts.categoryStats
                .sort((a, b) => b.suppliersCount - a.suppliersCount)
                .map((category, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {getCategoryLabel(category.category)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fornecedores:</span>
                        <span className="font-medium">{category.suppliersCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Propostas:</span>
                        <span className="font-medium">{category.proposalsCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Últimas Cotações */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Cotações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.recentQuotes?.slice(0, 5).map((quote: any) => {
              const badge = getStatusBadge(quote.status);
              return (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
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
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
