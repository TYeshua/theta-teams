import type { Task, TaskCreate, TaskCalibrate } from '../types/task';

export interface CapacityData {
  current_load: number;
  max_capacity: number;
  status: 'Optimal' | 'High' | 'Overload';
}

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? 'Erro desconhecido na API');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getTasks: (context?: string) => {
    const qs = context ? `?current_context=${context}` : '';
    return request<Task[]>(`/tasks/${qs}`);
  },

  createTask: (data: TaskCreate) =>
    request<Task>('/tasks/', {
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
