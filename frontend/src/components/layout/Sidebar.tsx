import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Users, Building2, CreditCard } from 'lucide-react';
import { cn } from '../../lib/utils';

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Cotações', path: '/quotes', icon: FileText },
  { name: 'Produtores', path: '/producers', icon: Users },
  { name: 'Fornecedores', path: '/suppliers', icon: Building2 },
  { name: 'Assinaturas', path: '/subscriptions', icon: CreditCard },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-green-700">🌾 CotaAgro</h1>
        <p className="text-sm text-gray-600">Painel Administrativo</p>
      </div>

      <nav className="px-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-green-100 text-green-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
