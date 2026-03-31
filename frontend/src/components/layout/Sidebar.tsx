import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Users, Building2, CreditCard, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Cotações', path: '/quotes', icon: FileText },
  { name: 'Produtores', path: '/producers', icon: Users },
  { name: 'Fornecedores', path: '/suppliers', icon: Building2 },
  { name: 'Assinaturas', path: '/subscriptions', icon: CreditCard },
  { name: 'Usuários', path: '/users', icon: Shield },
];

export function Sidebar() {
  const location = useLocation();
  const { hasPermission } = useAuth();

  return (
    <aside className="w-56 bg-[hsl(var(--sidebar))] border-r border-border/50 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
            <span className="text-xs font-medium text-primary-foreground">CA</span>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">CotaAgro</div>
            <div className="text-xs text-muted-foreground">Painel Admin</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          // Extrair recurso do path
          const resource = item.path.replace('/', '').toUpperCase();
          const canView = hasPermission(resource, 'view');

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
