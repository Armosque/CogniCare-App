import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { MessageItem } from './MessageItem';
import { ChatInput } from './ChatInput';

export function ChatContainer() {
  const preferences = useAppStore(state => state.preferences);
  const focusMode = useAppStore(state => state.focusMode);
  const messages = useAppStore(state => state.messages);
  const isProcessing = useAppStore(state => state.isProcessing);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  return (
    <div className={cn(
      "flex-1 w-full max-w-5xl flex flex-col bg-white/80 backdrop-blur-2xl rounded-[3rem] overflow-hidden calm-shadow border border-white/60 transition-all duration-500",
      focusMode ? "h-0 opacity-0 scale-95" : "h-[75vh]",
      preferences.highContrast && "bg-slate-900 border-slate-800 border text-zinc-200"
    )}>
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 scroll-smooth" ref={scrollRef}>
        <AnimatePresence>
          {messages.map((msg, i) => (
            <MessageItem 
              key={i} 
              index={i} 
              msg={msg} 
            />
          ))}
        </AnimatePresence>

        {isProcessing && messages[messages.length - 1]?.role !== 'assistant' && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex gap-5"
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 calm-shadow border-2",
              preferences.highContrast
                ? "bg-zinc-950 border-slate-800 text-zinc-200"
                : "bg-white border-white text-secondary"
            )}>
              <Brain className="w-7 h-7 animate-pulse" />
            </div>
            <div className={cn(
              "max-w-[80%] px-7 py-5 rounded-[2.2rem] rounded-tl-none border calm-shadow",
              preferences.highContrast
                ? "bg-slate-900 text-zinc-200 border-slate-800 border"
                : "bg-white border-white/50 text-[#2C3E50]"
            )}>
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-lg font-medium">Estoy organizándolo todo, para darte la mejor respuesta 👌</span>
                </div>

                <div className={cn(
                  "flex flex-col items-center gap-4 p-6 rounded-2xl border",
                  preferences.highContrast ? "bg-slate-900 border-slate-800/50" : "bg-blue-50/50 border-blue-100"
                )}>
                  <motion.div 
                    animate={{ scale: [1, 1.8, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className={cn(
                      "w-12 h-12 rounded-full shadow-lg flex items-center justify-center",
                      preferences.highContrast ? "bg-slate-900 text-zinc-200" : "bg-[#A5D8FF]"
                    )}
                  >
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                      className={cn(
                        "w-6 h-6 rounded-full",
                        preferences.highContrast ? "bg-zinc-950" : "bg-slate-900"
                      )}
                    />
                  </motion.div>
                  
                  <motion.p 
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className={cn(
                      "text-sm font-black uppercase tracking-widest text-center",
                      preferences.highContrast ? "text-zinc-200" : "text-primary"
                    )}
                  >
                    Inhala... Exhala...
                  </motion.p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <ChatInput />
    </div>
  );
}
