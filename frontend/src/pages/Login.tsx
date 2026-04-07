import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Eye, EyeOff, Wheat, TrendingUp, Users, MessageSquare } from 'lucide-react';

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
    <div className="min-h-screen flex">
      {/* Left Side - Branding & Features */}
      <div className="hidden lg:flex lg:flex-1 bg-primary relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20">
            <Wheat className="w-32 h-32 text-primary-foreground" />
          </div>
          <div className="absolute bottom-32 right-32">
            <Wheat className="w-40 h-40 text-primary-foreground" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Wheat className="w-64 h-64 text-primary-foreground" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          {/* Logo & Title */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 bg-primary-foreground/10 rounded-lg backdrop-blur-sm">
                <Wheat className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">CotaAgro</h1>
                <p className="text-primary-foreground/80 text-sm">Gestão Inteligente de Cotações</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-6 max-w-md">
            <h2 className="text-2xl font-semibold mb-8">
              Simplifique suas cotações agrícolas
            </h2>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 bg-primary-foreground/10 rounded-lg backdrop-blur-sm shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">WhatsApp Integrado</h3>
                  <p className="text-sm text-primary-foreground/80">
                    Receba e envie cotações direto pelo WhatsApp de forma automática
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 bg-primary-foreground/10 rounded-lg backdrop-blur-sm shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Gestão Eficiente</h3>
                  <p className="text-sm text-primary-foreground/80">
                    Acompanhe todas as cotações em um só lugar com dashboard intuitivo
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 bg-primary-foreground/10 rounded-lg backdrop-blur-sm shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Rede de Fornecedores</h3>
                  <p className="text-sm text-primary-foreground/80">
                    Acesse uma rede completa de fornecedores e produtores
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-primary-foreground/60">
            <p>© 2024 CotaAgro. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-xl mb-4">
              <Wheat className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">CotaAgro</h1>
            <p className="text-sm text-muted-foreground">
              Sistema de Gestão de Cotações Agrícolas
            </p>
          </div>

          {/* Welcome Message */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Bem-vindo de volta
            </h2>
            <p className="text-muted-foreground">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3.5">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-foreground bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="seu@email.com"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-foreground bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all pr-11"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar no Sistema'}
              </Button>
            </form>
          </div>

          {/* Footer Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Ao entrar, você concorda com nossos{' '}
              <span className="text-primary hover:underline cursor-pointer">
                Termos de Uso
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
