import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Activity, BookOpen, Brain, Briefcase, FileText } from 'lucide-react';
import type { Task } from '../types/task';
import { getPriorityLevel } from '../types/task';
import { generateCalendarGrid, MONTH_NAMES } from '../utils/calendar';
import { TaskDetailModal } from './TaskDetailModal';

interface CalendarBufferProps {
  tasks: Task[];
  onStatusChange: (id: number, status: Task['status']) => void;
}

const getCategoryIcon = (category: string) => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('pesquisa') || cat.includes('research')) return <BookOpen size={10} />;
  if (cat.includes('mente') || cat.includes('mental')) return <Brain size={10} />;
  if (cat.includes('projeto') || cat.includes('project')) return <Briefcase size={10} />;
  if (cat.includes('estudo') || cat.includes('aula')) return <FileText size={10} />;
  return <Activity size={10} />;
};

export function CalendarBuffer({ tasks, onStatusChange }: CalendarBufferProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const incompleteTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks]);

  const { scheduledTasks, unscheduledTasks } = useMemo(() => {
    const scheduled: Task[] = [];
    const unscheduled: Task[] = [];
    incompleteTasks.forEach(t => {
      if (t.due_date) scheduled.push(t);
      else unscheduled.push(t);
    });
    return { scheduledTasks: scheduled, unscheduledTasks: unscheduled };
  }, [incompleteTasks]);

  const grid = useMemo(() => generateCalendarGrid(currentYear, currentMonth), [currentYear, currentMonth]);

  const tasksMapByDateStr = useMemo(() => {
    const map = new Map<string, Task[]>();
    scheduledTasks.forEach(t => {
      if (!t.due_date) return;
      const datePart = t.due_date.split('T')[0]; // Extract YYYY-MM-DD
      const existing = map.get(datePart) || [];
      map.set(datePart, [...existing, t]);
    });
    return map;
  }, [scheduledTasks]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const renderTaskChip = (task: Task) => {
    const priority = getPriorityLevel(task);
    const colors = {
      critical: 'bg-[#ff2400]/20 text-[#ff2400] border-[#ff2400]/40',
      high: 'bg-orange-500/20 text-orange-500 border-orange-500/40',
      medium: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/40',
      low: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40',
      uncalibrated: 'bg-white/10 text-neutral-300 border-white/20',
    };

    return (
      <motion.button
        key={task.id}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setSelectedTask(task)}
        className={`w-full text-left px-1.5 py-1 rounded-md border text-[9px] font-bold tracking-wider flex items-center gap-1 mb-1 truncate ${colors[priority]}`}
      >
        {getCategoryIcon(task.category)}
        <span className="truncate">{task.title}</span>
      </motion.button>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-white font-black text-lg tracking-tight uppercase">
          {MONTH_NAMES[currentMonth]} <span className="text-neutral-600">{currentYear}</span>
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="p-1.5 rounded-full bg-white/[0.05] text-neutral-400 hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={handleNextMonth} className="p-1.5 rounded-full bg-white/[0.05] text-neutral-400 hover:text-white transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-6">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-[10px] text-center font-bold text-neutral-500 uppercase tracking-widest py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 auto-rows-fr">
          {grid.map((cell, idx) => {
            const tasksToday = cell.dateStr ? tasksMapByDateStr.get(cell.dateStr) || [] : [];
            const isToday = cell.dateStr === today.toISOString().split('T')[0];

            return (
              <div 
                key={idx} 
                className={`min-h-[80px] p-1.5 rounded-xl border ${
                  cell.day 
                    ? isToday 
                        ? 'bg-neutral-900 border-neutral-700' 
                        : 'bg-white/[0.02] border-white/[0.05]' 
                    : 'bg-transparent border-transparent'
                }`}
              >
                {cell.day && (
                  <div className={`text-[10px] font-black mb-1.5 ${isToday ? 'text-white' : 'text-neutral-500'}`}>
                    {cell.day}
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  {tasksToday.map(renderTaskChip)}
                </div>
              </div>
            );
          })}
        </div>

        {unscheduledTasks.length > 0 && (
          <div className="mt-8 mb-4">
            <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 px-1">
              Demandas Sem Data (Backlog)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {unscheduledTasks.map(renderTaskChip)}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal 
            task={selectedTask} 
            onClose={() => setSelectedTask(null)} 
            onStatusChange={onStatusChange} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
