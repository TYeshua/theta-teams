/**
 * pages/Login.tsx — Tela de login do THETA Teams.
 *
 * Design premium: dark glassmorphism com gradiente scarlet.
 * Suporta: login com e-mail/senha via Supabase Auth.
 * Após login, o AuthContext redireciona automaticamente por role.
 */

import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, AlertCircle, Loader2, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';

export function Login() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Se já estiver logado, redireciona imediatamente
  if (user) {
    navigate(user.role === 'LIDER' ? '/dashboard' : '/workbench', { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await signIn(email, password);

    if (authError) {
      // Traduz mensagens comuns do Supabase para português
      const mensagens: Record<string, string> = {
        'Invalid login credentials': 'E-mail ou senha inválidos.',
        'Email not confirmed': 'Confirme seu e-mail antes de fazer login.',
        'Too many requests': 'Muitas tentativas. Aguarde alguns minutos.',
      };
      setError(mensagens[authError] ?? authError);
      setLoading(false);
      return;
    }

    // O onAuthStateChange no AuthContext detecta o login e atualiza o perfil.
    // O useEffect de redirecionamento no App.tsx cuida do redirect por role.
    setLoading(false);
  }

  return (
    <div className="w-full min-h-dvh flex items-center justify-center bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-[#0a1a1a] to-[#030303] p-4 font-sans antialiased">
      
      {/* Card de Login com Glassmorphism */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-[400px] bg-white/[0.03] border border-white/[0.07] rounded-[32px] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.7)] backdrop-blur-xl"
      >
        {/* Logo / Marca */}
        <div className="flex flex-col items-center mb-10">
          <motion.div
            animate={{ boxShadow: ['0 0 20px rgba(0,242,255,0.3)', '0 0 40px rgba(0,242,255,0.5)', '0 0 20px rgba(0,242,255,0.3)'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 bg-[#00f2ff] rounded-2xl flex items-center justify-center mb-4 shadow-[0_8px_30px_rgba(0,242,255,0.4)]"
          >
            <Shield size={26} className="text-[#0A0A0A]" strokeWidth={2.5} />
          </motion.div>
          <h1 className="text-2xl font-black text-white tracking-tight">THETA Teams</h1>
          <p className="text-[11px] text-neutral-500 uppercase tracking-widest mt-1">
            Gestão de Demandas · B2B
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Campo E-mail */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              E-mail
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#00f2ff]/60 focus:bg-white/[0.07] transition-all"
            />
          </div>

          {/* Campo Senha */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              Senha
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#00f2ff]/60 focus:bg-white/[0.07] transition-all"
            />
          </div>

          {/* Mensagem de Erro */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-2 bg-[#00f2ff]/10 border border-[#00f2ff]/20 rounded-xl px-4 py-3"
              >
                <AlertCircle size={14} className="text-[#00f2ff] shrink-0" />
                <p className="text-[11px] text-[#00f2ff] font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Botão de Login */}
          <motion.button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.97 }}
            className="w-full mt-2 py-3.5 bg-[#00f2ff] rounded-xl text-[#0A0A0A] text-sm font-black uppercase tracking-widest shadow-[0_8px_30px_rgba(0,242,255,0.35)] hover:bg-[#00d4ff] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Autenticando...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Entrar no Sistema
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-4">
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest">
            Não possui uma conta?{' '}
            <Link to="/signup" className="text-[#00f2ff] font-bold hover:underline transition-all">
              Criar Conta
            </Link>
          </p>

          {/* Rodapé informativo */}
          <div className="w-full pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-neutral-600 leading-relaxed">
              Líderes: Iniciem seu workspace instantaneamente.<br />
              Colaboradores: Requer convite do seu Líder.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
