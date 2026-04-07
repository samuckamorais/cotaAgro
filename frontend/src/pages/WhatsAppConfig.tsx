import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappConfigApi, type WhatsAppConfig } from '../api/whatsapp-config';
import { StatusCard } from '../components/whatsapp/StatusCard';
import { ProviderSelector } from '../components/whatsapp/ProviderSelector';
import { ConfigForm } from '../components/whatsapp/ConfigForm';
import { QRCodeModal } from '../components/whatsapp/QRCodeModal';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { Skeleton } from '../components/ui/skeleton';
import { useToast } from '../hooks/use-toast';
import { Settings, MessageSquare, BarChart3, AlertCircle } from 'lucide-react';

export default function WhatsAppConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [provider, setProvider] = useState<'twilio' | 'evolution' | 'meta'>('evolution');
  const [credentials, setCredentials] = useState<any>({});
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQrCode] = useState<string>();

  // Query: Obter configuração atual
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['whatsapp-config'],
    queryFn: whatsappConfigApi.getConfig,
  });

  // Query: Obter estatísticas
  const { data: stats } = useQuery({
    queryKey: ['whatsapp-stats'],
    queryFn: () => whatsappConfigApi.getStats('24h'),
    refetchInterval: 60000, // Atualizar a cada 1 minuto
  });

  // Mutation: Salvar configuração
  const saveMutation = useMutation({
    mutationFn: (data: { provider: any; credentials: any }) =>
      whatsappConfigApi.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] });
      toast({
        variant: 'success',
        title: 'Configuração salva!',
        description: 'As configurações do WhatsApp foram salvas com sucesso',
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar configuração',
        description: error.response?.data?.message || error.message,
        duration: 5000,
      });
    },
  });

  // Mutation: Testar conexão
  const testMutation = useMutation({
    mutationFn: whatsappConfigApi.testConnection,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] });
      toast({
        variant: result.success ? 'success' : 'destructive',
        title: result.success ? 'Conexão estabelecida!' : 'Falha ao conectar',
        description: result.message,
        duration: result.success ? 3000 : 5000,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao testar conexão',
        description: error.message,
        duration: 5000,
      });
    },
  });

  // Mutation: Reconectar
  const reconnectMutation = useMutation({
    mutationFn: whatsappConfigApi.reconnect,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] });
      toast({
        variant: result.success ? 'success' : 'warning',
        title: result.success ? 'Reconectado com sucesso!' : 'Tentativa de reconexão',
        description: result.message,
        duration: 4000,
      });
    },
  });

  // Carregar config existente
  useEffect(() => {
    if (config) {
      setProvider(config.provider);
      setCredentials(config.credentials);
    }
  }, [config]);

  // Obter QR Code
  const handleShowQRCode = async () => {
    try {
      const result = await whatsappConfigApi.getQRCode();
      setQrCode(result.qrCode);
      setShowQRModal(true);

      if (!result.success) {
        toast({
          variant: 'warning',
          title: 'WhatsApp já conectado',
          description: result.message,
          duration: 3000,
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar QR Code',
        description: error.message,
        duration: 5000,
      });
    }
  };

  const handleRefreshQRCode = async () => {
    setQrCode(undefined);
    await handleShowQRCode();
  };

  const handleSave = () => {
    saveMutation.mutate({ provider, credentials });
  };

  if (isLoadingConfig) {
    return (
      <>
        <Breadcrumb items={[{ label: 'WhatsApp', icon: <MessageSquare className="w-3 h-3" /> }]} />
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-medium text-foreground mb-1">Configuração do WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              Configure a integração com WhatsApp para envio e recebimento de mensagens
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <Skeleton className="h-64 w-full rounded-md" />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-32 w-full rounded-md" />
              <Skeleton className="h-96 w-full rounded-md" />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'WhatsApp', icon: <MessageSquare className="w-3 h-3" /> }]} />
      <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Configuração do WhatsApp</h1>
        </div>
        <p className="text-muted-foreground">
          Configure a integração com WhatsApp para envio e recebimento de mensagens
        </p>
      </div>

      {/* Alert se não configurado */}
      {!config && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                WhatsApp não configurado
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Configure um provider abaixo para começar a usar o sistema de cotações via
                WhatsApp.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Status + Stats */}
        <div className="space-y-6">
          {config && (
            <StatusCard
              isConnected={config.isConnected}
              provider={config.provider}
              lastMessageAt={config.lastMessageAt}
              messagesSentToday={stats?.sent || config.messagesSentToday}
              messagesReceivedToday={stats?.received || config.messagesReceivedToday}
              connectionError={config.connectionError}
              onTest={() => testMutation.mutate()}
              onReconnect={() => reconnectMutation.mutate()}
              isLoading={testMutation.isPending || reconnectMutation.isPending}
            />
          )}

          {stats && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Estatísticas (24h)</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Enviadas</span>
                  <Badge variant="secondary">{stats.sent}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Recebidas</span>
                  <Badge variant="secondary">{stats.received}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Erros</span>
                  <Badge variant={stats.errors > 0 ? 'error' : 'secondary'}>
                    {stats.errors}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Taxa de erro</span>
                  <Badge variant={stats.errorRate > 5 ? 'error' : 'secondary'}>
                    {stats.errorRate}%
                  </Badge>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Coluna Direita: Configuração */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Configuração</h3>
            </div>

            <ProviderSelector
              value={provider}
              onChange={setProvider}
              disabled={saveMutation.isPending}
            />
          </Card>

          <ConfigForm
            provider={provider}
            values={credentials}
            onChange={setCredentials}
            onSave={handleSave}
            onShowQRCode={provider === 'evolution' ? handleShowQRCode : undefined}
            isLoading={saveMutation.isPending}
          />
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrCode={qrCode}
        onRefresh={handleRefreshQRCode}
      />
      </div>
    </>
  );
}
