import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useProducers, useDeleteProducer } from '../hooks/useProducers';
import { formatDate } from '../lib/utils';
import { formatCpfCnpj } from '../lib/validators';
import { ChevronLeft, ChevronRight, Plus, Edit, Trash2, User, Phone, MapPin, Building2, FileText } from 'lucide-react';
import { ProducerFormModal } from '../components/producers/ProducerFormModal';

export function Producers() {
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProducer, setEditingProducer] = useState<any>(null);
  const limit = 10;

  const { data, isLoading, error } = useProducers(page, limit);
  const deleteMutation = useDeleteProducer();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o produtor "${name}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      alert('Produtor excluído com sucesso!');
    } catch (error) {
      alert('Erro ao excluir produtor. Tente novamente.');
    }
  };

  const handleEdit = (producer: any) => {
    setEditingProducer(producer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProducer(null);
  };


  if (isLoading) {
    return <div className="text-center py-12">Carregando produtores...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Erro ao carregar produtores</p>
      </div>
    );
  }

  const producers = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produtores</h1>
          <p className="text-gray-600">Gerencie os produtores cadastrados</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Produtor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Produtores</CardTitle>
        </CardHeader>
        <CardContent>
          {producers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Nenhum produtor cadastrado</p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Primeiro Produtor
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {producers.map((producer: any) => (
                  <div
                    key={producer.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{producer.name}</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>CPF/CNPJ: {formatCpfCnpj(producer.cpfCnpj)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{producer.phone}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{producer.city} - {producer.region}</span>
                          </div>

                          {producer.farm && (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              <span>Fazenda: {producer.farm}</span>
                            </div>
                          )}

                          {producer.stateRegistration && (
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              <span>I.E.: {producer.stateRegistration}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-4 text-xs text-gray-500 mt-3">
                          {producer._count && (
                            <>
                              <span>{producer._count.suppliers} fornecedores vinculados</span>
                              <span>{producer._count.quotes} cotações realizadas</span>
                            </>
                          )}
                          <span>Cadastrado em {formatDate(producer.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(producer)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(producer.id, producer.name)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginação */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <div className="text-sm text-gray-600">
                    Página {pagination.page} de {pagination.totalPages} • Total: {pagination.total}{' '}
                    produtores
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de cadastro/edição */}
      <ProducerFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        producer={editingProducer}
      />
    </div>
  );
}
