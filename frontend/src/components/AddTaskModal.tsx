import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Calendar, Tag, AlignLeft, Loader2, Zap } from 'lucide-react';
import type { TaskCreate } from '../types/task';

interface AddTaskModalProps {
  onClose: () => void;
  onAdd: (data: TaskCreate) => Promise<any>;
  /** Carga atual de effort (soma das tasks ativas) — usado para o Impacto Projetado */
  currentLoad?: number;
}

const CATEGORIES = ['Geral', 'Pesquisa', 'Software', 'Petróleo', 'Estudo', 'Projeto', 'Administrativo', 'Saúde'];
const FIBONACCI_EFFORTS = [1, 2, 3, 5, 8, 13];
const SAFETY_THRESHOLD = 34;

export function AddTaskModal({ onClose, onAdd, currentLoad = 0 }: AddTaskModalProps) {
  const [form, setForm] = useState<TaskCreate>({
    title: '',
    description: '',
    category: 'Geral',
    due_date: '',
    status: 'todo',
  });
  const [selectedEffort, setSelectedEffort] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Impacto Projetado em tempo real
  const projectedLoad = useMemo(
    () => currentLoad + (selectedEffort ?? 0),
    [currentLoad, selectedEffort]
  );
  const isCriticalImpact = selectedEffort !== null && projectedLoad > SAFETY_THRESHOLD;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const payload: TaskCreate = {
        ...form,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : undefined,
        description: form.description || undefined,
      };
      await onAdd(payload);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Física de Mola Premium
  const springTransition = { type: 'spring', stiffness: 400, damping: 30 } as const;

  return (
    <AnimatePresence>
      {/* 1. Backdrop Blur Pesado */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-xl z-50 flex items-end sm:items-center justify-center p-4 pb-8 sm:pb-4"
        onClick={onClose}
      >
        {/* 2. Modal como Bottom-Sheet Lâmina de Vidro */}
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={springTransition}
          className="w-full max-w-[95%] sm:max-w-md bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/[0.05] rounded-[36px] p-6 sm:p-8 shadow-[0_0_80px_rgba(0,0,0,1)] relative overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Brilho Superior Interno (Reflexo) */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />

          {/* Header do Modal */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]">
                <Plus size={18} strokeWidth={2} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">Nova Inserção</h2>
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.02] flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
            >
              <X size={16} strokeWidth={2} />
            </motion.button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Título */}
            <motion.div whileTap={{ scale: 0.99 }}>
              <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2 block ml-1">Título do Módulo *</label>
              <input
                autoFocus
                type="text"
                placeholder="Ex: Refinar Modelo MLP..."
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-4 py-4
                  text-sm text-white placeholder-neutral-700
                  focus:outline-none focus:bg-white/[0.02] focus:border-[#ff2400]/40 focus:ring-1 focus:ring-[#ff2400]/20
                  transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
              />
            </motion.div>

            {/* Descrição */}
            <motion.div whileTap={{ scale: 0.99 }}>
              <label className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2 ml-1">
                <AlignLeft size={10} strokeWidth={2.5} /> Detalhamento
              </label>
              <textarea
                rows={2}
                placeholder="Contexto adicional da demanda..."
                value={form.description || ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-4 py-4
                  text-sm text-white placeholder-neutral-700 resize-none
                  focus:outline-none focus:bg-white/[0.02] focus:border-white/20
                  transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
              />
            </motion.div>

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                Resistência (Effort) — seletor Fibonacci
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div>
              <label className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2.5 ml-1">
                <Zap size={10} strokeWidth={2.5} /> Resistência (pts Fibonacci)
              </label>
              <div className="flex gap-2">
                {FIBONACCI_EFFORTS.map((val) => {
                  const isSelected = selectedEffort === val;
                  return (
                    <motion.button
                      key={val}
                      type="button"
                      whileTap={{ scale: 0.88 }}
                      onClick={() => setSelectedEffort(isSelected ? null : val)}
                      className="flex-1 py-2.5 rounded-xl text-[12px] font-black transition-all duration-200"
                      style={{
                        background: isSelected ? 'rgba(255,36,0,0.15)' : 'rgba(255,255,255,0.03)',
                        border: isSelected ? '1px solid rgba(255,36,0,0.50)' : '1px solid rgba(255,255,255,0.05)',
                        color: isSelected ? '#ff2400' : '#666',
                        boxShadow: isSelected ? '0 0 12px rgba(255,36,0,0.20)' : 'none',
                      }}
                    >
                      {val}
                    </motion.button>
                  );
                })}
              </div>

              {/* ⚠️ THETA ADVICE — Impacto Projetado */}
              <AnimatePresence>
                {isCriticalImpact && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="flex items-start gap-2 px-4 py-3 rounded-2xl text-[10px] font-bold leading-relaxed"
                      style={{
                        background: 'rgba(220,20,60,0.08)',
                        border: '1px solid rgba(220,20,60,0.25)',
                        color: '#dc143c',
                      }}
                    >
                      <span className="shrink-0 mt-0.5">⚠️</span>
                      <span>
                        <span className="font-black tracking-widest">THETA ADVICE:</span>{' '}
                        Esta demanda pode comprometer seu ciclo de foco{' '}
                        <span className="opacity-60">({currentLoad} + {selectedEffort} = {projectedLoad} pts)</span>.
                        Considere fracionar em sub-módulos.
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Categoria + Prazo */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div whileTap={{ scale: 0.98 }}>
                <label className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2 ml-1">
                  <Tag size={10} strokeWidth={2.5} /> Vetor
                </label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-4 py-3.5
                      text-sm text-neutral-300 focus:outline-none focus:border-white/20
                      transition-all appearance-none cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c} className="bg-[#0A0A0A] text-white">{c}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-600">
                    ▼
                  </div>
                </div>
              </motion.div>

              <motion.div whileTap={{ scale: 0.98 }}>
                <label className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2 ml-1">
                  <Calendar size={10} strokeWidth={2.5} /> Prazo
                </label>
                <input
                  type="date"
                  value={form.due_date || ''}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-4 py-3.5
                    text-sm text-neutral-300 focus:outline-none focus:border-[#ff2400]/40 focus:ring-1 focus:ring-[#ff2400]/20
                    transition-all cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]
                    [color-scheme:dark]"
                />
              </motion.div>
            </div>

            {/* Error Handling Limpo */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <p className="text-[10px] font-bold text-[#ff2400] bg-[#ff2400]/10 border border-[#ff2400]/20 rounded-xl px-4 py-3 uppercase tracking-widest mt-2">
                    {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botões Físicos de Ação */}
            <div className="flex gap-3 pt-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="w-1/3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-white/[0.02] transition-colors"
              >
                Abortar
              </motion.button>
              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                disabled={loading || !form.title.trim()}
                className="w-2/3 py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest
                  bg-white text-black
                  disabled:opacity-20 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2 transition-all duration-300"
                style={{
                  boxShadow: isCriticalImpact
                    ? '0 0 28px rgba(220,20,60,0.60), 0 0 10px rgba(220,20,60,0.35)'
                    : '0 0 20px rgba(255,255,255,0.10)',
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sincronizar'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}