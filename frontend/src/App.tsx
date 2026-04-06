import { motion } from 'framer-motion';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    // Pilar 2: Profundidade (Fundo escuro com gradiente radial puxando o foco para o centro)
    <div className="w-full min-h-dvh flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1a1a] to-[#030303] p-0 sm:p-4 font-sans text-gray-100 antialiased selection:bg-[#ff2400]/30 overflow-hidden">
      
      {/* Pilar 1 & 5: Física e Percepção de Velocidade (Animação de "Boot" do sistema) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
          mass: 0.5,
          duration: 0.6
        }}
        // Container do Aparelho: Bordas refinadas para simular Titanium e reflexos
        className="w-full sm:w-[430px] h-dvh sm:h-[94vh] sm:max-h-[932px] bg-black sm:rounded-[55px] relative overflow-hidden flex flex-col shadow-[0_0_80px_rgba(0,0,0,1)] ring-0 sm:ring-[12px] ring-neutral-800/80 border-[0.5px] border-white/10"
      >
        {/* Efeito Sutil de Brilho no Vidro Superior (Reflexo da tela) */}
        <div className="hidden sm:block absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none z-40"></div>

        {/* Dynamic Island com "Hardware" Interno Simulado */}
        <div className="hidden sm:flex absolute top-[14px] left-[50%] -translate-x-1/2 w-[124px] h-[36px] bg-black rounded-full z-50 items-center justify-between px-3 shadow-[inset_0_-1px_2px_rgba(255,255,255,0.05),0_5px_15px_rgba(0,0,0,0.5)] border border-white/[0.02]">
           {/* Câmera e FaceID emulados com sub-pixels escuros para dar profundidade OLED */}
           <div className="w-3.5 h-3.5 rounded-full bg-[#0a0a0a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] opacity-80"></div>
           <div className="w-3.5 h-3.5 rounded-full bg-[#0a0a0a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] opacity-80"></div>
        </div>
        
        {/* O Núcleo do Sistema */}
        <Dashboard />

        {/* Pilar 3: Ergonomia e Touch (Home Indicator Interativo) */}
        <motion.div 
          whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.4)" }}
          whileTap={{ scale: 0.95, backgroundColor: "rgba(255,255,255,0.6)" }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[35%] h-1.5 bg-white/20 rounded-full z-50 cursor-pointer backdrop-blur-md"
        />
      </motion.div>
    </div>
  );
}

export default App;