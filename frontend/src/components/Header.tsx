import { RotateCw, Plus, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

// O Header agora gerencia os contextos exclusivos do THETA
type ThetaContext = 'Foco Matinal' | 'Intervalo Rápido' | 'Pesquisa/Noite';

interface ThetaHeaderProps {
  activeContext: ThetaContext;
  onContextChange: (ctx: ThetaContext) => void;
  onRefresh: () => void;
  onAdd: () => void;
  onPlasticityOpen: () => void;
  isLoading?: boolean;
}

export function Header({ activeContext, onContextChange, onRefresh, onAdd, onPlasticityOpen, isLoading }: ThetaHeaderProps) {
  // Configuração da Física de Mola Premium
  const springTransition = { type: "spring", stiffness: 400, damping: 30 } as const;

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0A0A0A]/70 backdrop-blur-2xl border-b border-white/[0.04] pt-14 pb-4 px-6 sm:pt-16 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      <div className="flex flex-col items-center">
        {/* Branding de Luxo THETA - Centralizado */}
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-black tracking-tighter text-white flex items-baseline justify-center gap-2 italic">
            <span className="text-[#ff2400] drop-shadow-[0_0_15px_rgba(255,36,0,0.5)]">Θ</span> THETA
          </h1>
          <p className="text-[9px] text-neutral-500 font-bold tracking-[0.25em] uppercase mt-0.5">
            Time & Habits Execution Tracking Algorithm
          </p>
        </div>
        
        {/* Ações do Header - Agora abaixo do texto e centralizadas */}
        <div className="flex items-center justify-center gap-3 mt-4">
          {/* Botão de Plasticidade Neural (Coroa) */}
          <motion.button 
            whileTap={{ scale: 0.85 }}
            transition={springTransition}
            onClick={onPlasticityOpen} 
            className="w-10 h-10 rounded-full bg-[#ff2400]/10 border border-[#ff2400]/20 flex items-center justify-center text-[#ff2400] shadow-[0_0_15px_rgba(255,36,0,0.2)]"
          >
            <Crown size={18} strokeWidth={2.5} />
          </motion.button>

          {/* Botão de Adicionar (Novo) */}
          <motion.button 
            whileTap={{ scale: 0.85 }}
            transition={springTransition}
            onClick={onAdd} 
            className="w-10 h-10 rounded-full bg-[#ff2400]/10 border border-[#ff2400]/20 flex items-center justify-center text-[#ff2400] shadow-[0_0_15px_rgba(255,36,0,0.2)]"
          >
            <Plus size={18} strokeWidth={2.5} />
          </motion.button>

          {/* Botão de Sincronização Físico */}
          <motion.button 
            whileTap={{ scale: 0.85 }}
            transition={springTransition}
            onClick={onRefresh} 
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-500
              ${isLoading 
                ? 'bg-[#ff2400]/20 border-[#ff2400]/40 text-white shadow-[0_0_20px_rgba(255,36,0,0.4)]' 
                : 'bg-white/[0.03] border-white/[0.05] text-[#ff2400] hover:bg-[#ff2400]/5 hover:border-[#ff2400]/20'}`}
          >
            <motion.div
              animate={isLoading ? { rotate: 360, scale: [1, 1.2, 1] } : {}}
              transition={isLoading ? { duration: 1.5, repeat: Infinity, ease: "linear" } : {}}
            >
              <RotateCw size={18} strokeWidth={2} />
            </motion.div>
          </motion.button>
        </div>
      </div>

      {/* Cápsula de Contexto (Segmented Control iOS) */}
      <div className="mt-6 flex items-center gap-2 overflow-x-auto scrollbar-hide p-1 relative">
        {(['Foco Matinal', 'Intervalo Rápido', 'Pesquisa/Noite'] as ThetaContext[]).map(ctx => {
          const isActive = activeContext === ctx;
          return (
            <motion.button
              key={ctx}
              onClick={() => onContextChange(ctx)}
              className="relative px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest min-w-max outline-none"
            >
              {/* Pílula de fundo deslizante (Magia do Framer Motion) */}
              {isActive && (
                <motion.div
                  layoutId="active-pill-header"
                  transition={springTransition}
                  className="absolute inset-0 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                />
              )}
              <span className={`relative z-10 transition-colors duration-300 ${isActive ? 'text-black' : 'text-neutral-500 hover:text-neutral-300'}`}>
                {ctx}
              </span>
            </motion.button>
          );
        })}
      </div>
    </header>
  );
}