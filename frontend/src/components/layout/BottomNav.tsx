import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Users, Building2, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  resource: string;
}

const navItems: NavItem[] = [
  { name: 'Home', path: '/dashboard', icon: Home, resource: 'DASHBOARD' },
  { name: 'Cotações', path: '/quotes', icon: FileText, resource: 'QUOTES' },
  { name: 'Produtores', path: '/producers', icon: Users, resource: 'PRODUCERS' },
  { name: 'Fornecedores', path: '/suppliers', icon: Building2, resource: 'SUPPLIERS' },
  { name: 'Config', path: '/settings', icon: Settings2, resource: 'DASHBOARD' },
];

export function BottomNav() {
  const location = useLocation();
  const { hasPermission } = useAuth();

  // Filter items by permissions
  const visibleItems = navItems.filter((item) => {
    return hasPermission(item.resource, 'view');
  });

  // Limit to 5 items on mobile
  const mobileItems = visibleItems.slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
                          (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                'active:bg-secondary/50 touch-manipulation',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                'relative',
                isActive && 'animate-in zoom-in duration-200'
              )}>
                <Icon className="w-5 h-5" />
                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
