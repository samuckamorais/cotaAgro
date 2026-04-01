import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LogOut, User as UserIcon, ShieldCheck, Sun, Moon, Monitor } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export function Header() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
      logout();
      navigate('/login');
    }
  };

  const themeOptions = [
    { value: 'light' as const, label: 'Claro', icon: Sun },
    { value: 'dark' as const, label: 'Escuro', icon: Moon },
    { value: 'system' as const, label: 'Sistema', icon: Monitor },
  ];

  const currentThemeOption = themeOptions.find((opt) => opt.value === theme)!;
  const CurrentThemeIcon = currentThemeOption.icon;

  return (
    <header className="h-14 border-b border-border bg-background px-6 flex items-center justify-between">
      <div>
        <h2 className="text-sm font-medium text-foreground">
          Bem-vindo, {user?.name}
        </h2>
        <p className="text-xs text-muted-foreground">Gerencie suas cotações agrícolas</p>
      </div>

      <div className="flex items-center gap-2">
        {/* User Info */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-secondary/50 rounded-md border-0.5 border-border">
          <div className="flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-normal text-foreground">{user?.email}</span>
          </div>
          {user?.role === 'ADMIN' && (
            <Badge variant="default" className="text-xs">
              <ShieldCheck className="w-3 h-3 mr-0.5" />
              Admin
            </Badge>
          )}
        </div>

        {/* Theme Selector */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="relative"
          >
            <CurrentThemeIcon className="w-4 h-4" />
          </Button>

          {showThemeMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowThemeMenu(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 top-full mt-1 w-32 bg-popover border-0.5 border-border rounded-md z-50 py-1">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTheme(option.value);
                        setShowThemeMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-secondary transition-colors ${
                        theme === option.value
                          ? 'text-primary font-medium'
                          : 'text-foreground font-normal'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-xs">Sair</span>
        </Button>
      </div>
    </header>
  );
}
