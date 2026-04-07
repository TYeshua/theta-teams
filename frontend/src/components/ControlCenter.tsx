import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Activity, Database, Trash2, Power, RefreshCw, AlertTriangle, LogOut, Users } from 'lucide-react';
import type { Task } from '../types/task';

interface ControlCenterProps {
  tasks: Task[];
  onClose: () => void;
  onPurgeDone: () => Promise<void>;
  onFactoryReset: () => Promise<void>;
  onForceSync: () => Promise<void>;
  // RBAC: props opcionais para controle por cargo
  isLeader?: boolean;
  onSignOut?: () => Promise<void>;
  teamId?: string | null;
}

export function ControlCenter({ tasks, onClose, onPurgeDone, onFactoryReset, onForceSync, isLeader = true, onSignOut, teamId }: ControlCenterProps) {
  const [isPurging, setIsPurging] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);

  // Telemetry Memoization
  const { total, done, backlog, active, avgLoad, criticalCount } = useMemo(() => {
    let activeScoreSum = 0;
    let critical = 0;
    
    const stats = {
      total: tasks.length,
      done: 0,
      backlog: 0,
      active: 0,
      avgLoad: 0,
      criticalCount: 0
    };

    tasks.forEach(t => {
      if (t.status === 'done') stats.done++;
      else if (t.status === 'backlog') stats.backlog++;
      else {
        stats.active++;
        activeScoreSum += t.priority_score;
      }
      
      if (t.priority_score >= 2.5) critical++;
    });

    stats.avgLoad = stats.active > 0 ? Number((activeScoreSum / stats.active).toFixed(2)) : 0;
    stats.criticalCount = critical;

    return stats;
  }, [tasks]);

  const springTransition = { type: "spring", stiffness: 400, damping: 30 } as const;

  const handlePurge = async () => {
    if (window.confirm("Limpar todos os módulos concluídos? Isso não pode ser desfeito.")) {
      setIsPurging(true);
      await onPurgeDone();
      setIsPurging(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm("RESTAURAÇÃO DE FÁBRICA: Tem certeza absoluta que deseja apagar todas as tarefas? Isso é irreversível.")) {
      setIsResetting(true);
      await onFactoryReset();
      setIsResetting(false);
      onClose(); // Automatically close since everything is gone
    }
  };


  const handleGenerateInvite = async () => {
    if (!teamId) return;
    
    setIsGeneratingInvite(true);
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

      await (await import('../lib/supabase')).supabase.auth.getSession();
      const { error } = await (await import('../lib/supabase')).supabase
        .from('team_invites')
        .insert({
          team_id: teamId,
          token: token,
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      const inviteUrl = `${window.location.origin}/signup?invite=${token}`;
      await navigator.clipboard.writeText(inviteUrl);
      
      setInviteFeedback("Link de convite copiado!");
      setTimeout(() => setInviteFeedback(null), 4000);
    } catch (err: any) {
      console.error("Erro ao gerar convite:", err);
      alert("Falha ao gerar link de convite.");
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await onForceSync();
    setIsSyncing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={springTransition}
      className="absolute inset-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-3xl sm:rounded-[55px] flex flex-col"
    >
      <div className="pt-16 px-6 pb-6 border-b border-white/[0.05] flex justify-between items-center">
        <div className="flex items-center gap-2">
           <Activity size={20} className="text-[#00f2ff]" />
           <h2 className="text-xl font-black text-white tracking-tight uppercase">Sistema Theta</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Botão Sair — exibido para todos os usuários */}
          {onSignOut && (
            <motion.button
              id="control-center-signout-btn"
              whileTap={{ scale: 0.85 }}
              onClick={onSignOut}
              title="Sair do sistema"
              className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center text-neutral-500 hover:text-[#00f2ff] transition-colors"
            >
              <LogOut size={14} />
            </motion.button>
          )}
          <motion.button 
             whileTap={{ scale: 0.85 }} 
             onClick={onClose} 
             className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 flex flex-col gap-8">
        
        {/* --- SYSTEM TELEMETRY --- */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest px-2">Telemetria Real-Time</span>
          
          <div className="bg-white/[0.02] border border-white/[0.03] p-5 rounded-3xl flex flex-col gap-5">
             
             {/* Stats Row */}
             <div className="flex justify-between items-center text-center">
                <div className="flex flex-col gap-1 items-center">
                   <span className="text-[10px] text-neutral-500 font-bold uppercase">Total</span>
                   <span className="text-2xl font-black text-white">{total}</span>
                </div>
                <div className="flex flex-col gap-1 items-center">
                   <span className="text-[10px] text-neutral-500 font-bold uppercase">Ativos</span>
                   <span className="text-2xl font-black text-white">{active}</span>
                </div>
                <div className="flex flex-col gap-1 items-center">
                   <span className="text-[10px] text-neutral-500 font-bold uppercase">Concluídos</span>
                   <span className="text-2xl font-black text-neutral-400">{done}</span>
                </div>
             </div>

             {/* Progress Bar */}
             <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden flex">
                <div style={{ width: `${total ? (done/total)*100 : 0}%` }} className="h-full bg-neutral-600 transition-all duration-1000" />
                <div style={{ width: `${total ? (active/total)*100 : 0}%` }} className="h-full bg-[#00f2ff] transition-all duration-1000" />
                <div style={{ width: `${total ? (backlog/total)*100 : 0}%` }} className="h-full bg-neutral-800 transition-all duration-1000" />
             </div>

             {/* Engine Load */}
             <div className="flex justify-between items-center pt-2 border-t border-white/[0.05]">
                <div className="flex items-center gap-2">
                   <Database size={14} className="text-blue-500" />
                   <span className="text-xs font-bold text-neutral-300">Carga Média Algoritmo</span>
                </div>
                <span className={`font-black tracking-wider ${avgLoad > 2.0 ? 'text-[#00f2ff]' : 'text-white'}`}>
                   {avgLoad} pts
                </span>
             </div>

             {criticalCount > 0 && (
                 <div className="flex items-center gap-2 bg-[#00f2ff]/20 text-[#00f2ff] p-3 rounded-xl border border-[#00f2ff]/30">
                     <AlertTriangle size={16} />
                     <span className="text-xs font-bold uppercase tracking-wider">{criticalCount} Módulos em Alerta Crítico</span>
                 </div>
             )}
          </div>
        </div>

        {/* --- OPERATION CONTROLS --- */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest px-2">Operações do Sistema</span>
          
          <div className="flex flex-col gap-2">
            <button 
               onClick={handleSync}
               disabled={isSyncing}
               className="flex justify-between items-center bg-white/[0.02] border border-white/[0.03] p-4 rounded-2xl hover:bg-white/[0.05] transition-colors active:scale-95"
            >
              <div className="flex items-center gap-4">
                <RefreshCw size={20} className={`text-neutral-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <div className="text-left">
                  <div className="text-sm font-bold text-white uppercase tracking-wider">Forçar Sincronização</div>
                  <div className="text-[10px] text-neutral-500 font-medium">Recalcula todos os scores contextuais</div>
                </div>
              </div>
            </button>

            <button 
               onClick={handlePurge}
               disabled={isPurging || done === 0}
               className={`flex justify-between items-center border p-4 rounded-2xl transition-colors active:scale-[0.98] ${done === 0 ? 'opacity-50 grayscale cursor-not-allowed border-white/[0.03] bg-white/[0.02]' : 'bg-neutral-900 border-neutral-700 hover:bg-neutral-800'}`}
            >
              <div className="flex items-center gap-4">
                <Trash2 size={20} className={done > 0 ? "text-blue-500" : "text-neutral-500"} />
                <div className="text-left">
                  <div className="text-sm font-bold text-white uppercase tracking-wider">Limpar Concluídos</div>
                  <div className="text-[10px] text-neutral-500 font-medium">Remove todos os módulos marcados como 'Concluído'</div>
                </div>
              </div>
              <span className="text-xs font-bold text-neutral-500">{done} itens</span>
            </button>
          </div>
        </div>

        {/* --- DANGER ZONE — apenas para Líder --- */}
        {isLeader && (
          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-[#00f2ff]/50 font-bold uppercase tracking-widest px-2">Zona de Perigo</span>
            
            <button 
               onClick={handleReset}
               disabled={isResetting || total === 0}
               className="flex justify-between items-center bg-[#00f2ff]/10 border border-[#00f2ff]/20 p-4 rounded-2xl hover:bg-[#00f2ff]/20 transition-colors active:scale-95"
            >
              <div className="flex items-center gap-4">
                <Power size={20} className="text-[#00f2ff]" />
                <div className="text-left">
                  <div className="text-sm font-bold text-[#00f2ff] uppercase tracking-wider">Restauração de Fábrica</div>
                  <div className="text-[10px] text-[#00f2ff]/60 font-medium">Limpar todo o buffer e inicializar do zero</div>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Gerenciar Equipe — apenas para Líder */}
        {isLeader && (
          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest px-2">Gestão de Equipe</span>
            <div className="flex flex-col gap-2 bg-white/[0.02] border border-white/[0.03] p-4 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Users size={18} className="text-neutral-400" />
                <div>
                  <div className="text-sm font-bold text-white uppercase tracking-wider">Membros do Time</div>
                  <div className="text-[10px] text-neutral-500 font-medium">Convide colaboradores para sua equipe</div>
                </div>
              </div>
              
              <button 
                onClick={handleGenerateInvite}
                disabled={isGeneratingInvite || !teamId}
                className="w-full py-3 bg-[#00f2ff]/10 border border-[#00f2ff]/20 rounded-xl text-[#00f2ff] text-[10px] font-black uppercase tracking-widest hover:bg-[#00f2ff]/20 transition-all flex items-center justify-center gap-2 group"
              >
                {isGeneratingInvite ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Users size={14} className="group-hover:scale-110 transition-transform" />
                )}
                {isGeneratingInvite ? "Gerando..." : "Adicionar Integrante"}
              </button>

              {inviteFeedback && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-[9px] text-center font-bold text-[#00f2ff] uppercase tracking-wider"
                >
                  {inviteFeedback}
                </motion.div>
              )}
            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
}
