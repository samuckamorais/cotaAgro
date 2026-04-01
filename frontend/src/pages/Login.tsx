import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-11 h-11 bg-primary rounded-md mb-4">
            <span className="text-base font-medium text-primary-foreground">CA</span>
          </div>
          <h1 className="text-2xl font-medium text-foreground mb-1">CotaAgro</h1>
          <p className="text-sm text-muted-foreground">
            Sistema de Gestão de Cotações Agrícolas
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card border-0.5 border-border rounded-md p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-[hsl(var(--error-bg))] border-0.5 border-[hsl(var(--error))]/20 rounded-md p-3">
                <p className="text-sm text-[hsl(var(--error))]">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-normal text-foreground">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border-0.5 border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                placeholder="seu@email.com"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-normal text-foreground">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border-0.5 border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring transition-colors pr-10"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="mt-6 pt-6 border-t border-border/50">
              <div className="bg-secondary/50 rounded-md p-3">
                <p className="text-xs text-muted-foreground text-center">
                  <span className="font-medium text-foreground">Credenciais padrão:</span><br />
                  admin@cotaagro.com / Farmflow0147*
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
