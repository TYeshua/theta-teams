/**
 * lib/supabase.ts — Cliente Supabase configurado para o THETA Teams.
 *
 * As variáveis de ambiente devem ser definidas no arquivo .env.local:
 *   VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=<chave anon pública>
 *
 * IMPORTANTE: A ANON KEY é pública (segura para o frontend).
 * Nunca exponha a SERVICE_ROLE_KEY no frontend.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[THETA] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos no .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persiste a sessão no localStorage para sobreviver a recarregamentos
    persistSession: true,
    // Atualiza o token automaticamente antes de expirar
    autoRefreshToken: true,
    // Detecta mudanças de sessão em outras abas do mesmo browser
    detectSessionInUrl: true,
  },
});
