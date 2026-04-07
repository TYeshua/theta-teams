/**
 * contexts/AuthContext.tsx — Estado global de autenticação do THETA Teams.
 *
 * Responsabilidades:
 *   1. Gerenciar a sessão do Supabase (login, logout, refresh automático).
 *   2. Buscar o perfil do usuário (role, team_id) após autenticação.
 *   3. Expor o access_token JWT para o serviço de API enviar nos headers.
 *   4. Redirecionar automaticamente LIDER → /dashboard, COLABORADOR → /workbench.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Cargos disponíveis no THETA Teams */
export type Role = 'LIDER' | 'COLABORADOR';

/** Perfil enriquecido do usuário (auth + tabela profiles) */
export interface UserProfile {
  id: string;
  email: string | undefined;
  full_name: string | null;
  role: Role;
  team_id: string | null;
  team_name: string | null;
}

/** Forma do contexto exposto para os componentes filhos */
export interface AuthContextType {
  /** Usuário autenticado com perfil completo. null = não logado. */
  user: UserProfile | null;
  /** Sessão bruta do Supabase (contém o access_token JWT). */
  session: Session | null;
  /** true enquanto a sessão está sendo carregada na inicialização. */
  loading: boolean;
  /** Faz login com e-mail e senha via Supabase. */
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Faz logout e limpa o estado. */
  signOut: () => Promise<void>;
  /** Atalho: retorna true se o usuário é LIDER. */
  isLeader: () => boolean;
  /** JWT atual para uso nos headers da API FastAPI. */
  accessToken: string | null;
  /** Re-busca os dados do perfil (útil após criar equipe ou aceitar convite). */
  refreshProfile: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Criação do contexto
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Busca o perfil do usuário na tabela `profiles` do Supabase.
   * Retorna dados de role e team_id que não estão no JWT por padrão.
   */
  const fetchProfile = useCallback(async (supabaseUser: User): Promise<UserProfile> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, team_id, teams(name)')
      .eq('id', supabaseUser.id)
      .single();

    if (error || !data) {
      // Perfil ainda não existe (trigger em processamento) — usa defaults seguros
      console.warn('[THETA Auth] Perfil não encontrado, usando defaults:', error?.message);
      return {
        id: supabaseUser.id,
        email: supabaseUser.email,
        full_name: null,
        role: 'COLABORADOR',
        team_id: null,
        team_name: null,
      };
    }

    return {
      id: data.id,
      email: data.email ?? supabaseUser.email,
      full_name: data.full_name,
      role: data.role as Role,
      team_id: data.team_id,
      team_name: (data.teams as any)?.name ?? null,
    };
  }, []);

  /**
   * Processa uma nova sessão: atualiza state e busca perfil.
   */
  const handleSession = useCallback(
    async (newSession: Session | null) => {
      setSession(newSession);

      if (newSession?.user) {
        const profile = await fetchProfile(newSession.user);
        setUser(profile);
      } else {
        setUser(null);
      }

      setLoading(false);
    },
    [fetchProfile]
  );

  // ---------------------------------------------------------------------------
  // Inicialização: verifica sessão persistida no localStorage
  // e subscreve às mudanças de auth (login em outra aba, token refresh, etc.)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Tenta recuperar sessão já salva (ex: usuário recarregou a página)
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      handleSession(existingSession);
    });

    // Escuta eventos de auth: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        handleSession(newSession);
      }
    );

    // Cleanup: cancela a subscrição quando o componente desmonta
    return () => subscription.unsubscribe();
  }, [handleSession]);

  // ---------------------------------------------------------------------------
  // Ações de Auth
  // ---------------------------------------------------------------------------

  /**
   * Faz login com e-mail e senha via Supabase Auth.
   * Retorna { error: null } em caso de sucesso ou { error: "mensagem" } em falha.
   */
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    },
    []
  );

  /**
   * Faz logout e limpa o estado global.
   */
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  /**
   * Atalho para verificar se o usuário logado é LIDER.
   */
  const isLeader = useCallback((): boolean => {
    return user?.role === 'LIDER';
  }, [user]);

  // JWT atual para injetar nos headers da API FastAPI
  const accessToken = session?.access_token ?? null;

  /** Força a re-busca do perfil do usuário logado */
  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      const profile = await fetchProfile(session.user);
      setUser(profile);
    }
  }, [session, fetchProfile]);

  // ---------------------------------------------------------------------------
  // Valor do contexto
  // ---------------------------------------------------------------------------
  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signOut,
    isLeader,
    accessToken,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook interno (usado apenas por useAuth.ts — não exportar direto nos componentes)
// ---------------------------------------------------------------------------
export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('[THETA] useAuthContext deve ser usado dentro do <AuthProvider>.');
  }
  return ctx;
}
