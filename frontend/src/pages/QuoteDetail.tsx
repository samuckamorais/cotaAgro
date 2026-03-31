import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useQuote, useCloseQuote } from '../hooks/useQuotes';
import { formatDate, formatCurrency } from '../lib/utils';
import { ArrowLeft, CheckCircle, Clock, MapPin, Package, User, DollarSign } from 'lucide-react';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  PENDING: 'default',
  COLLECTING: 'warning',
  SUMMARIZED: 'warning',
  CLOSED: 'success',
  EXPIRED: 'error',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  COLLECTING: 'Coletando Propostas',
  SUMMARIZED: 'Pronta para Escolha',
  CLOSED: 'Fechada',
  EXPIRED: 'Expirada',
};

export function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: quote, isLoading, error } = useQuote(id!);
  const closeQuoteMutation = useCloseQuote();

  const handleCloseQuote = async (supplierId: string) => {
    if (!id) return;

    try {
      await closeQuoteMutation.mutateAsync({ quoteId: id, supplierId });
      alert('Cotação fechada com sucesso!');
    } catch (error) {
      alert('Erro ao fechar cotação. Tente novamente.');
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Carregando detalhes da cotação...</div>;
  }

  if (error || !quote) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/quotes')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Erro ao carregar detalhes da cotação</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/quotes')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Detalhes da Cotação</h1>
            <p className="text-gray-600">ID: {quote.id.substring(0, 8)}...</p>
          </div>
        </div>
        <Badge variant={statusColors[quote.status]}>{statusLabels[quote.status]}</Badge>
      </div>

      {/* Informações da Cotação */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Cotação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Produto</p>
                  <p className="font-medium">{quote.product}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Quantidade</p>
                  <p className="font-medium">
                    {quote.quantity} {quote.unit}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Região</p>
                  <p className="font-medium">{quote.region}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Produtor</p>
                  <p className="font-medium">{quote.producer.name}</p>
                  <p className="text-sm text-gray-500">{quote.producer.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Prazo de Entrega</p>
                  <p className="font-medium">{formatDate(quote.deadline)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Criada em</p>
                  <p className="font-medium">{formatDate(quote.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {quote.observations && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-600 mb-2">Observações</p>
              <p className="text-gray-900">{quote.observations}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Propostas */}
      <Card>
        <CardHeader>
          <CardTitle>
            Propostas Recebidas ({quote.proposals?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!quote.proposals || quote.proposals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma proposta recebida ainda
            </div>
          ) : (
            <div className="space-y-4">
              {quote.proposals.map((proposal: any, index: number) => (
                <div
                  key={proposal.id}
                  className={`border rounded-lg p-4 ${
                    quote.closedSupplierId === proposal.supplierId
                      ? 'bg-green-50 border-green-300'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{proposal.supplier.name}</h3>
                          <p className="text-sm text-gray-500">{proposal.supplier.phone}</p>
                        </div>
                        {proposal.isOwnSupplier && (
                          <Badge variant="default">Fornecedor Próprio</Badge>
                        )}
                        {quote.closedSupplierId === proposal.supplierId && (
                          <Badge variant="success">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Escolhido
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Preço Total</p>
                          <p className="text-xl font-bold text-green-600">
                            {formatCurrency(proposal.totalPrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Preço Unitário</p>
                          <p className="font-medium">{formatCurrency(proposal.price)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Prazo de Entrega</p>
                          <p className="font-medium">{proposal.deliveryDays} dias</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Pagamento</p>
                          <p className="font-medium">{proposal.paymentTerms}</p>
                        </div>
                      </div>

                      {proposal.observations && (
                        <div className="bg-gray-50 rounded p-3 mb-3">
                          <p className="text-sm text-gray-600 mb-1">Observações</p>
                          <p className="text-sm">{proposal.observations}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {quote.status === 'SUMMARIZED' && !quote.closedSupplierId && (
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleCloseQuote(proposal.supplierId)}
                        disabled={closeQuoteMutation.isPending}
                      >
                        {closeQuoteMutation.isPending
                          ? 'Processando...'
                          : 'Escolher este Fornecedor'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações sobre origem WhatsApp */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium">Cotação via WhatsApp</p>
              <p className="text-xs">Esta cotação foi criada através do bot do WhatsApp</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
