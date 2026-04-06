import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Brain, X, TrendingUp } from 'lucide-react';

interface PlasticityStat {
  category: string;
  total_xp: number;
  level: number;
  progress: number;
}

interface NeuralPlasticityProps {
  onClose: () => void;
}

export function NeuralPlasticity({ onClose }: NeuralPlasticityProps) {
  const [stats, setStats] = useState<PlasticityStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats/plasticity')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao buscar dados de plasticidade:", err);
        setLoading(false);
      });
  }, []);

  const springTransition = { type: 'spring', stiffness: 400, damping: 30 } as const;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={springTransition}
      className="absolute inset-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-3xl sm:rounded-[55px] flex flex-col p-6 overflow-hidden"
    >
      <div className="flex justify-between items-center z-10 relative mt-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#00f2ff]/10 border border-[#00f2ff]/30 shadow-[0_0_20px_rgba(0,242,255,0.3)]">
            <Brain size={24} className="text-[#00f2ff]" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight uppercase">Plasticidade Neural</h2>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
              <TrendingUp size={10} /> Motor Dinâmico de Experiência
            </p>
          </div>
        </div>
        <motion.button 
          whileTap={{ scale: 0.85 }} 
          onClick={onClose} 
          className="w-10 h-10 rounded-full border border-white/[0.05] bg-white/[0.03] flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-all"
        >
          <X size={20} />
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto mt-8 scrollbar-hide flex flex-col gap-8 pb-10">
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-12 h-12 border-2 border-[#00f2ff]/20 border-t-[#00f2ff] rounded-full animate-spin shadow-[0_0_15px_rgba(0,242,255,0.3)]"></div>
          </div>
        ) : (
          <>
            {/* Gráfico Radar de Competências */}
            <div className="w-full h-[280px] bg-white/[0.02] border border-white/[0.05] rounded-[32px] p-4 relative flex flex-col items-center justify-center">
              <div className="absolute top-4 left-6 text-[10px] font-black text-white/40 uppercase tracking-widest">
                Matriz de Habilidades
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={stats}>
                  <PolarGrid stroke="rgba(255,255,255,0.05)" />
                  <PolarAngleAxis 
                    dataKey="category" 
                    tick={{ fill: '#888', fontSize: 10, fontWeight: 800 }} 
                  />
                  <Radar
                    name="Level"
                    dataKey="level"
                    stroke="#00f2ff"
                    strokeWidth={2}
                    fill="#00f2ff"
                    fillOpacity={0.2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Painel de Barras de Progresso */}
            <div className="flex flex-col gap-4">
              <h3 className="text-[10px] text-neutral-500 font-black uppercase tracking-widest px-2 relative z-10">
                Progresso Constante
              </h3>
              
              {stats.map((stat, i) => (
                <motion.div 
                  key={stat.category}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, ...springTransition }}
                  className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-4 flex flex-col gap-3 relative overflow-hidden"
                >
                  {/* Fundo iluminado sutil */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f2ff]/[0.02] blur-3xl rounded-full" />
                  
                  <div className="flex justify-between items-end relative z-10">
                    <div>
                      <div className="text-[11px] font-black text-white uppercase tracking-widest mb-1">{stat.category}</div>
                      <div className="text-[10px] font-bold text-neutral-500 tracking-wider">Level {stat.level}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-white italic tracking-tighter">
                        {Math.floor(stat.total_xp)} <span className="text-[12px] text-[#00f2ff] font-bold not-italic">XP</span>
                      </div>
                      <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">Global</div>
                    </div>
                  </div>

                  {/* Barra de Progresso do Level Atual */}
                  <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden relative z-10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(stat.progress / 50) * 100}%` }}
                      transition={{ duration: 1, delay: 0.3 + (i * 0.1), ease: "easeOut" }}
                      className="h-full bg-[#ff2400] shadow-[0_0_10px_rgba(255,36,0,0.8)]"
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-neutral-600 relative z-10 mt-[-4px]">
                    <span>{(stat.progress / 50 * 100).toFixed(0)}% Lvl Atual</span>
                    <span>50 XP p/ Prox</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
