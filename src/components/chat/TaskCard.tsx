import React from 'react';
import { motion } from 'framer-motion';
import { PenTool, Timer, Bell, CheckCircle2 } from 'lucide-react';
import { useSession } from "next-auth/react";
import { cn } from '@/lib/utils';
import { AgentMessage } from '@/lib/ai-agent';
import { useAppStore } from '@/store/useAppStore';
import { useChat } from '@/hooks/useChat';
import { sendTaskReminder } from '@/lib/notifications';

const cleanEmojis = (str: string) => {
  if (!str) return str;
  return str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
};

interface TaskCardProps {
  msg: AgentMessage;
  msgIndex: number;
  userGoalText?: string;
}

export function TaskCard({
  msg,
  msgIndex,
  userGoalText
}: TaskCardProps) {
  const { data: session } = useSession();
  const preferences = useAppStore(state => state.preferences);
  const completedSteps = useAppStore(state => state.completedSteps);
  const { toggleStep } = useChat();

  const handleNotify = async (taskTitle: string, stepTitle: string, stepDescription: string = "") => {
    const userEmail = session?.user?.email;
    if (!userEmail) {
      alert("Inicia sesión para recibir alertas en tu correo.");
      return;
    }
    
    const toast = document.createElement('div');
    toast.textContent = "📫 Preparando aviso...";
    toast.className = "fixed bottom-10 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl z-[200] font-bold animate-bounce";
    document.body.appendChild(toast);

    try {
      const result = await sendTaskReminder(userEmail, taskTitle, stepTitle, stepDescription);
      if (result.success) {
        toast.textContent = "¡Aviso enviado al email! ✅";
        toast.className = "fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-2xl z-[200] font-bold";
      } else {
        toast.textContent = "Revisa el remitente en Azure ✉️";
        toast.className = "fixed bottom-10 left-1/2 -translate-x-1/2 bg-zinc-950 text-white px-6 py-3 rounded-full shadow-2xl z-[200] font-bold";
      }
    } catch {
      toast.textContent = "Fallo de conexión ❌";
    }
    setTimeout(() => toast.remove(), 4000);
  };

  if (msg.type !== 'task-list' || !msg.steps) return null;

  return (
    <div className="space-y-8 mt-6 w-full max-w-4xl mx-auto">
      {/* Meta Recap - Show the user's question as a goal card */}
      {userGoalText && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "p-8 rounded-[2.5rem] border-2 flex items-center gap-5 calm-shadow relative overflow-hidden",
            preferences.highContrast 
              ? "bg-zinc-950 border-slate-800 text-zinc-200 shadow-none" 
              : "bg-gradient-to-br from-indigo-50/80 to-blue-50/80 border-indigo-100"
          )}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className={cn(
            "p-4 rounded-2xl shadow-sm z-10",
            preferences.highContrast ? "bg-slate-900/90" : "bg-white border border-indigo-50"
          )}>
            <PenTool className={cn("w-8 h-8", preferences.highContrast ? "text-zinc-200" : "text-indigo-500")} />
          </div>
          <div className="z-10">
            <p className={cn(
              "text-xs font-black uppercase tracking-[0.2em] mb-2",
              preferences.highContrast ? "text-zinc-400" : "text-indigo-600/80"
            )}>Tu Objetivo</p>
            <div className="space-y-3">
              <p className={cn(
                "text-2xl font-black leading-tight",
                preferences.highContrast ? "text-zinc-200" : "text-slate-800"
              )}>
                {userGoalText}
              </p>
              <p className={cn(
                "text-lg font-medium",
                preferences.highContrast ? "text-zinc-200" : "text-slate-600"
              )}>
                Sigue estos pasos y dale clic al botón Completar cada vez que finalices una tarea. ¡Vas a hacerlo muy bien!
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {msg.steps.map((step, idx) => {
        const stepId = `${msgIndex}-${idx}`;
        const isDone = completedSteps.has(stepId);
        
        return (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0, scale: isDone ? 0.98 : 1 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className={cn(
              "p-10 rounded-[3.5rem] border-2 transition-all duration-500 calm-shadow relative",
              preferences.highContrast 
                ? "bg-slate-900 border-2 border-slate-800 shadow-none" 
                : (isDone ? "bg-white border-orange-100 opacity-50 grayscale" : "bg-white border-blue-50/50 hover:border-primary/20")
            )}
          >
            {/* Header Section */}
            <div className="flex justify-between items-start mb-8">
              <h3 className={cn(
                "text-2xl font-black transition-all duration-500 leading-tight",
                isDone 
                  ? "text-gray-400 line-through opacity-60" 
                  : (preferences.highContrast ? "text-zinc-200" : "text-[#34B5FF]")
              )}>
                Paso {idx + 1}
                {(() => {
                  const rawTitle = step.title.replace(/^(Paso|Step)\s+\d+[:\-\.]?\s*/i, '').trim();
                  const textTitle = cleanEmojis(rawTitle);
                  return textTitle ? `: ${textTitle}` : '';
                })()}
              </h3>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleNotify(userGoalText || "Tarea de CogniCare", step.title, step.bullets?.join(' ') || "")}
                  className={cn(
                    "p-2.5 rounded-2xl border-2 transition-all duration-300",
                    isDone ? "opacity-30 pointer-events-none" : "",
                    preferences.highContrast 
                      ? "border-white text-white hover:bg-white/10" 
                      : "border-blue-50 text-blue-400 hover:bg-blue-50"
                  )}
                  disabled={isDone}
                  title="Enviarme recordatorio por email"
                >
                  <Bell className="w-5 h-5" />
                </button>
                <button
                  onClick={() => toggleStep(stepId)}
                  className={cn(
                    "px-4 py-2 rounded-2xl border-2 flex items-center gap-2 font-bold transition-all duration-300",
                    isDone 
                      ? (preferences.highContrast ? "bg-slate-900 text-zinc-200 border-slate-800" : "bg-green-100 border-green-200 text-green-700")
                      : (preferences.highContrast ? "border-slate-800 text-[#F5F5F5] hover:bg-[#1A1A2E] hover:text-[#E0E0E0]" : "border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600 bg-white")
                  )}
                >
                  <CheckCircle2 className={cn("w-5 h-5", isDone ? "scale-100" : "scale-90 opacity-40")} />
                  <span>{isDone ? 'Completado' : 'Completar'}</span>
                </button>
              </div>
            </div>

            {/* Bullets / Content */}
            {step.bullets && step.bullets.length > 0 && (
              <ul className="space-y-6 mb-8 pl-4">
                {step.bullets.map((bullet, bIdx) => (
                  <li key={bIdx} className={cn(
                    "flex gap-5 text-xl items-start leading-relaxed",
                    preferences.highContrast ? "text-zinc-200" : "text-[#2C3E50]"
                  )}>
                    <span className={cn(
                      "mt-3 w-2 h-2 rounded-full shrink-0",
                      preferences.highContrast ? "bg-slate-900" : (isDone ? "bg-orange-300" : "bg-primary/50")
                    )} />
                    <span className={isDone ? "line-through opacity-50" : ""}>
                      {cleanEmojis(bullet)}
                    </span>
                  </li>
                 ))}
              </ul>
            )}
            
            {/* Footer / Timer */}
            {step.duration && (
              <div className={cn(
                "pt-8 border-t flex items-center gap-3",
                preferences.highContrast ? "border-slate-800/50" : "border-orange-50/50"
              )}>
                <Timer className={cn("w-5 h-5", preferences.highContrast ? "text-zinc-200" : "text-orange-300")} />
                <span className={cn(
                  "text-xs font-black uppercase tracking-[0.2em]",
                  preferences.highContrast ? "text-[#F5F5F5]" : (isDone ? "text-orange-200" : "text-orange-400")
                )}>
                  Tiempo estimado: {step.duration}
                </span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
