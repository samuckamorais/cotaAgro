import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from './button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-sm border border-border">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                isDanger
                  ? 'bg-[hsl(var(--error-bg))] text-[hsl(var(--error))]'
                  : 'bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning))]'
              }`}
            >
              {isDanger ? <Trash2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground transition ml-2 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5">
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className={
              isDanger
                ? 'bg-[hsl(var(--error))] hover:bg-[hsl(var(--error))]/90 text-white'
                : ''
            }
          >
            {isLoading ? 'Aguarde...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
