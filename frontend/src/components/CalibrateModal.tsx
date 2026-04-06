import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Zap, Gauge } from 'lucide-react';
import type { Task, TaskCalibrate } from '../types/task';

interface CalibrateModalProps {
  task: Task;
  onClose: () => void;
  onCalibrate: (id: number, data: TaskCalibrate) => Promise<any>;
}

const URGENCY_LABELS = ['', 'Baixa', 'Leve', 'Moderada', 'Alta', 'Crítica'];
const EFFORT_OPTIONS = [1, 2, 3, 5, 8, 13];

function previewScore(urgency: number, effort: number): string {
  if (!urgency || !effort) return '—';
  return (urgency / effort).toFixed(2);
}

export function CalibrateModal({ task, onClose, onCalibrate }: CalibrateModalProps) {
  const [urgency, setUrgency] = useState<number>(task.urgency ?? 3);
  const [effort, setEffort] = useState<number>(task.effort ?? 3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const score = urgency / effort;
  const isCritical = score >= 2.5;
  const isHigh = score >= 1.5 && !isCritical;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onCalibrate(task.id, { urgency, effort });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Física Premium
  const springTransition = { type: 'spring', stiffness: 400, damping: 30 } as const;

  // Lógica do Indicador Visual de Resistência
  const currentEffortIndex = EFFORT_OPTIONS.indexOf(effort);
  const getFrictionColor = () => {
    if (effort === 13) return 'bg-[#00f2ff] shadow-[0_0_12px_rgba(0,242,255,0.6)]'; // Crítico (Ciano)
    if (effort >= 5) return 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]'; // Pesado (Azul)
    return 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.2)]'; // Normal (Branco)
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-xl z-50 flex items-end sm:items-center justify-center p-4 pb-8 sm:pb-4"
        onClick={onClose}
      >
        {/* Modal Bottom-Sheet */}
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={springTransition}
          className="w-full max-w-[95%] sm:max-w-md bg-[#0A0A0A]/90 backdrop-blur-3xl border border-white/[0.05] rounded-[36px] p-6 sm:p-8 shadow-[0_0_80px_rgba(0,0,0,1)] relative overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Brilho Superior */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Gauge size={16} strokeWidth={2} className="text-white" />
                <h2 className="text-lg font-bold text-white tracking-tight uppercase">Calibração Neural</h2>
              </div>
              <p className="text-[11px] text-neutral-500 font-medium tracking-wide line-clamp-1 max-w-[240px]">
                {task.title}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.02] flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
            >
              <X size={16} strokeWidth={2} />
            </motion.button>
          </div>

          {/* Mostrador de Telemetria (Score) */}
          <div className="bg-[#030303] border border-white/[0.03] shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)] rounded-[24px] p-6 mb-8 text-center relative overflow-hidden">
            {/* Efeito de Reflexo no Mostrador */}
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2">Score Projetado</p>
            <div className={`text-4xl font-black tabular-nums tracking-tighter transition-all duration-500
              ${isCritical ? 'text-[#00f2ff] drop-shadow-[0_0_20px_rgba(0,242,255,0.6)]' 
              : isHigh ? 'text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]' 
              : 'text-white'}`}>
              {previewScore(urgency, effort)}
            </div>
            <div className="flex justify-center gap-1 mt-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Flame 
                  key={i} 
                  size={14} 
                  className={`transition-all duration-500 ${
                    (isCritical && i < 3) || (isHigh && i < 2) || (score >= 0.8 && i < 1) 
                    ? isCritical ? 'text-[#00f2ff]' : isHigh ? 'text-blue-500' : 'text-neutral-300'
                    : 'text-neutral-800'
                  }`} 
                  fill="currentColor" 
                />
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Urgência (1 a 5) */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <label className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                  <Zap size={10} strokeWidth={2.5} /> Urgência
                </label>
                <span className="text-[10px] text-white font-bold tracking-widest uppercase">
                  Nível {urgency}: <span className="text-neutral-400">{URGENCY_LABELS[urgency]}</span>
                </span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <motion.button
                    key={v}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setUrgency(v)}
                    className={`
                      flex-1 py-3.5 rounded-2xl text-sm font-black tabular-nums transition-colors duration-200
                      ${urgency === v
                        ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                        : 'bg-[#050505] text-neutral-500 border border-white/[0.05] hover:bg-white/[0.02] hover:text-neutral-300'}
                    `}
                  >
                    {v}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Esforço (Fibonacci) */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                    Resistência (Fibonacci)
                  </label>
                  {/* Friction Index (Barra de Atrito Minimalista) */}
                  <div className="flex gap-1">
                    {EFFORT_OPTIONS.map((_, i) => (
                      <div 
                        key={i}
                        className={`h-1 w-3 rounded-full transition-all duration-500 ${
                          i <= currentEffortIndex ? getFrictionColor() : 'bg-white/[0.05]'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                
                <span className="text-[10px] text-white font-bold tracking-widest uppercase text-right">
                  {effort} <span className="text-neutral-400">Pts</span>
                </span>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {EFFORT_OPTIONS.map(v => (
                  <motion.button
                    key={v}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setEffort(v)}
                    className={`
                      flex-1 min-w-[50px] py-3.5 rounded-2xl text-sm font-black tabular-nums transition-colors duration-200
                      ${effort === v
                        ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                        : 'bg-[#050505] text-neutral-500 border border-white/[0.05] hover:bg-white/[0.02] hover:text-neutral-300'}
                    `}
                  >
                    {v}
                  </motion.button>
                ))}
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-[10px] font-bold text-[#00f2ff] bg-[#00f2ff]/10 border border-[#00f2ff]/20 rounded-xl px-4 py-3 uppercase tracking-widest mt-2">
                  {error}
                </p>
              </motion.div>
            )}

            {/* Ações */}
            <div className="flex gap-3 pt-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="w-1/3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-white/[0.02] transition-colors"
              >
                Cancelar
              </motion.button>
              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                disabled={loading}
                className="w-2/3 py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest
                  bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]
                  disabled:opacity-20 flex items-center justify-center gap-2"
              >
                {loading ? 'Processando...' : 'Confirmar'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}