import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Beaker, Code, AlertCircle, ChevronRight, Circle, CheckCircle2, Trash2 } from 'lucide-react';
import type { Task, TaskStatus } from '../types/task';
import { SCORE_THRESHOLDS } from '../types/task';

interface TaskCardProps {
  task: Task;
  onCalibrate: (task: Task) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: TaskStatus) => void;
}

export function TaskCard({ task, onCalibrate, onDelete, onStatusChange }: TaskCardProps) {
  // THETA Intelligence
  const isCritical = task.priority_score >= SCORE_THRESHOLDS.CRITICAL; 
  const isDone = task.status === 'done';

  // Paleta Restrita: Cinza Fosco, Branco, Laranja, Escarlate
  const categories: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    'Petróleo': { icon: <Beaker size={12} strokeWidth={2.5} />, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
    'Software': { icon: <Code size={12} strokeWidth={2.5} />, color: 'text-neutral-300', bg: 'bg-white/5 border-white/5' },
    'Pesquisa': { icon: <Compass size={12} strokeWidth={2.5} />, color: 'text-neutral-400', bg: 'bg-white/5 border-white/5' },
    'Geral': { icon: <AlertCircle size={12} strokeWidth={2.5} />, color: 'text-neutral-500', bg: 'bg-white/5 border-white/5' },
    'Estudo': { icon: <Compass size={12} strokeWidth={2.5} />, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  };

  const categoryInfo = categories[task.category] || { 
    icon: <AlertCircle size={12} />, color: 'text-neutral-500', bg: 'bg-neutral-800 border-neutral-700' 
  };

  // Física de Mola Premium
  const springTransition = { type: "spring", stiffness: 400, damping: 30 } as const;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: isDone ? 0.4 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      whileHover={{ scale: 1.01 }}
      transition={springTransition}
      className={`
        relative group p-5 sm:p-6 rounded-[32px] bg-[#0A0A0A]/60 backdrop-blur-xl overflow-hidden
        border transition-colors duration-500
        ${isCritical && !isDone ? 'border-[#00f2ff]/30 shadow-[0_0_20px_rgba(0,242,255,0.1),inset_0_2px_10px_rgba(255,255,255,0.02)]' 
        : 'border-white/[0.04] shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_2px_10px_rgba(255,255,255,0.02)]'}
      `}
    >
      {/* Luz Orgânica de Fundo para Críticos (OLED Glow) */}
      {isCritical && !isDone && (
        <motion.div
          animate={{ opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-12 -right-12 w-48 h-48 bg-[#00f2ff] blur-[70px] rounded-full pointer-events-none z-0"
        />
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Cabeçalho do Card */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 w-max rounded-full border ${categoryInfo.bg} ${categoryInfo.color}`}>
              {categoryInfo.icon}
              <span className="text-[9px] font-black uppercase tracking-widest">{task.category}</span>
            </div>
            
            {isCritical && !isDone && (
              <motion.div 
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex items-center gap-1 text-[#00f2ff] ml-1"
              >
                <AlertCircle size={10} strokeWidth={3} />
                <span className="text-[8px] font-black uppercase tracking-[0.2em]">Crítico</span>
              </motion.div>
            )}
          </div>

          {/* Status Checkbox (Físico) */}
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={() => onStatusChange(task.id, isDone ? 'todo' : 'done')}
            className="p-1 -mr-2 text-neutral-500 hover:text-white transition-colors"
          >
            {isDone ? (
              <CheckCircle2 size={24} className="text-neutral-600" />
            ) : (
              <Circle size={24} strokeWidth={1.5} />
            )}
          </motion.button>
        </div>

        {/* Corpo: Título e Descrição */}
        <h3 className={`text-base font-bold mb-1.5 tracking-tight transition-colors duration-300
          ${isDone ? 'text-neutral-500 line-through' : 'text-white group-hover:text-neutral-200'}`}>
          {task.title}
        </h3>
        
        {task.description && (
          <p className="text-[11px] text-neutral-400 font-medium leading-relaxed mb-5 line-clamp-2 pr-4">
            {task.description}
          </p>
        )}

        {/* Rodapé: Score, Calibrar e Deletar */}
        <div className="mt-auto flex items-end justify-between pt-4 border-t border-white/[0.03]">
          
          {/* Telemetria de Score */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] text-neutral-600 font-black uppercase tracking-[0.2em]">
              Score Theta
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-black tabular-nums tracking-tighter transition-colors duration-500
                ${isDone ? 'text-neutral-600' : isCritical ? 'text-[#00f2ff] drop-shadow-[0_0_10px_rgba(0,242,255,0.4)]' : 'text-white'}`}>
                {task.priority_score.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            {/* Botão Secundário de Deletar (Ghost) */}
            <motion.button 
              whileHover={{ scale: 1.1, backgroundColor: "rgba(0,242,255,0.1)", color: "#00f2ff" }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete(task.id)}
              className="p-2.5 rounded-full text-neutral-600 transition-colors"
            >
              <Trash2 size={14} strokeWidth={2} />
            </motion.button>

            {/* Botão Primário de Calibração */}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCalibrate(task)}
              className={`px-4 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5
                ${isDone 
                  ? 'bg-transparent border border-white/[0.05] text-neutral-600' 
                  : 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]'}`}
            >
              Calibrar
              <ChevronRight size={12} strokeWidth={3} className={isDone ? "opacity-50" : ""} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}