import type { Task, TaskCreate, TaskCalibrate } from '../types/task';

export interface CapacityData {
  current_load: number;
  max_capacity: number;
  status: 'Optimal' | 'High' | 'Overload';
}

const BASE = '/api';

/** Converte qualquer formato de erro da API em string legível */
function parseApiError(detail: unknown): string {
  if (!detail) return 'Erro desconhecido na API';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    // FastAPI 422: [{ loc, msg, type }]
    return detail.map((d: any) => d?.msg ?? JSON.stringify(d)).join(' | ');
  }
  if (typeof detail === 'object') {
    return JSON.stringify(detail);
  }
  return String(detail);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (networkErr: any) {
    throw new Error(`Falha de rede: ${networkErr?.message ?? 'verifique sua conexão'}`);
  }

  if (!res.ok) {
    // Tenta parsear JSON; se falhar (ex: HTML de erro do Render), usa statusText
    const body = await res.json().catch(() => null);
    const detail = body?.detail ?? body ?? res.statusText;
    throw new Error(parseApiError(detail));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}


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
};
