import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useSuppliers, useDeleteSupplier } from '../hooks/useSuppliers';
import { formatDate } from '../lib/utils';
import { getCategoryLabel, CATEGORY_COLORS } from '../types/supplier';
import { ChevronLeft, ChevronRight, Plus, Edit, Trash2, Building2, Mail, Phone, Package } from 'lucide-react';
import { SupplierFormModal } from '../components/suppliers/SupplierFormModal';

export function Suppliers() {
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const limit = 10;

  const { data, isLoading, error } = useSuppliers(page, limit);
  const deleteMutation = useDeleteSupplier();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o fornecedor "${name}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      alert('Fornecedor excluído com sucesso!');
    } catch (error) {
      alert('Erro ao excluir fornecedor. Tente novamente.');
    }
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  if (isLoading) {
    return <div className="text-center py-12">Carregando fornecedores...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Erro ao carregar fornecedores</p>
      </div>
    );
  }

  const suppliers = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-gray-600">Gerencie sua rede de fornecedores</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2">
        <Badge variant="default" className="cursor-pointer">
          Todos ({pagination?.total || 0})
        </Badge>
        <Badge variant="outline" className="cursor-pointer">
          Meus Fornecedores
        </Badge>
        <Badge variant="outline" className="cursor-pointer">
          Rede CotaAgro
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Fornecedores</CardTitle>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Nenhum fornecedor cadastrado</p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Primeiro Fornecedor
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {suppliers.map((supplier: any) => (
                  <div
                    key={supplier.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{supplier.name}</h3>
                          {supplier.isNetworkSupplier ? (
                            <Badge variant="default">Rede CotaAgro</Badge>
                          ) : (
                            <Badge variant="outline">Meu Fornecedor</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{supplier.phone}</span>
                          </div>

                          {supplier.company && (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              <span>{supplier.company}</span>
                            </div>
                          )}

                          {supplier.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{supplier.email}</span>
                            </div>
                          )}

                          <div>
                            <span className="font-medium">Regiões:</span>{' '}
                            {supplier.regions.length > 0
                              ? supplier.regions.join(', ')
                              : 'Não informado'}
                          </div>
                        </div>

                        {/* Categorias/Áreas de Atuação */}
                        {supplier.categories.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">
                                Áreas de Atuação:
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {supplier.categories.map((category: string) => (
                                <span
                                  key={category}
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {getCategoryLabel(category)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-4 text-xs text-gray-500">
                          {supplier._count && (
                            <>
                              <span>{supplier._count.producers} produtores vinculados</span>
                              <span>{supplier._count.proposals} propostas enviadas</span>
                            </>
                          )}
                          <span>Cadastrado em {formatDate(supplier.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(supplier)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(supplier.id, supplier.name)}
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
                    fornecedores
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
      <SupplierFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        supplier={editingSupplier}
      />
    </div>
  );
}
