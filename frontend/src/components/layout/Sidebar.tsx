import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Users, Building2, CreditCard, Shield, MessageSquare, Settings2, BarChart2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { LogoMark } from '../ui/logo';

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Home, resource: 'DASHBOARD' },
  { name: 'Cotações', path: '/quotes', icon: FileText, resource: 'QUOTES' },
  { name: 'Produtores', path: '/producers', icon: Users, resource: 'PRODUCERS' },
  { name: 'Fornecedores', path: '/suppliers', icon: Building2, resource: 'SUPPLIERS' },
  { name: 'Assinaturas', path: '/subscriptions', icon: CreditCard, resource: 'SUBSCRIPTIONS' },
  { name: 'WhatsApp', path: '/whatsapp', icon: MessageSquare, resource: 'WHATSAPP_CONFIG' },
  { name: 'Usuários', path: '/users', icon: Shield, resource: 'USERS' },
  { name: 'Relatórios', path: '/reports', icon: BarChart2, resource: 'REPORTS' },
  { name: 'Configurações', path: '/settings', icon: Settings2, resource: 'DASHBOARD' },
];

export function Sidebar() {
  const location = useLocation();
  const { hasPermission } = useAuth();

  return (
    <aside className="w-56 bg-[hsl(var(--sidebar))] border-r border-border/50 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <div>
            <div className="text-sm font-bold tracking-wide text-foreground">FARMFLOW</div>
            <div className="text-[10px] text-muted-foreground">Painel Admin</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          // Verificar permissão usando o recurso definido
          const canView = hasPermission(item.resource, 'view');

          if (!canView) {
            return null;
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-normal transition-colors',
                'hover:bg-secondary/80',
                isActive
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/50">
        <div className="px-2.5 py-2 text-xs text-muted-foreground">
          v1.0.0
        </div>
      </div>
    </aside>
  );
}
