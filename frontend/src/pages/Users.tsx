import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useUsers, useDeleteUser } from '../hooks/useUsers';
import { formatDate } from '../lib/utils';
import { ChevronLeft, ChevronRight, Plus, Edit, Trash2, User, Mail, Shield, ShieldCheck } from 'lucide-react';
import { UserFormModal } from '../components/users/UserFormModal';
import { useAuth } from '../contexts/AuthContext';

export function Users() {
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const limit = 10;

  const { data, isLoading, error } = useUsers(page, limit);
  const deleteMutation = useDeleteUser();
  const { isAdmin } = useAuth();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${name}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      alert('Usuário excluído com sucesso!');
    } catch (error) {
      alert('Erro ao excluir usuário. Tente novamente.');
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  if (isLoading) {
    return <div className="text-center py-12">Carregando usuários...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Erro ao carregar usuários</p>
      </div>
    );
  }

  const users = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-600">Gerencie usuários e permissões do sistema</p>
        </div>
        {isAdmin() && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Nenhum usuário cadastrado</p>
              {isAdmin() && (
                <Button onClick={() => setIsModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Primeiro Usuário
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {users.map((user: any) => (
                  <div
                    key={user.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{user.name}</h3>
                          {user.role === 'ADMIN' ? (
                            <Badge variant="default" className="bg-purple-600">
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Administrador
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Shield className="w-3 h-3 mr-1" />
                              Usuário
                            </Badge>
                          )}
                          {!user.active && (
                            <Badge variant="outline" className="bg-gray-100">
                              Inativo
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>{user.email}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>Cadastrado em {formatDate(user.createdAt)}</span>
                          </div>
                        </div>

                        {/* Permissões */}
                        {user.role !== 'ADMIN' && user.permissions.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Permissões:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {user.permissions.map((permission: any, index: number) => {
                                const actions = [];
                                if (permission.canView) actions.push('Ver');
                                if (permission.canCreate) actions.push('Criar');
                                if (permission.canEdit) actions.push('Editar');
                                if (permission.canDelete) actions.push('Excluir');

                                return (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {permission.resource}: {actions.join(', ')}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {isAdmin() && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user.id, user.name)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginação */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <div className="text-sm text-gray-600">
                    Página {pagination.page} de {pagination.totalPages} • Total: {pagination.total}{' '}
                    usuários
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
      <UserFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        user={editingUser}
      />
    </div>
  );
}
