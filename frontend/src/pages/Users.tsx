import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useUsers, useDeleteUser } from '../hooks/useUsers';
import { formatDate } from '../lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  User,
  Mail,
  Shield,
  ShieldCheck,
  Eye,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { UserFormModal } from '../components/users/UserFormModal';
import { UserStatusToggle } from '../components/users/UserStatusToggle';
import { useAuth } from '../contexts/AuthContext';

export function Users() {
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const limit = 12;

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
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium text-foreground">Usuários</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie usuários e permissões</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
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
          <h1 className="text-2xl font-medium text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie usuários e permissões</p>
        </div>
        <div className="bg-[hsl(var(--error-bg))] border-0.5 border-[hsl(var(--error))] rounded-md p-4">
          <p className="text-sm text-[hsl(var(--error))]">Erro ao carregar usuários</p>
        </div>
      </div>
    );
  }

  const users = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie usuários e permissões</p>
        </div>
        {isAdmin() && (
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="w-3.5 h-3.5" />
            Novo Usuário
          </Button>
        )}
      </div>

      {/* Empty State */}
      {users.length === 0 ? (
        <Card className="p-16 text-center">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base font-medium text-foreground mb-2">
            Nenhum usuário cadastrado
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Cadastre o primeiro usuário para começar
          </p>
          {isAdmin() && (
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="w-3.5 h-3.5" />
              Cadastrar Usuário
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Grid de Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {users.map((user: any) => (
              <Card
                key={user.id}
                className="hover:bg-secondary/50 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-base font-medium">
                          {user.name}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {user.role === 'ADMIN' ? (
                          <Badge variant="default" className="text-xs gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Shield className="w-3 h-3" />
                            Usuário
                          </Badge>
                        )}
                        {user.active ? (
                          <Badge variant="outline" className="text-xs gap-1 bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="w-3 h-3" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1 bg-gray-50 text-gray-600 border-gray-200">
                            <XCircle className="w-3 h-3" />
                            Inativo
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isAdmin() && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id, user.name)}
                          disabled={deleteMutation.isPending}
                          className="h-8 w-8 p-0 text-[hsl(var(--error))] hover:text-[hsl(var(--error))] hover:bg-[hsl(var(--error-bg))]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Informações principais */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  </div>

                  {/* Permissões */}
                  {user.role !== 'ADMIN' && user.permissions && user.permissions.length > 0 && (
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Permissões:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {user.permissions.slice(0, 2).map((permission: any, index: number) => {
                          const actions = [];
                          if (permission.canView) actions.push('Ver');
                          if (permission.canCreate) actions.push('Criar');
                          if (permission.canEdit) actions.push('Editar');
                          if (permission.canDelete) actions.push('Excluir');

                          return (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {permission.resource}
                            </Badge>
                          );
                        })}
                        {user.permissions.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{user.permissions.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Data de cadastro */}
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Cadastrado em {formatDate(user.createdAt)}
                  </div>

                  {/* Toggle de Status */}
                  {isAdmin() && (
                    <div className="pt-3 border-t border-border flex justify-center">
                      <UserStatusToggle
                        userId={user.id}
                        currentStatus={user.active}
                        userName={user.name}
                      />
                    </div>
                  )}
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
                {pagination.total} usuários
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

      {/* Modal de cadastro/edição */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        user={editingUser}
      />
    </div>
  );
}
