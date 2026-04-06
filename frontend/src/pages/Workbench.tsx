/**
 * pages/Workbench.tsx — Mesa de Trabalho do Colaborador.
 *
 * Regras de UI:
 *   - Exibe APENAS as demandas atribuídas ao usuário logado.
 *   - A única ação disponível é alterar o status (Iniciar / Concluir).
 *   - Não possui botão de "Nova Demanda" nem acesso a configurações de equipe.
 *   - Design focado e limpo — sem distrações, voltado para execução.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox,
  CheckCircle2,
  Clock,
  Play,
  Loader2,
  ServerCrash,
  LogOut,
  User,
} from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../hooks/useAuth';
import type { Task, TaskStatus } from '../types/task';

// ---------------------------------------------------------------------------
// Badge de status com cores semânticas
// ---------------------------------------------------------------------------
const STATUS_CONFIG = {
  backlog: { label: 'Backlog', color: 'text-neutral-500 bg-neutral-500/10 border-neutral-500/20' },
  todo:    { label: 'A Fazer', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
  in_progress: { label: 'Em Progresso', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  done:    { label: 'Concluída', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
} as const;

// Status key type (derived from STATUS_CONFIG, aligned with TaskStatus from types)

// ---------------------------------------------------------------------------
// Componente: Card de Demanda simplificado para o Colaborador
// ---------------------------------------------------------------------------
function WorkbenchTaskCard({
  task,
  onStatusChange,
}: {
  task: Task;
  onStatusChange: (id: number, status: TaskStatus) => void;
}) {
  const [updating, setUpdating] = useState(false);

  const statusCfg = STATUS_CONFIG[(task.status as TaskStatus)] ?? STATUS_CONFIG.backlog;
  const isDone = task.status === 'done';
  const isInProgress = task.status === 'in_progress';

  async function handleAdvanceStatus() {
    const nextStatus: TaskStatus | null =
      task.status === 'todo' ? 'in_progress'
      : task.status === 'in_progress' ? 'done'
      : null;

    if (!nextStatus) return;

    setUpdating(true);
    try {
      await onStatusChange(task.id, nextStatus);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={`w-full p-5 rounded-2xl border flex flex-col gap-3 transition-colors ${
        isDone
          ? 'bg-emerald-950/20 border-emerald-500/15'
          : 'bg-white/[0.02] border-white/[0.05]'
      }`}
    >
      {/* Cabeçalho: categoria e badge de status */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">
          {task.category}
        </span>
        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusCfg.color}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Título */}
      <h3 className={`text-sm font-bold leading-tight ${isDone ? 'line-through text-neutral-500' : 'text-white'}`}>
        {task.title}
      </h3>

      {/* Descrição */}
      {task.description && (
        <p className="text-[11px] text-neutral-500 leading-relaxed line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Prazo */}
      {task.due_date && (
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-600">
          <Clock size={11} />
          <span>Prazo: {new Date(task.due_date).toLocaleDateString('pt-BR')}</span>
        </div>
      )}

      {/* Botão de ação — avança o status */}
      {!isDone && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleAdvanceStatus}
          disabled={updating}
          className={`w-full mt-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${
            isInProgress
              ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30'
              : 'bg-white/[0.05] border border-white/[0.08] text-neutral-300 hover:bg-white/[0.08]'
          }`}
        >
          {updating ? (
            <Loader2 size={13} className="animate-spin" />
          ) : isInProgress ? (
            <><CheckCircle2 size={13} /> Marcar como Concluída</>
          ) : (
            <><Play size={13} /> Iniciar Execução</>
          )}
        </motion.button>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Página principal: Workbench
// ---------------------------------------------------------------------------
export function Workbench() {
  const { user, signOut } = useAuth();
  const { tasks, loading, error, fetchTasks, updateStatus } = useTasks();

  // Contador de demandas pendentes (não concluídas)
  const pendingCount = useMemo(
    () => tasks.filter((t) => t.status !== 'done').length,
    [tasks]
  );
  const doneCount = useMemo(
    () => tasks.filter((t) => t.status === 'done').length,
    [tasks]
  );

  async function handleSignOut() {
    await signOut();
  }

  return (
    <div className="w-full min-h-dvh bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0d0d0d] to-[#030303] flex flex-col font-sans antialiased text-gray-100">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-black/50 backdrop-blur-xl border-b border-white/[0.05] px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-black text-white tracking-tight">
            Mesa de Trabalho
          </h1>
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest">
            {user?.full_name ?? user?.email}
          </p>
        </div>

        {/* Badges de contagem + Logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full border border-blue-400/20">
              {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
              {doneCount} concluída{doneCount !== 1 ? 's' : ''}
            </span>
          </div>
          <motion.button
            id="workbench-signout-btn"
            whileTap={{ scale: 0.9 }}
            onClick={handleSignOut}
            title="Sair do sistema"
            className="p-2 text-neutral-500 hover:text-[#00f2ff] transition-colors"
          >
            <LogOut size={18} strokeWidth={1.5} />
          </motion.button>
        </div>
      </header>

      {/* ── CONTEÚDO PRINCIPAL ──────────────────────────────────────────────── */}
      <main className="flex-1 px-5 py-6 max-w-lg mx-auto w-full">

        {/* Saudação personalizada */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
              <User size={14} className="text-neutral-400" />
            </div>
            <span className="text-[11px] text-neutral-400">Suas demandas ativas</span>
          </div>
          <p className="text-[10px] text-neutral-600 uppercase tracking-widest">
            Você só pode alterar o status das demandas atribuídas a você.
          </p>
        </div>

        {/* Estado: Carregando */}
        {loading && (
          <div className="flex flex-col gap-3 mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full h-32 bg-white/[0.02] border border-white/[0.03] rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Estado: Erro */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 gap-4 bg-[#00f2ff]/10 rounded-[24px] border border-[#00f2ff]/20"
          >
            <ServerCrash size={28} className="text-[#00f2ff]/60" />
            <p className="text-[10px] font-black text-[#00f2ff] uppercase tracking-widest">
              Falha na Conexão
            </p>
            <button
              onClick={fetchTasks}
              className="px-5 py-2 bg-[#00f2ff]/20 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#00f2ff]/30 text-[#00f2ff] hover:bg-[#00f2ff]/30 transition-colors"
            >
              Tentar Novamente
            </button>
          </motion.div>
        )}

        {/* Estado: Sem demandas */}
        {!loading && !error && tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32 text-neutral-700"
          >
            <Inbox size={44} className="mb-4 opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-widest italic opacity-40">
              Nenhuma demanda atribuída
            </p>
            <p className="text-[9px] text-neutral-700 mt-2 text-center max-w-[200px]">
              Aguarde o Líder da equipe atribuir demandas a você.
            </p>
          </motion.div>
        )}

        {/* Lista de demandas */}
        {!loading && !error && tasks.length > 0 && (
          <motion.div layout className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {tasks.map((task: Task) => (
                <WorkbenchTaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={updateStatus}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}
