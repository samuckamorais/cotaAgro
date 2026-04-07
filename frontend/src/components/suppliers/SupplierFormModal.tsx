import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { useCreateSupplier, useUpdateSupplier } from '../../hooks/useSuppliers';
import { SUPPLIER_CATEGORIES } from '../../types/supplier';
import { X } from 'lucide-react';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: any;
}

export function SupplierFormModal({ isOpen, onClose, supplier }: SupplierFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    company: '',
    email: '',
    regions: '',
    categories: [] as string[],
    isNetworkSupplier: false,
  });

  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        phone: supplier.phone || '',
        company: supplier.company || '',
        email: supplier.email || '',
        regions: supplier.regions?.join(', ') || '',
        categories: supplier.categories || [],
        isNetworkSupplier: supplier.isNetworkSupplier || false,
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        company: '',
        email: '',
        regions: '',
        categories: [],
        isNetworkSupplier: false,
      });
    }
  }, [supplier, isOpen]);

  const handleToggleCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      phone: formData.phone.replace(/\D/g, ''), // remove não-numéricos
      company: formData.company || undefined,
      email: formData.email || undefined,
      regions: formData.regions.split(',').map((r) => r.trim()).filter(Boolean),
      categories: formData.categories,
      isNetworkSupplier: formData.isNetworkSupplier,
    };

    try {
      if (supplier) {
        await updateMutation.mutateAsync({ id: supplier.id, data: payload });
        alert('Fornecedor atualizado com sucesso!');
      } else {
        await createMutation.mutateAsync(payload);
        alert('Fornecedor cadastrado com sucesso!');
      }
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao salvar fornecedor');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">
            {supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Fornecedor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-foreground border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: João Silva"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone (com DDD) <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 text-foreground border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: 64999999999 ou +5564999999999"
            />
            <p className="text-xs text-gray-500 mt-1">
              Digite apenas números, com ou sem o +55
            </p>
          </div>

          {/* Empresa (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Empresa (opcional)
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-3 py-2 text-foreground border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: AgroSupply Ltda"
            />
          </div>

          {/* Email (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail (opcional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 text-foreground border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: contato@empresa.com.br"
            />
          </div>

          {/* Regiões */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Regiões Atendidas <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.regions}
              onChange={(e) => setFormData({ ...formData, regions: e.target.value })}
              className="w-full px-3 py-2 text-foreground border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Goiânia, Rio Verde, Jataí"
            />
            <p className="text-xs text-gray-500 mt-1">
              Separe múltiplas regiões com vírgula
            </p>
          </div>

          {/* Categorias */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Áreas de Atuação <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Selecione todas as áreas em que o fornecedor atua
            </p>
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg">
              {SUPPLIER_CATEGORIES.map((category) => (
                <label
                  key={category.value}
                  className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition"
                >
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(category.value)}
                    onChange={() => handleToggleCategory(category.value)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{category.label}</span>
                </label>
              ))}
            </div>
            {formData.categories.length === 0 && (
              <p className="text-xs text-red-500 mt-2">
                Selecione pelo menos uma área de atuação
              </p>
            )}
          </div>

          {/* Tipo de fornecedor */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isNetworkSupplier}
                onChange={(e) =>
                  setFormData({ ...formData, isNetworkSupplier: e.target.checked })
                }
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">Fornecedor da Rede CotaAgro</span>
                <p className="text-sm text-gray-600">
                  Marque esta opção se o fornecedor faz parte da rede da plataforma. Caso
                  contrário, será considerado como seu fornecedor pessoal.
                </p>
              </div>
            </label>
          </div>

          {/* Explicação sobre importação via WhatsApp */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Dica:</strong> Você também pode cadastrar fornecedores diretamente pelo
              WhatsApp! Basta compartilhar o contato do fornecedor e ele será automaticamente
              cadastrado como seu fornecedor pessoal.
            </p>
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                formData.categories.length === 0
              }
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Salvando...'
                : supplier
                ? 'Salvar Alterações'
                : 'Cadastrar Fornecedor'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
