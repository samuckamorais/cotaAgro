import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { useCreateProducer, useUpdateProducer } from '../../hooks/useProducers';
import { isValidCpfCnpj, formatCpfCnpj } from '../../lib/validators';
import { X } from 'lucide-react';

interface ProducerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  producer?: any;
}

export function ProducerFormModal({ isOpen, onClose, producer }: ProducerFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    cpfCnpj: '',
    stateRegistration: '',
    farm: '',
    city: '',
    phone: '',
    region: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateProducer();
  const updateMutation = useUpdateProducer();

  useEffect(() => {
    if (producer) {
      setFormData({
        name: producer.name || '',
        cpfCnpj: producer.cpfCnpj || '',
        stateRegistration: producer.stateRegistration || '',
        farm: producer.farm || '',
        city: producer.city || '',
        phone: producer.phone || '',
        region: producer.region || '',
      });
    } else {
      setFormData({
        name: '',
        cpfCnpj: '',
        stateRegistration: '',
        farm: '',
        city: '',
        phone: '',
        region: '',
      });
    }
    setErrors({});
  }, [producer, isOpen]);

  const handleCpfCnpjChange = (value: string) => {
    const formatted = formatCpfCnpj(value);
    setFormData({ ...formData, cpfCnpj: formatted });

    // Validar apenas se tiver 11 ou 14 dígitos
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11 || digits.length === 14) {
      if (!isValidCpfCnpj(value)) {
        setErrors({ ...errors, cpfCnpj: 'CPF/CNPJ inválido' });
      } else {
        const newErrors = { ...errors };
        delete newErrors.cpfCnpj;
        setErrors(newErrors);
      }
    }
  };

  const normalizePhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');

    // Se tem 13 dígitos e começa com 55, já tem DDI
    if (digits.length === 13 && digits.startsWith('55')) {
      return `+${digits}`;
    }

    // Se tem 11 dígitos (DDD + número), adicionar DDI +55
    if (digits.length === 11) {
      return `+55${digits}`;
    }

    // Retornar com + se não tiver
    return digits.startsWith('+') ? digits : `+${digits}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar CPF/CNPJ
    if (!isValidCpfCnpj(formData.cpfCnpj)) {
      setErrors({ cpfCnpj: 'CPF/CNPJ inválido' });
      return;
    }

    const payload = {
      name: formData.name,
      cpfCnpj: formData.cpfCnpj.replace(/\D/g, ''), // enviar apenas dígitos
      stateRegistration: formData.stateRegistration || undefined,
      farm: formData.farm || undefined,
      city: formData.city,
      phone: normalizePhone(formData.phone),
      region: formData.region,
    };

    try {
      if (producer) {
        await updateMutation.mutateAsync({ id: producer.id, data: payload });
        alert('Produtor atualizado com sucesso!');
      } else {
        await createMutation.mutateAsync(payload);
        alert('Produtor cadastrado com sucesso!');
      }
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao salvar produtor');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground">
            {producer ? 'Editar Produtor' : 'Novo Produtor'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Nome Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-foreground bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ex: João Silva"
            />
          </div>

          {/* CPF/CNPJ */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              CPF/CNPJ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.cpfCnpj}
              onChange={(e) => handleCpfCnpjChange(e.target.value)}
              className={`w-full px-3 py-2 text-foreground bg-background border rounded-md focus:outline-none focus:ring-2 ${
                errors.cpfCnpj
                  ? 'border-destructive focus:ring-destructive'
                  : 'border-input focus:ring-ring'
              }`}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              maxLength={18}
            />
            {errors.cpfCnpj && (
              <p className="text-xs text-red-500 mt-1">{errors.cpfCnpj}</p>
            )}
          </div>

          {/* Inscrição Estadual (opcional) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Inscrição Estadual (opcional)
            </label>
            <input
              type="text"
              value={formData.stateRegistration}
              onChange={(e) =>
                setFormData({ ...formData, stateRegistration: e.target.value })
              }
              className="w-full px-3 py-2 text-foreground bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ex: 123456789"
            />
          </div>

          {/* Fazenda (opcional) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Fazenda (opcional)
            </label>
            <input
              type="text"
              value={formData.farm}
              onChange={(e) => setFormData({ ...formData, farm: e.target.value })}
              className="w-full px-3 py-2 text-foreground bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ex: Fazenda São João"
            />
          </div>

          {/* Município */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Município <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-3 py-2 text-foreground bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ex: Goiânia"
            />
          </div>

          {/* Região */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Região/Estado <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              className="w-full px-3 py-2 text-foreground bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ex: GO, Centro-Oeste"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Telefone (WhatsApp) <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 text-foreground bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ex: 64999999999 ou +5564999999999"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Digite com DDD (11 dígitos). Exemplo: 64999999999
            </p>
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                !!errors.cpfCnpj
              }
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Salvando...'
                : producer
                ? 'Salvar Alterações'
                : 'Cadastrar Produtor'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
