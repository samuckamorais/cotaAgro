import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useQuotes } from '../hooks/useQuotes';
import { formatDate } from '../lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowRight,
  User,
  Calendar,
  MessageSquare,
  Clock,
  FileText,
  X
} from 'lucide-react';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  PENDING: 'default',
  COLLECTING: 'warning',
  SUMMARIZED: 'info',
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));

  const limit = 20;

  const { data, isLoading, error } = useQuotes(page, limit, {
    search,
    status: statusFilter
  });

  // Atualizar URL quando filtros mudam
  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (page > 1) params.page = page.toString();
    setSearchParams(params);
  }, [search, statusFilter, page, setSearchParams]);

  // Debounce na busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1); // Reset page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPage(1);
  };

  const hasFilters = search || statusFilter;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Cotações</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as cotações do sistema</p>
        </div>

        {/* Skeleton Loading */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-1" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Cotações</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as cotações do sistema</p>
        </div>
        <div className="bg-[hsl(var(--error-bg))] border-0.5 border-[hsl(var(--error))] rounded-md p-4">
          <p className="text-sm text-[hsl(var(--error))]">Erro ao carregar cotações</p>
        </div>
      </div>
    );
  }

  const quotes = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Cotações</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as cotações do sistema</p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="space-y-3">
        {/* Busca */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por produto, produtor, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-background border-0.5 border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 text-sm border-0.5 border-border rounded-md px-3 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos os status</option>
            <option value="PENDING">Pendente</option>
            <option value="COLLECTING">Coletando</option>
            <option value="SUMMARIZED">Resumida</option>
            <option value="CLOSED">Fechada</option>
            <option value="EXPIRED">Expirada</option>
          </select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Lista de Cotações em Cards */}
      {quotes.length === 0 ? (
        <Card className="p-16 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base font-medium text-foreground mb-2">
            Nenhuma cotação encontrada
          </h3>
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? 'Tente ajustar os filtros de busca'
              : 'As cotações aparecem aqui quando criadas via WhatsApp'}
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quotes.map((quote: any) => (
              <Card
                key={quote.id}
                className="hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/quotes/${quote.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-muted-foreground">
                      ID: #{quote.id.substring(0, 8)}
                    </span>
                    <Badge variant={statusColors[quote.status]}>
                      {statusLabels[quote.status]}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-medium">{quote.product}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {quote.quantity} {quote.unit}
                  </p>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span className="truncate">{quote.producer.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(quote.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{quote._count?.proposals || 0} proposta(s)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {quote.status === 'EXPIRED' ? 'Expirada' : 'Ativa'}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/quotes/${quote.id}`);
                    }}
                  >
                    Ver Detalhes
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Paginação */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-between items-center pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Página {pagination.page} de {pagination.totalPages} • Mostrando{' '}
                {(pagination.page - 1) * limit + 1}-
                {Math.min(pagination.page * limit, pagination.total)} de{' '}
                {pagination.total} resultados
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="gap-1.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="gap-1.5"
                >
                  Próxima
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
