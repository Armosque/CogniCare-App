import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { usePomodoro } from '@/hooks/usePomodoro';

export function PomodoroTimer() {
  const preferences = useAppStore(state => state.preferences);
  const focusMode = useAppStore(state => state.focusMode);
  const setFocusMode = useAppStore(state => state.setFocusMode);
  const timerActive = useAppStore(state => state.timerActive);
  const setTimerActive = useAppStore(state => state.setTimerActive);
  const timeLeft = useAppStore(state => state.timeLeft);

  const { startFocus, formatTime } = usePomodoro();

  return (
    <AnimatePresence>
      {focusMode && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center p-8 text-center"
        >
          <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-30">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#E3F2FD] via-[#FFF3E0] to-[#FFFDE7]" />
          </div>

           <button 
            onClick={() => { setFocusMode(false); setTimerActive(false); }}
            className="absolute top-8 right-8 p-4 bg-white rounded-full calm-shadow interactive-element border border-border"
          >
            <X className="w-8 h-8 opacity-60" />
          </button>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-2xl w-full"
          >
            {!timerActive ? (
              <div className="space-y-10">
                <div className="space-y-4">
                  <div className="p-8 bg-white rounded-[3rem] calm-shadow inline-block border border-blue-100">
                    <Volume2 className="w-16 h-16 text-primary" />
                  </div>
                  <h2 className="text-4xl font-bold text-[#2C3E50]">¿Cuánto tiempo necesitas?</h2>
                  <p className="text-lg text-foreground/50">Selecciona un bloque de tiempo para concentrarte con calma.</p>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {[15, 25, 45].map((mins) => (
                    <button 
                      key={mins}
                      onClick={() => startFocus(mins)}
                      className={cn(
                        "p-8 rounded-[2rem] border-2 transition-all interactive-element group",
                        mins === 15 ? "bg-[#E3F2FD] border-slate-800 hover:border-blue-400" :
                        mins === 25 ? "bg-[#FFF3E0] border-slate-800 hover:border-orange-400" :
                        "bg-[#FFFDE7] border-yellow-200 hover:border-yellow-400"
                      )}
                    >
                      <span className="block text-3xl font-black text-[#2C3E50]">{mins}</span>
                      <span className="text-sm opacity-60 font-bold uppercase tracking-widest">minutos</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                 <div className="space-y-4 flex flex-col items-center">
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.8, 1],
                      opacity: [0.6, 1, 0.6] 
                    }}
                    transition={{ 
                      duration: 8, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                    style={{
                      boxShadow: preferences.highContrast ? '0 0 50px rgba(90,158,255,0.4)' : '0 0 50px rgba(165,216,255,0.8)'
                    }}
                    className={cn(
                      "w-32 h-32 rounded-full blur-[2px]",
                      preferences.highContrast ? "bg-blue-500" : "bg-[#A5D8FF]"
                    )}
                  />
                  <h2 className={cn(
                    "text-5xl font-black tracking-tight pt-8",
                    preferences.highContrast ? "text-zinc-200" : "text-[#2C3E50]"
                  )}>
                    {formatTime(timeLeft)}
                  </h2>
                  <p className={cn(
                    "text-xl tracking-[0.3em] font-medium",
                    preferences.highContrast ? "text-blue-400" : "text-[#2C3E50]/60"
                  )}>INHALA... EXHALA...</p>
                </div>

                <div className="flex gap-6 justify-center">
                   <button 
                    onClick={() => setTimerActive(false)}
                    className="px-12 py-5 bg-[#FFEBEE] text-[#D32F2F] text-xl font-bold rounded-3xl interactive-element border border-red-100"
                  >
                    Pausar
                  </button>
                  <button 
                    onClick={() => { setFocusMode(false); setTimerActive(false); }}
                    className="px-12 py-5 bg-white border border-border text-foreground/40 text-xl font-bold rounded-3xl interactive-element"
                  >
                    Terminar
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
