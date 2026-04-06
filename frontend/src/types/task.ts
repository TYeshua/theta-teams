export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  category: string;
  due_date: string | null;
  status: TaskStatus;
  urgency: number | null;
  effort: number | null;
  priority_score: number;
  created_at: string;
  updated_at: string;
  parent_id?: number;
  is_fixed_schedule?: boolean;
  start_time?: string | null;
  end_time?: string | null;
  last_activity_at?: string | null;
}

export interface TaskCreate {
  title: string;
  description?: string;
  category?: string;
  due_date?: string;
  status?: TaskStatus;
  parent_id?: number;
  urgency?: number;
  effort?: number;
}

export interface TaskCalibrate {
  urgency: number;
  effort: number;
}

// Thresholds do sistema de chamas
export const SCORE_THRESHOLDS = {
  CRITICAL: 2.5,   // 🔥🔥🔥 ciano pulsante
  HIGH: 1.5,       // 🔥🔥 azul brilhante
  MEDIUM: 0.8,     // 🔥 amarelo
  LOW: 0,          // sem chama
} as const;

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low' | 'uncalibrated';

export function getPriorityLevel(task: Task): PriorityLevel {
  if (task.urgency === null) return 'uncalibrated';
  const s = task.priority_score;
  if (s >= SCORE_THRESHOLDS.CRITICAL) return 'critical';
  if (s >= SCORE_THRESHOLDS.HIGH) return 'high';
  if (s >= SCORE_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

export type ContextMode = 'livre' | 'aula' | 'intervalo';
