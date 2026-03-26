import React from 'react';
import { motion } from 'framer-motion';
import { useSession, signOut } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { Brain, Key, X, Timer, History, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

export function Header() {
  const router = useRouter();
  const { status } = useSession();

  const preferences = useAppStore(state => state.preferences);
  const focusMode = useAppStore(state => state.focusMode);
  const setFocusMode = useAppStore(state => state.setFocusMode);
  const setSettingsOpen = useAppStore(state => state.setSettingsOpen);
  const setHistoryOpen = useAppStore(state => state.setHistoryOpen);
  const setExpandedQueryIdx = useAppStore(state => state.setExpandedQueryIdx);

  const onOpenHistory = () => {
    setHistoryOpen(true);
    setExpandedQueryIdx(null);
  };

  if (focusMode) return null;

  return (
    <motion.header 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        "w-full max-w-5xl flex justify-between items-center mb-6 p-4 rounded-[2.5rem] border calm-shadow z-50 relative transition-colors duration-500",
        preferences.highContrast 
          ? "bg-black border-white border-2 shadow-none text-white" 
          : "bg-white/40 backdrop-blur-md border-white/50"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center calm-shadow border-2",
          preferences.highContrast ? "bg-zinc-950 border-slate-800 text-zinc-200" : "bg-primary/10 border-transparent text-primary"
        )}>
          <Brain className="w-9 h-9" />
        </div>
        <div>
          <h1 className={cn("text-2xl font-black", preferences.highContrast ? "text-zinc-200" : "text-[#2C3E50]")}>CogniCare</h1>
          <p className={cn("text-xs font-bold uppercase tracking-tighter", preferences.highContrast ? "text-indigo-300" : "text-primary")}>Tu asistente de calma</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:block mr-2">
          <button 
            onClick={() => status === 'authenticated' ? signOut() : router.push('/auth/signin')}
            className={cn(
              "px-5 py-3 rounded-2xl flex items-center gap-3 font-bold transition-all interactive-element calm-shadow",
              status === 'authenticated' 
                ? (preferences.highContrast ? "bg-zinc-950 border border-slate-800 text-zinc-400 hover:bg-[#1A1A2E]" : "bg-red-50 border-red-100 text-red-600 hover:bg-red-100")
                : (preferences.highContrast ? "bg-slate-900 border-slate-800 text-zinc-200" : "bg-blue-600 text-white")
            )}
          >
            {status === 'authenticated' ? (
              <>
                <X className="w-5 h-5" />
                <span>Cerrar sesión</span>
              </>
            ) : (
              <>
                <Key className="w-5 h-5 text-white" />
                <span>Conectar</span>
              </>
            )}
          </button>
        </div>

        <button 
          onClick={() => setFocusMode(true)}
          className={cn(
            "px-6 py-3 rounded-2xl flex items-center gap-2 interactive-element font-bold calm-shadow transition-colors",
            preferences.highContrast ? "bg-slate-900 border-slate-800 text-zinc-200" : "bg-[#26C782] text-white"
          )}
        >
          <Timer className="w-5 h-5" />
          <span>Pausa activa</span>
        </button>
        
        <button 
          onClick={onOpenHistory}
          title="Historial de Consultas"
          className={cn(
            "px-5 py-3 rounded-2xl border-2 flex items-center gap-2 font-bold transition-all interactive-element calm-shadow",
            preferences.highContrast ? "bg-zinc-950 border-slate-800 text-zinc-200" : "bg-white border-white text-[#2C3E50] hover:bg-gray-100"
          )}
        >
          <History className="w-5 h-5" />
          <span className="hidden md:inline">Historial</span>
        </button>
        
        <button 
          onClick={() => setSettingsOpen(true)}
          className={cn(
            "p-3 rounded-2xl border-2 transition-all interactive-element calm-shadow",
            preferences.highContrast ? "bg-zinc-950 border-slate-800 text-zinc-200" : "bg-white border-white text-[#2C3E50] hover:bg-gray-100"
          )}
        >
          <Settings className={cn("w-6 h-6", preferences.highContrast ? "text-zinc-200" : "text-primary")} />
        </button>
      </div>
    </motion.header>
  );
}
