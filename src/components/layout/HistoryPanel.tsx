import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, X, User, Trash2, Brain, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useChat } from '@/hooks/useChat';
import ReactMarkdown from 'react-markdown';

export function HistoryPanel() {
  const preferences = useAppStore(state => state.preferences);
  const historyOpen = useAppStore(state => state.historyOpen);
  const setHistoryOpen = useAppStore(state => state.setHistoryOpen);
  const savedHistory = useAppStore(state => state.savedHistory);
  const expandedQueryIdx = useAppStore(state => state.expandedQueryIdx);
  const setExpandedQueryIdx = useAppStore(state => state.setExpandedQueryIdx);
  
  const { handleDeleteConversation } = useChat();

  return (
    <AnimatePresence>
      {historyOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setHistoryOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[110]"
          />
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed top-0 left-0 h-full w-full max-w-sm md:max-w-md z-[120] shadow-2xl p-8 overflow-y-auto transition-colors duration-500",
              preferences.highContrast ? "bg-black text-white border-r-2 border-white" : "bg-slate-900 text-white"
            )}
          >
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <History className={cn("w-6 h-6", preferences.highContrast ? "text-zinc-200" : "text-primary")} />
                Tus Consultas
              </h3>
              <button 
                onClick={() => setHistoryOpen(false)}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  preferences.highContrast ? "hover:bg-[#1A1A2E]/80" : "hover:bg-gray-100"
                )}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {savedHistory.filter(m => m.role === 'user').length === 0 ? (
                <p className="text-center opacity-60 italic mt-10">Aún no hay mensajes en tu historial.</p>
              ) : (
                savedHistory.map((msg, index) => {
                  if (msg.role !== 'user') return null;
                  
                  const nextMsg = savedHistory[index + 1];
                  const isExpanded = expandedQueryIdx === index;

                  return (
                    <div key={index} className="flex flex-col gap-2 relative group">
                      <button
                        onClick={() => setExpandedQueryIdx(isExpanded ? null : index)}
                        className={cn(
                          "p-4 rounded-xl text-left border-2 transition-all flex flex-col gap-2 relative overflow-hidden w-full pr-12",
                          preferences.highContrast 
                            ? (isExpanded ? "bg-slate-900/90 border-slate-800 text-zinc-200" : "bg-black border-white/50 text-white hover:border-white")
                            : (isExpanded ? "bg-primary/5 border-primary text-[#2C3E50]" : "bg-white border-border hover:border-primary/30 text-[#2C3E50]")
                        )}
                      >
                        <div className="flex gap-3 items-start w-full">
                          <User className={cn("w-5 h-5 shrink-0 mt-0.5", preferences.highContrast ? "text-zinc-200" : "text-primary")} />
                          <p className="font-medium line-clamp-2 md:line-clamp-none leading-snug w-full text-left">&ldquo;{msg.content}&rdquo;</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(index);
                        }}
                        className={cn(
                          "absolute right-2 top-2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                          preferences.highContrast ? "text-red-400 hover:bg-red-900/50" : "text-red-500 hover:bg-red-50"
                        )}
                        title="Eliminar consulta"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>

                      <AnimatePresence>
                        {isExpanded && nextMsg && nextMsg.role === 'assistant' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className={cn(
                              "p-4 ml-6 mb-2 rounded-xl border calm-shadow whitespace-pre-wrap",
                              preferences.highContrast ? "bg-black border-white/40 text-zinc-200" : "bg-gray-50 border-gray-200 text-[#2C3E50]"
                            )}>
                              <div className="flex gap-2 items-start mb-2">
                                <Brain className={cn("w-4 h-4 shrink-0 mt-0.5", preferences.highContrast ? "text-white/70" : "text-gray-400")} />
                                <span className="text-xs font-bold uppercase tracking-wider opacity-60">Respuesta</span>
                              </div>
                              <div className={cn(
                                "prose prose-sm max-w-none",
                                preferences.highContrast && "prose-invert"
                              )}>
                                <ReactMarkdown>{nextMsg.content}</ReactMarkdown>
                              </div>
                              {nextMsg.type === 'task-list' && nextMsg.steps && (
                                <div className="mt-4 space-y-3">
                                  {nextMsg.steps.map((step, sIdx) => (
                                    <div key={sIdx} className={cn(
                                      "p-3 rounded-lg border",
                                      preferences.highContrast ? "border-white/20 bg-white/5" : "border-gray-200 bg-white"
                                    )}>
                                      <p className="font-bold text-sm">Paso {sIdx + 1}: {step.title}</p>
                                      {step.duration && <p className="text-xs opacity-70 flex items-center gap-1 mt-1"><Timer className="w-3 h-3"/> {step.duration}</p>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
