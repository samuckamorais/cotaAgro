import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useProducers, useDeleteProducer } from '../hooks/useProducers';
import { formatDate } from '../lib/utils';
import { formatCpfCnpj } from '../lib/validators';
import { useToast } from '../hooks/use-toast';
import { ConfirmModal } from '../components/ui/confirm-modal';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  User,
  Phone,
  MapPin,
  Building2,
  FileText,
  ShoppingCart,
  Users,
  Search,
} from 'lucide-react';
import { ProducerFormModal } from '../components/producers/ProducerFormModal';

export function Producers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProducer, setEditingProducer] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const limit = 15;

  const { data, isLoading, error } = useProducers(page, limit);
  const deleteMutation = useDeleteProducer();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      setConfirmDelete(null);
    } catch {
      toast({ title: 'Erro ao excluir produtor', description: 'Tente novamente.', variant: 'destructive' });
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
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium text-foreground">Produtores</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie os produtores cadastrados</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
          <h1 className="text-2xl font-medium text-foreground">Produtores</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os produtores cadastrados</p>
        </div>
        <div className="bg-[hsl(var(--error-bg))] border-0.5 border-[hsl(var(--error))] rounded-md p-4">
          <p className="text-sm text-[hsl(var(--error))]">Erro ao carregar produtores</p>
        </div>
      </div>
    );
  }

  const allProducers = data?.data || [];
  const pagination = data?.pagination;

  const producers = search.trim()
    ? allProducers.filter((p: any) =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.phone?.includes(search) ||
        p.city?.toLowerCase().includes(search.toLowerCase())
      )
    : allProducers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Produtores</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os produtores cadastrados</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-3.5 h-3.5" />
          Novo Produtor
        </Button>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou cidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Empty State */}
      {producers.length === 0 ? (
        <Card className="p-16 text-center">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base font-medium text-foreground mb-2">
            {search ? 'Nenhum resultado encontrado' : 'Nenhum produtor cadastrado'}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {search ? `Nenhum produtor corresponde a "${search}"` : 'Cadastre o primeiro produtor para começar'}
          </p>
          {!search && (
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="w-3.5 h-3.5" />
              Cadastrar Produtor
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Grid de Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {producers.map((producer: any) => (
              <Card
                key={producer.id}
                className="hover:bg-secondary/50 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base font-medium">
                        {producer.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCpfCnpj(producer.cpfCnpj)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(producer)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete({ id: producer.id, name: producer.name })}
                        disabled={deleteMutation.isPending}
                        className="h-8 w-8 p-0 text-[hsl(var(--error))] hover:text-[hsl(var(--error))] hover:bg-[hsl(var(--error-bg))]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Informações principais */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{producer.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{producer.city}</span>
                    </div>
                    {producer.farm && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{producer.farm}</span>
                      </div>
                    )}
                    {producer.stateRegistration && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <FileText className="w-3.5 h-3.5" />
                        <span>I.E.: {producer.stateRegistration}</span>
                      </div>
                    )}
                  </div>

                  {/* Estatísticas */}
                  {producer._count && (
                    <div className="flex gap-2 pt-3 border-t border-border">
                      <Badge variant="outline" className="text-xs gap-1">
                        <Users className="w-3 h-3" />
                        {producer._count.suppliers || 0}
                      </Badge>
                      <Badge variant="outline" className="text-xs gap-1">
                        <ShoppingCart className="w-3 h-3" />
                        {producer._count.quotes || 0}
                      </Badge>
                    </div>
                  )}

                  {/* Data de cadastro */}
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Cadastrado em {formatDate(producer.createdAt)}
                  </div>
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
                {pagination.total} produtores
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
      <ProducerFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        producer={editingProducer}
      />

      {/* Modal de confirmação de exclusão */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir produtor"
        description={`Tem certeza que deseja excluir "${confirmDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
