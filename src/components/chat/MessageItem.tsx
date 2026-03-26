import React from 'react';
import { motion } from 'framer-motion';
import { User, Brain, FileText, X, Volume2, Heart, Info } from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { AgentMessage } from '@/lib/ai-agent';
import { useAppStore } from '@/store/useAppStore';
import { useChat } from '@/hooks/useChat';
import { TaskCard } from './TaskCard';
import { ImmersiveReaderButton } from '@/components/ImmersiveReaderButton';

const cleanEmojis = (str: string) => {
  if (!str) return str;
  return str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
};

interface MessageItemProps {
  msg: AgentMessage;
  index: number;
}

export function MessageItem({
  msg,
  index
}: MessageItemProps) {
  const preferences = useAppStore(state => state.preferences);
  const speakingId = useAppStore(state => state.speakingId);
  const messages = useAppStore(state => state.messages);
  const setExplanationOpen = useAppStore(state => state.setExplanationOpen);
  const setActiveExplanation = useAppStore(state => state.setActiveExplanation);
  
  const { playAudio } = useChat();

  const isUser = msg.role === 'user';
  // Tu Objetivo used by TaskCard
  const userGoalText = index > 0 && messages[index - 1].role === 'user' ? messages[index - 1].content : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn("flex gap-5", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 calm-shadow border-2 transition-all",
        isUser
          ? (preferences.highContrast ? "bg-zinc-950 border-slate-800 text-zinc-200" : "bg-primary border-primary text-white")
          : (preferences.highContrast ? "bg-zinc-950 border-slate-800 text-zinc-200" : "bg-white border-white text-secondary")
      )}>
        {isUser ? <User className="w-7 h-7" /> : <Brain className="w-7 h-7" />}
      </div>

      <div className={cn("max-w-[80%] space-y-4", isUser ? "text-right" : "text-left")}>
        <div className={cn(
          "inline-block px-7 py-5 rounded-[2.2rem] text-lg leading-relaxed calm-shadow",
          isUser
            ? "bg-blue-600 text-white rounded-tr-none shadow-blue-100"
            : "bg-white border border-white/50 rounded-tl-none",
          preferences.highContrast && (isUser ? "bg-blue-500 shadow-none border-slate-800 text-zinc-950" : "bg-slate-900 text-zinc-200 border-slate-800 border")
        )}>
          <div className={cn(
            "prose prose-sm md:prose-base max-w-none whitespace-pre-wrap transition-colors duration-500",
            (preferences.highContrast && !isUser) || (!preferences.highContrast && isUser) ? "prose-invert" : "",
            preferences.highContrast ? (isUser ? "text-zinc-950" : "text-zinc-200") : (isUser ? "text-white" : "text-[#2C3E50]")
          )}>
            <ReactMarkdown>{cleanEmojis(msg.content)}</ReactMarkdown>
          </div>


          
          {msg.image && (
            <div className="mt-4 rounded-xl overflow-hidden border-2 border-white/20">
              <Image src={msg.image} alt="Usuario adjunto" width={400} height={300} unoptimized className="max-w-full h-auto" />
            </div>
          )}
          
          {msg.id?.startsWith('file-') && (
            <div className={cn(
              "mt-4 p-4 rounded-2xl flex items-center gap-3 border transition-colors",
              preferences.highContrast 
                ? (isUser ? "bg-white/20 border-white/30 text-zinc-950" : "bg-slate-900/90 border-slate-800 text-zinc-200") 
                : "bg-blue-50 border-blue-100 text-[#2C3E50]"
            )}>
              <FileText className="w-8 h-8" />
              <div className="flex flex-col">
                <span className="font-bold text-sm">Documento Adjunto</span>
                <span className="text-xs opacity-70 truncate max-w-[200px]">
                  {msg.id.replace('file-', '')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Task List / Step-by-Step UI */}
        <TaskCard 
          msg={msg} 
          msgIndex={index} 
          userGoalText={userGoalText} 
        />

        {/* Message Actions (Immersive Reader & Speech) - Only for generated responses (not the first one) */}
        {!isUser && index > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            <ImmersiveReaderButton 
              title="CogniCare" 
              content={(() => {
                let text = cleanEmojis(msg.content);
                if (msg.type === 'task-list' && msg.steps) {
                  const stepsText = msg.steps.map((s, idx) => {
                    const rawTitle = s.title.replace(/^Paso\s+\d+[:\-\.]?\s*/i, '').trim();
                    const textTitle = cleanEmojis(rawTitle);
                    const title = textTitle ? `Paso ${idx + 1}: ${textTitle}` : `Paso ${idx + 1}`;
                    const bullets = s.bullets ? s.bullets.map(b => cleanEmojis(b)).join('\n') : '';
                    const duration = s.duration ? `\nTiempo estimado: ${s.duration}` : '';
                    return `${title}\n${bullets}${duration}`;
                  }).join('\n\n');
                  text = `${text}\n\n${stepsText}`;
                }
                return text;
              })()} 
            />
            <button
              onClick={() => {
                let textToSpeak = msg.content;
                if (msg.type === 'task-list' && msg.steps) {
                  const stepsText = msg.steps.map((s, idx) => `Paso ${idx + 1}: ${s.title}`).join('. ');
                  textToSpeak += `. ${stepsText}`;
                }
                playAudio(textToSpeak, index);
              }}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-2xl border transition-all interactive-element text-sm font-bold calm-shadow",
                preferences.highContrast 
                  ? (speakingId === index ? "bg-red-900 border-white text-white" : "bg-zinc-950 border-slate-800 text-zinc-200")
                  : (speakingId === index ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-border text-foreground")
              )}
            >
              {speakingId === index ? <X className="w-5 h-5" /> : <Volume2 className={cn("w-5 h-5", preferences.highContrast ? "text-zinc-200" : "text-primary")} />}
              <span>{speakingId === index ? 'Parar' : 'Escuchar'}</span>
            </button>
            <button
              onClick={() => {
                const utterance = new SpeechSynthesisUtterance("Te envío este corazón para recordarte que lo estás haciendo genial.");
                utterance.lang = 'es-ES';
                window.speechSynthesis.speak(utterance);
              }}
              className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-2xl border border-red-100 interactive-element calm-shadow"
              title="Enviar cariño"
            >
              <Heart className="w-5 h-5 fill-current" />
            </button>

            {msg.explanation && (
              <button
                onClick={() => {
                  setActiveExplanation(msg.explanation!);
                  setExplanationOpen(true);
                }}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-2xl border transition-all interactive-element text-sm font-bold calm-shadow ml-auto",
                  preferences.highContrast 
                    ? "bg-zinc-950 border-slate-800 text-zinc-200"
                    : "bg-blue-50 border-blue-100 text-blue-600 hover:bg-[#5A9EFF]/20"
                )}
                title="Explicar respuesta"
              >
                <Info className={cn("w-5 h-5", preferences.highContrast ? "text-zinc-200" : "text-blue-500")} />
                <span>Explicar respuesta</span>
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
