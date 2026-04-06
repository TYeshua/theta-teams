import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Calendar, Tag, AlignLeft, Loader2, Zap, Flame } from 'lucide-react';
import type { TaskCreate } from '../types/task';

interface AddTaskModalProps {
  onClose: () => void;
  onAdd: (data: TaskCreate) => Promise<any>;
  /** Carga atual de effort (soma das tasks ativas) — usado para o Impacto Projetado */
  currentLoad?: number;
}

const CATEGORIES = ['Geral', 'Pesquisa', 'Software', 'Petróleo', 'Estudo', 'Projeto', 'Administrativo', 'Saúde'];
const FIBONACCI_EFFORTS = [1, 2, 3, 5, 8, 13];
const URGENCY_LEVELS = [
  { value: 1, label: '1', desc: 'Baixa' },
  { value: 2, label: '2', desc: 'Leve' },
  { value: 3, label: '3', desc: 'Média' },
  { value: 4, label: '4', desc: 'Alta' },
  { value: 5, label: '5', desc: 'Crítica' },
];
const SAFETY_THRESHOLD = 34;

// Cores gradativas para urgência
const URGENCY_COLORS: Record<number, { bg: string; border: string; color: string; glow: string }> = {
  1: { bg: 'rgba(100,200,100,0.10)', border: 'rgba(100,200,100,0.40)', color: '#64c864', glow: 'rgba(100,200,100,0.20)' },
  2: { bg: 'rgba(180,220,80,0.10)',  border: 'rgba(180,220,80,0.40)',  color: '#b4dc50', glow: 'rgba(180,220,80,0.20)'  },
  3: { bg: 'rgba(255,200,0,0.10)',   border: 'rgba(255,200,0,0.40)',   color: '#ffc800', glow: 'rgba(255,200,0,0.20)'   },
  4: { bg: 'rgba(59,130,246,0.12)',   border: 'rgba(59,130,246,0.50)',   color: '#3b82f6', glow: 'rgba(59,130,246,0.25)'   },
  5: { bg: 'rgba(0,242,255,0.15)',    border: 'rgba(0,242,255,0.55)',    color: '#00f2ff', glow: 'rgba(0,242,255,0.30)'    },
};

