import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Task, TaskCreate, TaskCalibrate } from '../types/task';

const POLL_INTERVAL = 30_000; // 30 segundos

export function useTasks(contextMode: string = 'livre') {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api.getTasks(contextMode);
      setTasks(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [contextMode]);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const addTask = async (data: TaskCreate) => {
    const task = await api.createTask(data);
    setTasks(prev => [task, ...prev]);
    return task;
  };

  const calibrateTask = async (id: number, data: TaskCalibrate) => {
    const updated = await api.calibrateTask(id, data);
    setTasks(prev =>
      [...prev.map(t => (t.id === id ? updated : t))].sort(
        (a, b) => b.priority_score - a.priority_score
      )
    );
    return updated;
  };

  const deleteTask = async (id: number) => {
    const previous = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await api.deleteTask(id);
    } catch (e) {
      setTasks(previous);
      setError((e as Error).message);
    }
  };

  const updateStatus = async (id: number, status: Task['status']) => {
    const previous = [...tasks];
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status } : t)));
    try {
      const updated = await api.updateTask(id, { status });
      setTasks(prev => prev.map(t => (t.id === id ? updated : t)));
      return updated;
    } catch (e) {
      setTasks(previous);
      setError((e as Error).message);
    }
  };

  const purgeDoneTasks = async () => {
    try {
      await api.purgeDoneTasks();
      setTasks(prev => prev.filter(t => t.status !== 'done'));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const factoryResetTasks = async () => {
    try {
      await api.factoryReset();
      setTasks([]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return { tasks, loading, error, fetchTasks, addTask, calibrateTask, deleteTask, updateStatus, purgeDoneTasks, factoryResetTasks };
}
