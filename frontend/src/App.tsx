import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './hooks/use-toast';
import { useAnalytics } from './hooks/useAnalytics';
import { usePerformance } from './hooks/usePerformance';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CommandPalette, useCommandPalette } from './components/command/CommandPalette';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileHeader } from './components/layout/MobileHeader';
import { BottomNav } from './components/layout/BottomNav';
import { PageLoadingSkeleton } from './components/ui/page-loading';
import { Login } from './pages/Login'; // Keep Login eager for better UX

// Lazy load route components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Quotes = lazy(() => import('./pages/Quotes').then((m) => ({ default: m.Quotes })));
const QuoteDetail = lazy(() => import('./pages/QuoteDetail').then((m) => ({ default: m.QuoteDetail })));
const Suppliers = lazy(() => import('./pages/Suppliers').then((m) => ({ default: m.Suppliers })));
const Producers = lazy(() => import('./pages/Producers').then((m) => ({ default: m.Producers })));
const Users = lazy(() => import('./pages/Users').then((m) => ({ default: m.Users })));
const Subscriptions = lazy(() => import('./pages/Subscriptions').then((m) => ({ default: m.Subscriptions })));
const WhatsAppConfig = lazy(() => import('./pages/WhatsAppConfig').then((m) => ({ default: m.default })));

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/*" element={<ProtectedLayout />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const commandPalette = useCommandPalette();

  // Track analytics and performance
  useAnalytics();
  usePerformance();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ErrorBoundary>
      {/* Desktop Layout */}
      <div className="hidden md:flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onOpenCommandPalette={commandPalette.open} />
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            <Suspense fallback={<PageLoadingSkeleton />}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/quotes/:id" element={<QuoteDetail />} />
                <Route path="/producers" element={<Producers />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/users" element={<Users />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/whatsapp" element={<WhatsAppConfig />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col h-screen bg-background">
        <MobileHeader onOpenCommandPalette={commandPalette.open} />
        <main className="flex-1 overflow-y-auto pb-16 custom-scrollbar">
          <Suspense fallback={<PageLoadingSkeleton />}>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/quotes/:id" element={<QuoteDetail />} />
              <Route path="/producers" element={<Producers />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/users" element={<Users />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/whatsapp" element={<WhatsAppConfig />} />
            </Routes>
          </Suspense>
        </main>
        <BottomNav />
      </div>

      {/* Command Palette (Cmd+K) - Works on both */}
      <CommandPalette isOpen={commandPalette.isOpen} onClose={commandPalette.close} />
    </ErrorBoundary>
  );
}

export default App;