export function AddTaskModal({ onClose, onAdd, currentLoad = 0 }: AddTaskModalProps) {
  const [form, setForm] = useState<Omit<TaskCreate, 'urgency' | 'effort'>>({
    title: '',
    description: '',
    category: 'Geral',
    due_date: '',
    status: 'todo',
  });
  const [selectedEffort, setSelectedEffort] = useState<number | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Impacto Projetado em tempo real
  const projectedLoad = useMemo(
    () => currentLoad + (selectedEffort ?? 0),
    [currentLoad, selectedEffort]
  );
  const isCriticalImpact = selectedEffort !== null && projectedLoad > SAFETY_THRESHOLD;

  // Score projetado em tempo real
  const projectedScore = useMemo(() => {
    if (!selectedUrgency || !selectedEffort) return null;
    return (selectedUrgency / selectedEffort).toFixed(2);
  }, [selectedUrgency, selectedEffort]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const payload: TaskCreate = {
        ...form,
        due_date: form.due_date ? new Date(form.due_date as string).toISOString() : undefined,
        description: form.description || undefined,
        urgency: selectedUrgency ?? undefined,
        effort: selectedEffort ?? undefined,
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
        className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        {/* 2. Modal como Bottom-Sheet no mobile / dialog no desktop */}
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: 80, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.97 }}
          transition={springTransition}
          className="w-full sm:max-w-md bg-[#0A0A0A]/95 backdrop-blur-3xl border border-white/[0.06] rounded-t-[32px] sm:rounded-[32px] shadow-[0_0_80px_rgba(0,0,0,1)] relative flex flex-col"
          style={{ maxHeight: '92dvh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Brilho Superior Interno (Reflexo) */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 rounded-t-[32px]" />

          {/* Puxador visual (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header do Modal — fixo */}
          <div className="flex items-center justify-between px-7 pt-4 pb-4 sm:pt-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]">
                <Plus size={18} strokeWidth={2} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight leading-none">Nova Inserção</h2>
                {projectedScore && (
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Score projetado: <span className="text-[#00f2ff] font-black">{projectedScore}</span>
                  </p>
                )}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.02] flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
            >
              <X size={16} strokeWidth={2} />
            </motion.button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-7 pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            <form id="add-task-form" onSubmit={handleSubmit} className="space-y-5">
              {/* Título */}
              <div>
                <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2 block ml-1">Título do Módulo *</label>
                <input
                  type="text"
                  enterKeyHint="next"
                  placeholder="Ex: Refinar Modelo MLP..."
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-4 py-4
                    text-sm text-white placeholder-neutral-700
                    focus:outline-none focus:bg-white/[0.02] focus:border-[#00f2ff]/40 focus:ring-1 focus:ring-[#00f2ff]/20
                    transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2 ml-1">
                  <AlignLeft size={10} strokeWidth={2.5} /> Detalhamento
                </label>
                <textarea
                  rows={2}
                  enterKeyHint="next"
                  placeholder="Contexto adicional da demanda..."
                  value={form.description || ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-4 py-4
                    text-sm text-white placeholder-neutral-700 resize-none
                    focus:outline-none focus:bg-white/[0.02] focus:border-white/20
                    transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                />
              </div>

              {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                  URGÊNCIA (1-5) — seletor com cor gradativa
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
              <div>
                <label className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2.5 ml-1">
                  <Flame size={10} strokeWidth={2.5} /> Urgência (1–5)
                </label>
                <div className="flex gap-2">
                  {URGENCY_LEVELS.map(({ value, label, desc }) => {
                    const isSelected = selectedUrgency === value;
                    const colors = URGENCY_COLORS[value];
                    return (
                      <motion.button
                        key={value}
                        type="button"
                        whileTap={{ scale: 0.88 }}
                        onClick={() => setSelectedUrgency(isSelected ? null : value)}
                        className="flex-1 py-2.5 rounded-xl transition-all duration-200 flex flex-col items-center gap-0.5"
                        style={{
                          background: isSelected ? colors.bg : 'rgba(255,255,255,0.03)',
                          border: isSelected ? `1px solid ${colors.border}` : '1px solid rgba(255,255,255,0.05)',
                          boxShadow: isSelected ? `0 0 12px ${colors.glow}` : 'none',
                        }}
                        title={desc}
                      >
                        <span className="text-[13px] font-black" style={{ color: isSelected ? colors.color : '#666' }}>
                          {label}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: isSelected ? colors.color : '#444' }}>
                          {desc}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                  RESISTÊNCIA (Effort) — seletor Fibonacci
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
                          background: isSelected ? 'rgba(0,242,255,0.15)' : 'rgba(255,255,255,0.03)',
                          border: isSelected ? '1px solid rgba(0,242,255,0.50)' : '1px solid rgba(255,255,255,0.05)',
                          color: isSelected ? '#00f2ff' : '#666',
                          boxShadow: isSelected ? '0 0 12px rgba(0,242,255,0.20)' : 'none',
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
                          background: 'rgba(59,130,246,0.08)',
                          border: '1px solid rgba(59,130,246,0.25)',
                          color: '#3b82f6',
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
                <div>
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
                </div>

                <div>
                  <label className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2 ml-1">
                    <Calendar size={10} strokeWidth={2.5} /> Prazo
                  </label>
                  <input
                    type="date"
                    value={form.due_date || ''}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-2xl px-4 py-3.5
                      text-sm text-neutral-300 focus:outline-none focus:border-[#00f2ff]/40 focus:ring-1 focus:ring-[#00f2ff]/20
                      transition-all cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]
                      [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Error Handling */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-[10px] font-bold text-[#00f2ff] bg-[#00f2ff]/10 border border-[#00f2ff]/20 rounded-xl px-4 py-3 uppercase tracking-widest mt-2">
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          {/* Footer com botões — fixo na base, nunca escondido pelo teclado */}
          <div className="px-7 pt-3 pb-7 sm:pb-8 flex gap-3 border-t border-white/[0.04]">
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
              form="add-task-form"
              whileTap={{ scale: 0.97 }}
              disabled={loading || !form.title.trim()}
              className="w-2/3 py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest
                bg-white text-black
                disabled:opacity-20 disabled:cursor-not-allowed
                flex items-center justify-center gap-2 transition-all duration-300"
              style={{
                boxShadow: isCriticalImpact
                  ? '0 0 28px rgba(0,242,255,0.60), 0 0 10px rgba(0,242,255,0.35)'
                  : '0 0 20px rgba(255,255,255,0.10)',
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sincronizar'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}