import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface TeamMember {
  id: string;
  full_name: string | null;
  role: string;
  team_id: string | null;
}

/**
 * Hook para buscar todos os colaboradores da equipe do Líder atual.
 */
export function useTeamMembers() {
  const { user, isLeader } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamMembers = useCallback(async () => {
    if (!user?.team_id || !isLeader()) {
      setTeamMembers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, role, team_id')
        .eq('team_id', user.team_id)
        .eq('role', 'COLABORADOR');

      if (fetchError) throw fetchError;

      setTeamMembers(data || []);
    } catch (err: any) {
      console.error('[THETA] Erro ao buscar membros da equipe:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.team_id, isLeader]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  return { teamMembers, loading, error, refresh: fetchTeamMembers };
}
