/**
 * App.tsx — Raiz do THETA Teams com AuthProvider + roteamento por role.
 *
 * Fluxo de roteamento:
 *   /login           → Página pública de login
 *   /dashboard       → Protegida: apenas LIDER
 *   /workbench       → Protegida: apenas COLABORADOR
 *   /                → Redireciona para /dashboard ou /workbench conforme role
 *
 * O AuthProvider envolve toda a árvore de componentes, garantindo que
 * qualquer filho possa acessar o contexto de auth via useAuth().
 */

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';

// Lazy loading: melhora o tempo de carregamento inicial
const Login     = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Signup    = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Workbench = lazy(() => import('./pages/Workbench').then(m => ({ default: m.Workbench })));

// ---------------------------------------------------------------------------
// Tela de carregamento enquanto resolve a sessão
// ---------------------------------------------------------------------------
function LoadingScreen() {
  return (
    <div className="w-full min-h-dvh flex items-center justify-center bg-[#030303]">
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em]"
      >
        THETA · Inicializando...
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rota protegida: redireciona para /login se não autenticado
// ---------------------------------------------------------------------------
function ProtectedRoute({ children, requiredRole }: {
  children: React.ReactNode;
  requiredRole?: 'LIDER' | 'COLABORADOR';
}) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  // Não autenticado → vai para o login
  if (!user) return <Navigate to="/login" replace />;

  // Role incorreta → redireciona para a rota certa do seu cargo
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'LIDER' ? '/dashboard' : '/workbench'} replace />;
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Rota raiz: redireciona com base na role do usuário logado
// ---------------------------------------------------------------------------
function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) return <Navigate to="/login" replace />;

  // Líder → Dashboard completo
  // Colaborador → Mesa de Trabalho
  return <Navigate to={user.role === 'LIDER' ? '/dashboard' : '/workbench'} replace />;
}

// ---------------------------------------------------------------------------
// Wrapper do Dashboard (mantém o visual de "aparelho" do design original)
// ---------------------------------------------------------------------------
function DashboardWrapper() {
  return (
    <div className="w-full min-h-dvh flex items-center justify-center bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-[#0a1a1a] to-[#030303] p-0 sm:p-4 font-sans text-gray-100 antialiased selection:bg-[#00f2ff]/30 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.5 }}
        className="w-full sm:w-[430px] h-dvh sm:h-[94vh] sm:max-h-[932px] bg-black sm:rounded-[55px] relative overflow-hidden flex flex-col shadow-[0_0_80px_rgba(0,0,0,1)] ring-0 sm:ring-[12px] ring-neutral-800/80 border-[0.5px] border-white/10"
      >
        {/* Efeito de reflexo no vidro */}
        <div className="hidden sm:block absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none z-40" />

        {/* Dynamic Island */}
        <div className="hidden sm:flex absolute top-[14px] left-[50%] -translate-x-1/2 w-[124px] h-[36px] bg-black rounded-full z-50 items-center justify-between px-3 shadow-[inset_0_-1px_2px_rgba(255,255,255,0.05),0_5px_15px_rgba(0,0,0,0.5)] border border-white/[0.02]">
          <div className="w-3.5 h-3.5 rounded-full bg-[#0a0a0a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] opacity-80" />
          <div className="w-3.5 h-3.5 rounded-full bg-[#0a0a0a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] opacity-80" />
        </div>

        <Dashboard />

        {/* Home Indicator */}
        <motion.div
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.4)' }}
          whileTap={{ scale: 0.95, backgroundColor: 'rgba(255,255,255,0.6)' }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[35%] h-1.5 bg-white/20 rounded-full z-50 cursor-pointer backdrop-blur-md"
        />
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App principal com AuthProvider + React Router
// ---------------------------------------------------------------------------
function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Rota raiz: redireciona por role */}
        <Route path="/" element={<RootRedirect />} />

        {/* Dashboard — exclusivo para LIDER */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="LIDER">
              <DashboardWrapper />
            </ProtectedRoute>
          }
        />

        {/* Workbench — exclusivo para COLABORADOR */}
        <Route
          path="/workbench"
          element={
            <ProtectedRoute requiredRole="COLABORADOR">
              <Workbench />
            </ProtectedRoute>
          }
        />

        {/* Fallback: qualquer rota desconhecida vai para raiz */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* AuthProvider deve envolver os Routes para que useAuth() funcione */}
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}