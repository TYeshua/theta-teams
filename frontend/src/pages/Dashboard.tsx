import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ServerCrash, Inbox, Menu, Plus, LayoutGrid, Clock, X, Users } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/Header';
import { TaskCard } from '../components/TaskCard';
import { AddTaskModal } from '../components/AddTaskModal';
import { CalibrateModal } from '../components/CalibrateModal';
import { ControlCenter } from '../components/ControlCenter';
import { NeuralPlasticity } from '../components/NeuralPlasticity';
import { CalendarBuffer } from '../components/CalendarBuffer';
import { NeuralBandwidth } from '../components/NeuralBandwidth';
import type { Task, ContextMode } from '../types/task';
import { SCORE_THRESHOLDS } from '../types/task';

type ThetaContext = 'Foco Matinal' | 'Intervalo Rápido' | 'Pesquisa/Noite';

export function Dashboard() {
  // Contexto de autenticação: expõe role e ações de auth
  const { isLeader, signOut } = useAuth();

  const [thetaContext, setThetaContext] = useState<ThetaContext>('Foco Matinal');
  
  const contextMap: Record<ThetaContext, ContextMode> = {
    'Foco Matinal': 'aula',
    'Intervalo Rápido': 'intervalo',
    'Pesquisa/Noite': 'livre'
  };

  const { tasks, loading, error, fetchTasks, addTask, calibrateTask, deleteTask, updateStatus, purgeDoneTasks, factoryResetTasks } = useTasks(contextMap[thetaContext]);
  
  // Estados da UI
  const [showAdd, setShowAdd] = useState(false);
  const [calibrating, setCalibrating] = useState<Task | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [inboxView, setInboxView] = useState<'calendar' | 'list'>('calendar');
  const [calendarRefreshing, setCalendarRefreshing] = useState(false);
  const [showPlasticity, setShowPlasticity] = useState(false);
  // Chave para forçar re-fetch do NeuralBandwidth após adicionar tasks
  const [bandwidthKey, setBandwidthKey] = useState(0);

  // Calcula carga atual local (soma effort das tasks ativas) para uso no AddTaskModal
  const currentLoad = useMemo(
    () => tasks.filter(t => t.status === 'todo' || t.status === 'in_progress')
               .reduce((acc, t) => acc + (t.effort ?? 0), 0),
    [tasks]
  );

  const criticalCount = useMemo(() => tasks.filter(t => t.priority_score >= SCORE_THRESHOLDS.CRITICAL).length, [tasks]);

  const springTransition = { type: "spring", stiffness: 400, damping: 30 } as const;

  return (
    <div className="flex flex-col h-full w-full relative bg-[#050505] overflow-hidden">
      
      <Header 
        activeContext={thetaContext} 
        onContextChange={setThetaContext} 
        onRefresh={fetchTasks} 
        onAdd={() => setShowAdd(true)}
        onPlasticityOpen={() => setShowPlasticity(true)}
        isLoading={loading}
      />

      <main 
        className="flex-1 overflow-y-auto px-5 pt-6 pb-[120px] scroll-smooth"
        style={{ 
          maskImage: 'linear-gradient(to bottom, transparent 2%, black 10%, black 90%, transparent 100%)', 
          WebkitMaskImage: '-webkit-linear-gradient(top, transparent 2%, black 10%, black 90%, transparent 100%)' 
        }}
      >
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><LayoutGrid size={12} strokeWidth={2} /> {tasks.length} Módulos</span>
            <span className="flex items-center gap-1.5"><Clock size={12} strokeWidth={2} /> {criticalCount} Alertas</span>
          </div>
          {criticalCount > 0 && (
             <motion.div 
               animate={{ opacity: [1, 0.4, 1] }}
               transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
               className="px-2.5 py-1 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] text-[9px] font-black tracking-wider shadow-[0_0_10px_rgba(0,242,255,0.2)]"
             >
               SISTEMA CRÍTICO
             </motion.div>
          )}
        </div>

        {loading && (
          <div className="flex flex-col gap-4 mt-4">
            {[1, 2, 3].map((i) => (
               <div key={i} className="w-full h-24 bg-white/[0.02] border border-white/[0.03] rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {error && !loading && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 gap-4 bg-[#00f2ff]/10 rounded-[32px] border border-[#00f2ff]/20 mt-4 shadow-[inset_0_0_40px_rgba(0,242,255,0.1)]">
            <ServerCrash size={32} className="text-[#00f2ff]/60" />
            <p className="text-[10px] font-black text-[#00f2ff] uppercase tracking-widest">Falha na Transmissão</p>
            <button 
              onClick={fetchTasks} 
              className="px-6 py-2 bg-[#00f2ff]/20 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#00f2ff]/30 text-[#00f2ff] hover:bg-[#00f2ff]/30 transition-colors active:scale-95"
            >
              Ressincronizar
            </button>
          </motion.div>
        )}

        {!loading && !error && tasks.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 text-neutral-700">
            <Inbox size={48} className="mb-4 opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-widest italic opacity-40">Nenhuma Tarefa no Buffer</p>
          </motion.div>
        )}

        {!loading && !error && tasks.length > 0 && (
          <motion.div layout className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onCalibrate={setCalibrating}
                  onDelete={deleteTask}
                  onStatusChange={(id, status) => updateStatus(id, status)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* NAVBAR INFERIOR */}
      <nav className="absolute bottom-0 w-full z-40 h-[90px] sm:rounded-b-[55px] bg-[#0A0A0A]/80 backdrop-blur-2xl border-t border-white/[0.04] px-10 flex justify-between items-center pb-6 sm:pb-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        
        {/* Botão MENU (Esquerda) */}
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={() => setShowMenu(true)}
          className="text-neutral-500 hover:text-white transition-colors p-2"
        >
          <Menu size={22} strokeWidth={1.5} />
        </motion.button>
        
        {/*
          FAB (Centro) — RBAC: apenas o Líder pode criar novas demandas.
          O botão FAB e o modal AddTask ficam ocultos para Colaboradores.
          Colaboradores veem um ícone de equipe desabilitado no lugar.
        */}
        <div className="relative -top-7">
          {isLeader() ? (
            <motion.button
              id="dashboard-new-task-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              transition={springTransition}
              onClick={() => setShowAdd(true)}
              title="Nova Demanda (somente Líder)"
              className="w-[60px] h-[60px] bg-[#00f2ff] text-[#0A0A0A] rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,242,255,0.4)] ring-4 ring-[#050505] border border-white/20"
            >
              <Plus size={28} strokeWidth={2.5} />
            </motion.button>
          ) : (
            /* Colaborador: exibe ícone de equipe desabilitado */
            <div
              title="Criação de demandas restrita ao Líder"
              className="w-[60px] h-[60px] bg-neutral-800/60 text-neutral-600 rounded-full flex items-center justify-center ring-4 ring-[#050505] border border-white/[0.05] cursor-not-allowed"
            >
              <Users size={24} strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Botão INBOX (Direita) */}
        <motion.button 
          id="dashboard-inbox-btn"
          whileTap={{ scale: 0.85 }} 
          onClick={async () => {
            setShowInbox(true);
            setCalendarRefreshing(true);
            await fetchTasks();
            setCalendarRefreshing(false);
          }}
          className="text-neutral-500 hover:text-white transition-colors p-2"
        >
          <Inbox size={22} strokeWidth={1.5} />
        </motion.button>
      </nav>

      {/* --- PAINEIS LATERAIS E MODAIS --- */}
      <AnimatePresence>
        
        {/* PAINEL DE MENU (Control Center) — RBAC: isLeader/onSignOut escondem ações de Líder */}
        {showMenu && (
          <ControlCenter 
            tasks={tasks} 
            onClose={() => setShowMenu(false)} 
            onPurgeDone={purgeDoneTasks} 
            onFactoryReset={factoryResetTasks} 
            onForceSync={fetchTasks}
            isLeader={isLeader()}
            onSignOut={signOut}
          />
        )}

        {/* PAINEL DE INBOX (Global Buffer) */}
        {showInbox && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={springTransition}
            className="absolute inset-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-3xl sm:rounded-[55px] flex flex-col"
          >
            <div className="pt-16 px-6 pb-6 border-b border-white/[0.05] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Inbox size={20} className="text-white" />
                <h2 className="text-xl font-black text-white tracking-tight uppercase">Buffer Global</h2>
              </div>
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowInbox(false)} className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center text-neutral-400">
                <X size={16} />
              </motion.button>
            </div>
            
            <div className="flex-1 overflow-hidden px-5 pt-6 pb-10 flex flex-col gap-3">
              {/* Neural Bandwidth — topo do Inbox */}
              <NeuralBandwidth refreshKey={bandwidthKey} />

              <div className="flex justify-between items-center px-1 mb-2">
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                  Todas as Demandas Registradas
                </div>
                <div className="flex gap-1 bg-white/[0.05] p-1 rounded-lg">
                  <button
                    onClick={() => setInboxView('calendar')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-colors ${
                      inboxView === 'calendar' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'
                    }`}
                  >
                    Calendário
                  </button>
                  <button
                    onClick={() => setInboxView('list')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-colors ${
                      inboxView === 'list' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'
                    }`}
                  >
                    Lista
                  </button>
                </div>
              </div>

              {inboxView === 'calendar' ? (
                <CalendarBuffer
                  tasks={tasks}
                  onStatusChange={(id, status) => updateStatus(id, status)}
                  onRefresh={async () => {
                    setCalendarRefreshing(true);
                    await fetchTasks();
                    setCalendarRefreshing(false);
                  }}
                  isRefreshing={calendarRefreshing}
                />
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-8">
                  <AnimatePresence>
                    {tasks.map((task) => (
                      <TaskCard
                        key={`inbox-${task.id}`}
                        task={task}
                        onCalibrate={setCalibrating}
                        onDelete={deleteTask}
                        onStatusChange={(id, status) => updateStatus(id, status)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Modais Antigos */}
        {showAdd && (
          <AddTaskModal
            onClose={() => setShowAdd(false)}
            onAdd={async (data) => {
              const result = await addTask(data);
              setBandwidthKey(k => k + 1);
              return result;
            }}
            currentLoad={currentLoad}
          />
        )}
        {calibrating && <CalibrateModal task={calibrating} onClose={() => setCalibrating(null)} onCalibrate={calibrateTask} />}
      
        {/* Modal de Plasticidade Neural */}
        {showPlasticity && <NeuralPlasticity onClose={() => setShowPlasticity(false)} />}
      </AnimatePresence>
    </div>
  );
}