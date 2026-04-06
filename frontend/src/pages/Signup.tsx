/**
 * pages/Signup.tsx — Tela de registo do THETA Teams.
 *
 * Design premium: dark glassmorphism com gradiente scarlet.
 * Suporta: 
 *  1. Cadastro de LÍDER (sem invite)
 *  2. Cadastro de COLABORADOR (com invite na URL)
 * 
 * Os metadados 'full_name' e 'invite_token' são enviados para o Supabase
 * para processamento via triggers no banco de dados.
 */

import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle2, Loader2, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Captura o token de convite da URL (se existir)
  const inviteToken = searchParams.get('invite');

  // Estados do formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validação básica de senha
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      // Chamada ao Supabase com metadados cruciais para a arquitetura B2B
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            invite_token: inviteToken || null, // Token lido pelo Trigger SQL
          },
          // Redireciona de volta para o app após confirmação de e-mail (ajuste se necessário)
          emailRedirectTo: `${window.location.origin}/login`,
        }
      });

      if (signUpError) throw signUpError;

      setSuccess(true);
    } catch (err: any) {
      // Tradução de erros comuns
      const msg = err.message || 'Ocorreu um erro ao criar a conta.';
      setError(msg.includes('already registered') ? 'Este e-mail já está em uso.' : msg);
    } finally {
      setLoading(false);
    }
  }

  // View de Sucesso
  if (success) {
    return (
      <div className="w-full min-h-dvh flex items-center justify-center bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-[#0a1a1a] to-[#030303] p-4 font-sans antialiased">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[440px] bg-white/[0.03] border border-white/[0.07] rounded-[32px] p-10 shadow-[0_30px_80px_rgba(0,0,0,0.7)] backdrop-blur-xl text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white mb-4">Conta Criada com Sucesso!</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-10">
            Enviamos um link de confirmação para o seu e-mail.<br/>
            Por favor, verifique a sua caixa de entrada para ativar a sua conta.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full py-4 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] rounded-2xl text-white text-sm font-bold transition-all"
          >
            Voltar para o Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-dvh flex items-center justify-center bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-[#0a1a1a] to-[#030303] p-4 font-sans antialiased">
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-[480px] bg-white/[0.03] border border-white/[0.07] rounded-[32px] p-8 sm:p-10 shadow-[0_30px_80px_rgba(0,0,0,0.7)] backdrop-blur-xl"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <motion.div
            animate={{ boxShadow: ['0 0 20px rgba(0,242,255,0.2)', '0 0 40px rgba(0,242,255,0.4)', '0 0 20px rgba(0,242,255,0.2)'] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-12 h-12 bg-[#00f2ff] rounded-xl flex items-center justify-center mb-4"
          >
            <Shield size={22} className="text-[#0A0A0A]" strokeWidth={2.5} />
          </motion.div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            {inviteToken ? 'Aceitar Convite' : 'Criar Conta Líder'}
          </h1>
          <p className="text-[11px] text-neutral-500 uppercase tracking-widest mt-2 text-center">
            {inviteToken 
              ? 'Você foi convidado para colaborar no THETA Teams' 
              : 'Inicie seu workspace e comece a gerir demandas'}
          </p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-5">
          
          {/* Nome Completo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">
              Nome Completo
            </label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pedro Silva"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-[#00f2ff]/50 transition-all"
              />
            </div>
          </div>

          {/* E-mail */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">
              E-mail Corporativo
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@trabalho.com"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-[#00f2ff]/50 transition-all"
              />
            </div>
          </div>

          {/* Grid de Senhas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">
                Senha
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-[#00f2ff]/50 transition-all"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">
                Confirmar
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-[#00f2ff]/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Mensagem de Erro */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 bg-[#00f2ff]/10 border border-[#00f2ff]/20 rounded-2xl px-4 py-3"
              >
                <AlertCircle size={14} className="text-[#00f2ff] shrink-0" />
                <p className="text-[11px] text-[#00f2ff] font-semibold">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Botão de Cadastro */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full mt-2 py-4 bg-[#00f2ff] rounded-2xl text-[#0A0A0A] text-xs font-black uppercase tracking-[0.2em] shadow-[0_10px_40px_rgba(0,242,255,0.3)] hover:bg-[#00d4ff] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Finalizar Registo
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest">
            Já possui uma conta?{' '}
            <Link to="/login" className="text-[#00f2ff] font-bold hover:underline transition-all">
              Faça Login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
