"use client"

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { usePreferences } from '@/hooks/usePreferences';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useChat } from '@/hooks/useChat';

import { Header } from '@/components/layout/Header';
import { SettingsPanel } from '@/components/layout/SettingsPanel';
import { HistoryPanel } from '@/components/layout/HistoryPanel';
import { PomodoroTimer } from '@/components/features/PomodoroTimer';
import { ChatContainer } from '@/components/chat/ChatContainer';

export default function CogniCareApp() {
  // Initialize effects for Cosmos DB sync and timers
  usePreferences();
  usePomodoro();
  useChat();

  const preferences = useAppStore(state => state.preferences);
  const explanationOpen = useAppStore(state => state.explanationOpen);
  const setExplanationOpen = useAppStore(state => state.setExplanationOpen);
  const activeExplanation = useAppStore(state => state.activeExplanation);

  return (
    <main className={cn(
      "min-h-screen relative flex flex-col items-center p-4 md:p-8 transition-all duration-700 overflow-hidden",
      preferences.highContrast ? "bg-zinc-950 text-zinc-200 transition-none" : "sky-bg"
    )}>
      {!preferences.highContrast && (
        <div className="fixed inset-0 pointer-events-none -z-10 bg-[#A5D8FF]/20">
          <div className="cloud w-64 h-24 top-[10%] left-[5%] animate-float" />
          <div className="cloud w-96 h-32 top-[40%] right-[10%] animate-float" style={{ animationDelay: '-5s' }} />
          <div className="cloud w-80 h-28 bottom-[20%] left-[15%] animate-float" style={{ animationDelay: '-12s' }} />
        </div>
      )}

      <Header />
      <ChatContainer />
      <PomodoroTimer />
      <SettingsPanel />
      <HistoryPanel />

      <AnimatePresence>
        {explanationOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setExplanationOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={cn(
                "w-full max-w-lg p-8 rounded-[2.5rem] border-2 calm-shadow",
                preferences.highContrast 
                  ? "bg-zinc-950 border-slate-800 text-zinc-200" 
                  : "bg-white border-blue-100"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-3 rounded-2xl",
                    preferences.highContrast ? "bg-slate-900/90" : "bg-blue-50"
                  )}>
                    <Brain className={cn("w-6 h-6", preferences.highContrast ? "text-zinc-200" : "text-blue-500")} />
                  </div>
                  <h3 className="text-xl font-black">Por qué esta respuesta</h3>
                </div>
                <button
                  onClick={() => setExplanationOpen(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6 opacity-60" />
                </button>
              </div>

              <div className={cn(
                "text-lg leading-relaxed space-y-4",
                preferences.highContrast ? "text-zinc-200" : "text-gray-700"
              )}>
                <ReactMarkdown>
                  {activeExplanation || "Sin explicación disponible."}
                </ReactMarkdown>
              </div>

              <button
                onClick={() => setExplanationOpen(false)}
                className={cn(
                  "w-full mt-8 py-4 rounded-2xl font-black transition-all interactive-element calm-shadow",
                  preferences.highContrast 
                    ? "bg-slate-900 text-zinc-200" 
                    : "bg-primary text-white"
                )}
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
