/**
 * hooks/useAuth.ts — Hook público para acessar o contexto de autenticação.
 *
 * Uso nos componentes:
 *   const { user, isLeader, signOut, accessToken } = useAuth();
 *
 * Centraliza o acesso ao AuthContext e garante que erros de uso fora do
 * Provider sejam capturados com mensagem clara.
 */

import { useAuthContext } from '../contexts/AuthContext';
import type { AuthContextType } from '../contexts/AuthContext';

/**
 * Hook principal de autenticação do THETA Teams.
 *
 * Retorna:
 *   - user: perfil completo (id, email, role, team_id) ou null
 *   - loading: true enquanto a sessão inicializa
 *   - session: sessão bruta do Supabase
 *   - accessToken: JWT para headers da API FastAPI
 *   - signIn(email, password): faz login, retorna { error }
 *   - signOut(): faz logout
 *   - isLeader(): true se role === 'LIDER'
 */
export function useAuth(): AuthContextType {
  return useAuthContext();
}
