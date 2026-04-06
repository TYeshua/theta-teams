/**
 * services/api.ts — Cliente HTTP para a API FastAPI do THETA Teams.
 *
 * Injeta automaticamente o JWT do Supabase no header Authorization.
 * O token é obtido diretamente do cliente Supabase (não precisa passar props).
 */

import type { Task, TaskCreate, TaskCalibrate } from '../types/task';
import { supabase } from '../lib/supabase';

export interface CapacityData {
  current_load: number;
  max_capacity: number;
  status: 'Optimal' | 'High' | 'Overload';
}

export interface TeamData {
  id: string;
  name: string;
  leader_id: string;
  created_at: string;
}

export interface MemberData {
  id: string;
  email: string;
  full_name: string | null;
  role: 'LIDER' | 'COLABORADOR';
  team_id: string | null;
}

const BASE = '/api';

/** Converte qualquer formato de erro da API em string legível */
function parseApiError(detail: unknown): string {
  if (!detail) return 'Erro desconhecido na API';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d?.msg ?? JSON.stringify(d)).join(' | ');
  }
  if (typeof detail === 'object') return JSON.stringify(detail);
  return String(detail);
}

/**
 * Obtém o JWT atual da sessão Supabase.
 * Retorna null se não houver sessão ativa.
 */
async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Wrapper HTTP com injeção automática de JWT.
 * Adiciona o header Authorization: Bearer <token> em todas as requisições.
 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> ?? {}),
  };

  // Injeta o token se o usuário estiver autenticado
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (networkErr: any) {
    throw new Error(`Falha de rede: ${networkErr?.message ?? 'verifique sua conexão'}`);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail ?? body ?? res.statusText;
    throw new Error(parseApiError(detail));
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}


// ---------------------------------------------------------------------------
// TASKS
// ---------------------------------------------------------------------------
export const api = {
  getTasks: (context?: string) => {
    const qs = context ? `?current_context=${encodeURIComponent(context)}` : '';
    return request<Task[]>(`/tasks${qs}`);
  },

  createTask: (data: TaskCreate) =>
    request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  calibrateTask: (id: number, data: TaskCalibrate) =>
    request<Task>(`/tasks/${id}/calibrate`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateTask: (id: number, data: Partial<Task>) =>
    request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTask: (id: number) =>
    request<void>(`/tasks/${id}`, { method: 'DELETE' }),

  purgeDoneTasks: () =>
    request<void>('/tasks/maintenance/purge-done', { method: 'DELETE' }),

  factoryReset: () =>
    request<void>('/tasks/maintenance/factory-reset', { method: 'DELETE' }),

  getCapacity: () =>
    request<CapacityData>('/tasks/capacity'),

  // ---------------------------------------------------------------------------
  // TEAMS
  // ---------------------------------------------------------------------------

  /** Cria uma nova equipe (apenas Líder). */
  createTeam: (name: string) =>
    request<TeamData>('/teams', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  /** Retorna a equipe do usuário logado. */
  getMyTeam: () =>
    request<TeamData>('/teams/me'),

  /** Lista os membros da equipe (apenas Líder). */
  listMembers: () =>
    request<MemberData[]>('/teams/members'),

  /** Convida um colaborador por e-mail (apenas Líder). */
  inviteMember: (email: string) =>
    request<{ message: string; invited: boolean; associated: boolean }>('/teams/members', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};
