import { motion } from 'framer-motion';
import { X, Calendar, Activity, Zap, CheckCircle2, Circle, AlertTriangle, Battery, Folder } from 'lucide-react';
import type { Task } from '../types/task';
import { getPriorityLevel } from '../types/task';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onStatusChange?: (id: number, status: Task['status']) => void;
}

export function TaskDetailModal({ task, onClose, onStatusChange }: TaskDetailModalProps) {
  const priority = getPriorityLevel(task);
  
  const colors = {
    critical: 'text-[#00f2ff] bg-[#00f2ff]/10 border-[#00f2ff]/30',
    high: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    uncalibrated: 'text-neutral-400 bg-white/5 border-white/10',
  };

  const colorClass = colors[priority];

  const handleToggleStatus = () => {
    if (onStatusChange) {
      onStatusChange(task.id, task.status === 'done' ? 'todo' : 'done');
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/[0.05] rounded-[32px] overflow-hidden shadow-2xl"
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${colorClass}`}>
              <Activity size={12} />
              {priority.toUpperCase()}
            </div>
            
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <h2 className="text-2xl font-black text-white leading-tight mb-2">
            {task.title}
          </h2>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-white/[0.03] px-2 py-1 rounded-md">
              <Folder size={12} />
              <span className="capitalize">{task.category || 'Sem categoria'}</span>
            </div>
            
            {task.due_date && (
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-white/[0.03] px-2 py-1 rounded-md">
                <Calendar size={12} />
                <span>{task.due_date}</span>
              </div>
            )}
            
            {task.is_fixed_schedule && (
              <div className="flex items-center gap-1.5 text-xs text-[#00f2ff] bg-[#00f2ff]/10 px-2 py-1 rounded-md border border-[#00f2ff]/20">
                <Zap size={12} />
                <span>Fixa</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-neutral-500 mb-2">
                <AlertTriangle size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Urgência</span>
              </div>
              <div className="text-2xl font-black text-white">
                {task.urgency ?? '-'} <span className="text-sm text-neutral-600 font-medium">/ 10</span>
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-neutral-500 mb-2">
                <Battery size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Esforço</span>
              </div>
              <div className="text-2xl font-black text-white">
                {task.effort ?? '-'} <span className="text-sm text-neutral-600 font-medium">/ 10</span>
              </div>
            </div>
          </div>

          {task.description && (
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 mb-6">
              <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Descrição</h3>
              <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          <button
            onClick={handleToggleStatus}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
              task.status === 'done'
                ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {task.status === 'done' ? <Circle size={18} /> : <CheckCircle2 size={18} />}
              {task.status === 'done' ? 'Reabrir Demanda' : 'Marcar como Concluída'}
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
