import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { EmptyState } from '../components/ui/empty-state';
import { SkeletonCard } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
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
  Plus,
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import { getCategoryLabel } from '../types/supplier';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { data, isLoading, error } = useDashboard();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <>
        <Breadcrumb items={[{ label: 'Dashboard' }]} />
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-medium text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Visão geral completa do sistema</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Breadcrumb items={[{ label: 'Dashboard' }]} />
        <div className="p-6">
          <EmptyState
            icon={<BarChart3 className="w-12 h-12" />}
            title="Erro ao carregar dashboard"
            description="Não foi possível carregar os dados. Tente novamente em alguns instantes."
            action={
              <Button onClick={() => window.location.reload()} variant="outline">
                Recarregar
              </Button>
            }
          />
        </div>
      </>
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

  const hasNoData = stats?.quotesToday === 0 && stats?.activeProducers === 0;

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard' }]} />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral completa do sistema</p>
        </div>

        {/* Empty State - Primeira utilização */}
        {hasNoData && (
          <EmptyState
            icon={<FileText className="w-16 h-16" />}
            title="Bem-vindo ao CotaAgro!"
            description="Comece criando sua primeira cotação ou configure o WhatsApp para receber solicitações automáticas."
            action={
              <div className="flex gap-2">
                <Button onClick={() => navigate('/quotes')} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Cotação
                </Button>
                <Button onClick={() => navigate('/whatsapp')} variant="outline" size="sm">
                  Configurar WhatsApp
                </Button>
              </div>
            }
          />
        )}

        {/* KPIs Principais */}
        {!hasNoData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">Cotações Hoje</CardTitle>
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium text-foreground">{stats?.quotesToday || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">cotações criadas hoje</p>
          </CardContent>
        </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs text-muted-foreground font-normal">Propostas Recebidas</CardTitle>
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-medium text-foreground">{stats?.proposalsReceived || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">total de propostas</p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs text-muted-foreground font-normal">Taxa de Fechamento</CardTitle>
                <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-medium text-foreground">{stats?.closureRate || 0}%</div>
                <p className="text-xs text-muted-foreground mt-1">cotações fechadas</p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs text-muted-foreground font-normal">Produtores Ativos</CardTitle>
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-medium text-foreground">{stats?.activeProducers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">com assinatura ativa</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estatísticas de Propostas e Valores */}
        {!hasNoData && proposalStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">Volume Total</CardTitle>
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-medium text-foreground">
                {formatCurrency(proposalStats.totalVolume)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                em {proposalStats.totalProposals} propostas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">Ticket Médio</CardTitle>
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-medium text-foreground">
                {formatCurrency(proposalStats.avgProposalValue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">valor médio por proposta</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">Este Mês</CardTitle>
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-medium text-foreground">
                {formatCurrency(proposalStats.thisMonth.volume)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {proposalStats.thisMonth.count} propostas
              </p>
            </CardContent>
          </Card>
          </div>
        )}

        {!hasNoData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estatísticas de Produtores */}
        {producerStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
                <UserCheck className="w-4 h-4 text-muted-foreground" />
                Produtores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-medium text-foreground">
                    {producerStats.totalProducers}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Total</p>
                </div>
                <div>
                  <div className="text-2xl font-medium text-foreground">
                    {producerStats.producersWithQuotes}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Com Cotações</p>
                </div>
                <div>
                  <div className="text-2xl font-medium text-foreground">
                    {producerStats.producersWithActiveSubscription}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Ativos</p>
                </div>
              </div>

              {producerStats.topProducers.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-3">
                    Top Produtores (por cotações)
                  </p>
                  <div className="space-y-2">
                    {producerStats.topProducers.map((producer, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{producer.name}</span>
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
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Fornecedores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-medium text-foreground">
                    {supplierStats.totalSuppliers}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Total</p>
                </div>
                <div>
                  <div className="text-2xl font-medium text-foreground">
                    {supplierStats.networkSuppliers}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Rede</p>
                </div>
                <div>
                  <div className="text-2xl font-medium text-foreground">
                    {supplierStats.producerSuppliers}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Produtores</p>
                </div>
              </div>

              {supplierStats.topSuppliers.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-3">
                    Top Fornecedores (por propostas)
                  </p>
                  <div className="space-y-2">
                    {supplierStats.topSuppliers.map((supplier, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{supplier.name}</span>
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
        )}

        {!hasNoData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Produtos */}
        {charts?.topProducts && charts.topProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Package className="w-4 h-4 text-muted-foreground" />
                Produtos Mais Cotados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {charts.topProducts.map((product, index) => {
                  const maxCount = charts.topProducts[0]?.count || 1;
                  const percentage = (product.count / maxCount) * 100;

                  return (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-normal text-foreground">{product.product}</span>
                        <span className="text-xs text-muted-foreground">{product.count} cotações</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
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
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
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
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {statusItem.count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
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
        )}

        {/* Categorias de Fornecedores */}
        {!hasNoData && charts?.categoryStats && charts.categoryStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Package className="w-4 h-4 text-muted-foreground" />
              Fornecedores por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {charts.categoryStats
                .sort((a, b) => b.suppliersCount - a.suppliersCount)
                .map((category, index) => (
                  <div
                    key={index}
                    className="border-0.5 border-border rounded-md p-4 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-normal text-foreground">
                        {getCategoryLabel(category.category)}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fornecedores:</span>
                        <span className="font-normal text-foreground">{category.suppliersCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Propostas:</span>
                        <span className="font-normal text-foreground">{category.proposalsCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            </CardContent>
          </Card>
        )}

        {/* Últimas Cotações */}
        {!hasNoData && data?.recentQuotes && data.recentQuotes.length > 0 && (
          <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-foreground">Últimas Cotações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data?.recentQuotes?.slice(0, 5).map((quote: any) => {
              const badge = getStatusBadge(quote.status);
              return (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-3 border-0.5 border-border rounded-md hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-sm font-normal text-foreground">{quote.product}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {quote.quantity} {quote.unit} • {quote.producer.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(quote.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-muted-foreground">
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
        )}

        {!hasNoData && data?.recentQuotes && data.recentQuotes.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <EmptyState
                icon={<FileText className="w-12 h-12" />}
                title="Nenhuma cotação recente"
                description="Crie sua primeira cotação para começar a visualizar dados aqui."
                action={
                  <Button onClick={() => navigate('/quotes')} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Cotação
                  </Button>
                }
              />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
