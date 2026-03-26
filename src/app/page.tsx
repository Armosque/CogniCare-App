"use client"

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ImmersiveReaderButton } from '@/components/ImmersiveReaderButton';
import { sendTaskReminder } from '@/lib/notifications';
import { processWithAgent, type AgentMessage } from '@/lib/ai-agent';
import {
  Volume2,
  PenTool,
  Key,
  Settings,
  X,
  Send,
  User,
  Timer,
  CheckCircle2,
  Brain,
  Heart,
  History,
  Trash2,
  Info,
  Image as ImageIcon,
  Paperclip,
  FileText,
  Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSession, signOut } from "next-auth/react";

import {
  persistMessage,
  persistPreferences,
  fetchUserHistory,
  fetchUserPreferences,
  deleteUserMessageLog,
  extractTextFromFile
} from "@/lib/actions";
import { analyzeComplexDocument, extractTextFromImage } from '@/lib/document-analysis';
import ReactMarkdown from 'react-markdown';
import confetti from 'canvas-confetti';

const cleanEmojis = (str: string) => {
  if (!str) return str;
  return str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
};

export default function CogniCareApp() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<AgentMessage[]>([
    { role: 'assistant', content: '¡Hola! Soy CogniCare. Estoy aquí para ayudarte a organizar tu día y simplificar las tareas que parezcan pesadas. ¿En qué podemos trabajar hoy?', type: 'text' }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savedHistory, setSavedHistory] = useState<AgentMessage[]>([]);
  const [expandedQueryIdx, setExpandedQueryIdx] = useState<number | null>(null);

  const [preferences, setPreferences] = useState({
    readingLevel: 'simple',
    tone: 'motivador',
    highContrast: false,
    textToSpeech: true
  });
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [activeExplanation, setActiveExplanation] = useState<string | undefined>(undefined);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ base64: string, name: string, type: string } | null>(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Sync with Cosmos DB when session changes
  useEffect(() => {
    async function syncData() {
      if (status === 'authenticated') {
        const [history, savedPrefs] = await Promise.all([
          fetchUserHistory(),
          fetchUserPreferences()
        ]);
        
        if (history && history.length > 0) {
          setSavedHistory(history);
        }
        if (savedPrefs) {
          setPreferences(savedPrefs);
        }
      } else if (status === 'unauthenticated') {
        // Fallback to localStorage for guest users
        const saved = localStorage.getItem('cognicare_preferences');
        if (saved) {
          try {
            setPreferences(JSON.parse(saved));
          } catch (e) {
            console.error("Error loading local preferences:", e);
          }
        }
      }
    }
    syncData();
  }, [status]);

  // Persistent preferences update
  useEffect(() => {
    localStorage.setItem('cognicare_preferences', JSON.stringify(preferences));
    if (status === 'authenticated') {
      persistPreferences(preferences);
    }
  }, [preferences, status]);

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#26C782', '#34B5FF', '#FFB020']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#26C782', '#34B5FF', '#FFB020']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      const wasCompleted = newSet.has(stepId);
      
      if (wasCompleted) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
        
        // Verificamos si todos los pasos de este mensaje están completados para celebrar
        const [msgIdxStr] = stepId.split('-');
        const msgIdx = parseInt(msgIdxStr, 10);
        const msg = messages[msgIdx];
        
        if (msg && msg.steps) {
          const totalSteps = msg.steps.length;
          let completedCount = 0;
          for (let i = 0; i < totalSteps; i++) {
            if (newSet.has(`${msgIdx}-${i}`)) {
              completedCount++;
            }
          }
          if (completedCount === totalSteps) {
            triggerConfetti();
          }
        }
      }
      return newSet;
    });
  };

  const handleNotify = async (taskTitle: string, stepTitle: string, stepDescription: string = "") => {
    const userEmail = session?.user?.email || "usuario@cognicare.com";
    
    // Feedback visual simple (Toast temporal)
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

  const scrollRef = useRef<HTMLDivElement>(null);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startFocus = (mins: number) => {
    setTimeLeft(mins * 60);
    setTimerActive(true);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage && !selectedFile) || isProcessing) return;

    if (status !== 'authenticated') {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '🔒 **Ayuda necesaria**: Para que pueda ayudarte a organizar tu día y recordar tus preferencias, por favor haz clic en el botón **"Conectar"** de arriba primero. ✨',
        type: 'text'
      }]);
      setInput('');
      return;
    }

    setIsProcessing(true);

    let docText = "";
    if (selectedFile) {
      try {
        // Mejoramos la extracción usando Document Intelligence para PDFs
        if (selectedFile.type === "application/pdf") {
          docText = await analyzeComplexDocument(selectedFile.base64, selectedFile.type);
        } else {
          docText = await extractTextFromFile(selectedFile.base64, selectedFile.type);
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        alert("Error al procesar el archivo: " + message);
        setIsProcessing(false);
        return;
      }
    }

    if (selectedImage) {
      try {
        // Realizamos OCR especializado en la imagen para ayudar al agente
        const ocrText = await extractTextFromImage(selectedImage);
        docText = ocrText;
      } catch (e) {
        console.error("Error en OCR:", e);
      }
    }

    const userInput = input;
    const userMsg: AgentMessage = { 
      role: 'user', 
      content: userInput || (selectedFile ? `Analizando: ${selectedFile.name}` : (selectedImage ? "Analiza esta imagen." : "")),
      documentText: docText || undefined,
      image: selectedImage || undefined,
      id: selectedFile ? `file-${selectedFile.name}` : undefined // Using ID to store filename for the UI box
    };
    setMessages(prev => [...prev, userMsg]);
    setSavedHistory(prev => [...prev, userMsg]);
    setInput('');
    setSelectedImage(null);
    setSelectedFile(null);

    // Optimistic persistence
    if (status === 'authenticated') {
      persistMessage(userMsg).then(id => {
        if (id) {
          setSavedHistory(prev => prev.map(m => m === userMsg ? { ...m, id } : m));
          setMessages(prev => prev.map(m => m === userMsg ? { ...m, id } : m));
        }
      });
    }

    const cleanInput = userInput.trim().toLowerCase().replace(/[^\w\sñáéíóú]/g, '');
    const isGreeting = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos', 'hola cognicare', 'holi', 'que tal', 'hola que tal'].includes(cleanInput);

    if (isGreeting) {
      setTimeout(() => {
        const greetingResponse: AgentMessage = {
          role: 'assistant',
          content: '¡Hola! Qué gusto saludarte. ¿En qué te puedo ayudar hoy? ✨',
          type: 'text'
        };
        setMessages(prev => [...prev, greetingResponse]);
        setSavedHistory(prev => [...prev, greetingResponse]);
        if (status === 'authenticated') {
          persistMessage(greetingResponse).then(id => {
            if (id) {
              setSavedHistory(prev => prev.map(m => m === greetingResponse ? { ...m, id } : m));
              setMessages(prev => prev.map(m => m === greetingResponse ? { ...m, id } : m));
            }
          });
        }
      }, 400);
      return;
    }

    setIsProcessing(true);

    try {
      const currentHistory = [...messages, userMsg];
      const response = await processWithAgent(currentHistory, preferences.readingLevel, preferences.tone);
      setMessages(prev => [...prev, response]);
      setSavedHistory(prev => [...prev, response]);
      
      // Persist agent response
      if (status === 'authenticated') {
        persistMessage(response).then(id => {
          if (id) {
            setSavedHistory(prev => prev.map(m => m === response ? { ...m, id } : m));
            setMessages(prev => prev.map(m => m === response ? { ...m, id } : m));
          }
        });
      }
    } catch (error) {
      console.error("Error calling agent:", error);
      const errResponse: AgentMessage = { 
        role: 'assistant', 
        content: 'Lo siento, tuve un problema al conectar con mi cerebro artificial. ¿Podrías intentar de nuevo? ✨',
        type: 'text'
      };
      setMessages(prev => [...prev, errResponse]);
      setSavedHistory(prev => [...prev, errResponse]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className={cn(
      "min-h-screen relative flex flex-col items-center p-4 md:p-8 transition-all duration-700 overflow-hidden",
      preferences.highContrast ? "bg-zinc-950 text-zinc-200 transition-none" : "sky-bg"
    )}>
      {/* Background Clouds */}
      {!preferences.highContrast && (
        <div className="fixed inset-0 pointer-events-none -z-10 bg-[#A5D8FF]/20">
          <div className="cloud w-64 h-24 top-[10%] left-[5%] animate-float" />
          <div className="cloud w-96 h-32 top-[40%] right-[10%] animate-float" style={{ animationDelay: '-5s' }} />
          <div className="cloud w-80 h-28 bottom-[20%] left-[15%] animate-float" style={{ animationDelay: '-12s' }} />
        </div>
      )}

      {/* Modern Compact Header */}
      {!focusMode && (
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
            {/* Auth Unified Button */}
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
              onClick={() => { setHistoryOpen(true); setExpandedQueryIdx(null); }}
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
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </motion.header>
      )}

      {/* Main Chat Container - BACK TO CORE FUNCTIONALITY */}
      <div className={cn(
        "flex-1 w-full max-w-5xl flex flex-col bg-white/80 backdrop-blur-2xl rounded-[3rem] overflow-hidden calm-shadow border border-white/60 transition-all duration-500",
        focusMode ? "h-0 opacity-0 scale-95" : "h-[75vh]",
        preferences.highContrast && "bg-slate-900 border-slate-800 border text-zinc-200"
      )}>
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 scroll-smooth" ref={scrollRef}>
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  "flex gap-5",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 calm-shadow border-2 transition-all",
                  msg.role === 'user' 
                    ? (preferences.highContrast ? "bg-zinc-950 border-slate-800 text-zinc-200" : "bg-primary border-primary text-white") 
                    : (preferences.highContrast ? "bg-zinc-950 border-slate-800 text-zinc-200" : "bg-white border-white text-secondary")
                )}>
                  {msg.role === 'user' ? <User className="w-7 h-7" /> : <Brain className="w-7 h-7" />}
                </div>
                
                <div className={cn(
                  "max-w-[80%] space-y-4",
                  msg.role === 'user' ? "text-right" : "text-left"
                )}>
                  <div className={cn(
                    "inline-block px-7 py-5 rounded-[2.2rem] text-lg leading-relaxed calm-shadow",
                    msg.role === 'user' 
                      ? "bg-blue-600 text-white rounded-tr-none shadow-blue-100" 
                      : "bg-white border border-white/50 rounded-tl-none",
                    preferences.highContrast && (msg.role === 'user' ? "bg-blue-500 shadow-none border-slate-800 text-zinc-950" : "bg-slate-900 text-zinc-200 border-slate-800 border")
                  )}>
                    <div className={cn(
                      "prose prose-sm md:prose-base max-w-none whitespace-pre-wrap transition-colors duration-500",
                      (preferences.highContrast && msg.role !== 'user') || (!preferences.highContrast && msg.role === 'user') ? "prose-invert" : "",
                      preferences.highContrast ? (msg.role === 'user' ? "text-zinc-950" : "text-zinc-200") : (msg.role === 'user' ? "text-white" : "text-[#2C3E50]")
                    )}>
                      <ReactMarkdown>
                        {cleanEmojis(msg.content)}
                      </ReactMarkdown>
                    </div>
                    {msg.image && (
                      <div className="mt-4 rounded-xl overflow-hidden border-2 border-white/20">
                        <Image src={msg.image} alt="Usuario" width={400} height={300} unoptimized className="max-w-full h-auto" />
                      </div>
                    )}
                    {msg.id?.startsWith('file-') && (
                      <div className={cn(
                        "mt-4 p-4 rounded-2xl flex items-center gap-3 border transition-colors",
                        preferences.highContrast 
                          ? (msg.role === 'user' ? "bg-white/20 border-white/30 text-zinc-950" : "bg-slate-900/90 border-slate-800 text-zinc-200") 
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

                  {/* Task List / Step-by-Step UI - HIGH FIDELITY CARDS */}
                  {msg.type === 'task-list' && msg.steps && (
                    <div className="space-y-8 mt-6 w-full max-w-4xl mx-auto">
                      {/* Meta Recap - Show the user's question as a goal card */}
                      {i > 0 && messages[i-1].role === 'user' && (
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
                                {messages[i-1].content}
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
                        const stepId = `${i}-${idx}`;
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
                                "text-2xl font-black transition-colors leading-tight",
                                isDone ? "text-gray-400" : (preferences.highContrast ? "text-zinc-200" : "text-[#34B5FF]")
                              )}>
                                Paso {idx + 1}
                                {(() => {
                                  // Remove common prefixes like 'Paso 1:', 'Step 1:', etc. to avoid duplication
                                  const rawTitle = step.title.replace(/^(Paso|Step)\s+\d+[:\-\.]?\s*/i, '').trim();
                                  const textTitle = cleanEmojis(rawTitle);
                                  return textTitle ? `: ${textTitle}` : '';
                                })()}
                              </h3>
                              
                              <div className="flex gap-3">
                                <button
                                  onClick={() => handleNotify(messages[i-1]?.content || "Tarea de CogniCare", step.title, step.bullets?.join(' ') || "")}
                                  className={cn(
                                    "p-2.5 rounded-2xl border-2 transition-all duration-300",
                                    preferences.highContrast 
                                      ? "border-white text-white hover:bg-[#1A1A2E]/80" 
                                      : "border-blue-50 text-blue-400 hover:bg-blue-50 hover:border-[#2A2A4A]"
                                  )}
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
                  )}

                  {/* Message Actions (Immersive Reader & Speech) - Only for generated responses (not the first one) */}
                  {msg.role === 'assistant' && i > 0 && (
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
                              
                              const bullets = s.bullets 
                                ? s.bullets.map(b => cleanEmojis(b)).join('\n') 
                                : '';
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
                          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                            if (speakingId === i) {
                              window.speechSynthesis.cancel();
                              setSpeakingId(null);
                            } else {
                              window.speechSynthesis.cancel();
                              const utterance = new SpeechSynthesisUtterance(msg.content);
                              utterance.lang = 'es-ES';
                              utterance.onend = () => setSpeakingId(null);
                              utterance.onerror = () => setSpeakingId(null);
                              setSpeakingId(i);
                              window.speechSynthesis.speak(utterance);
                            }
                          }
                        }}
                        className={cn(
                          "flex items-center gap-2 px-5 py-2.5 rounded-2xl border transition-all interactive-element text-sm font-bold calm-shadow",
                          preferences.highContrast 
                            ? (speakingId === i ? "bg-red-900 border-white text-white" : "bg-zinc-950 border-slate-800 text-zinc-200")
                            : (speakingId === i ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-border text-foreground")
                        )}
                      >
                        {speakingId === i ? (
                          <X className="w-5 h-5" />
                        ) : (
                          <Volume2 className={cn("w-5 h-5", preferences.highContrast ? "text-zinc-200" : "text-primary")} />
                        )}
                        <span>{speakingId === i ? 'Parar' : 'Escuchar'}</span>
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
                            setActiveExplanation(msg.explanation);
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
            ))}
          </AnimatePresence>
          {isProcessing && (
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

                  {/* Active Pause / Breathing Exercise during loading */}
                  <div className={cn(
                    "flex flex-col items-center gap-4 p-6 rounded-2xl border",
                    preferences.highContrast ? "bg-slate-900 border-slate-800/50" : "bg-blue-50/50 border-blue-100"
                  )}>
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.8, 1], 
                        opacity: [0.7, 1, 0.7] 
                      }}
                      transition={{ 
                        duration: 8, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
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

        {/* Input Area */}
        <div className="p-8 bg-white/40 border-t border-white/60 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto flex flex-col gap-4">
            {/* Previews */}
            <div className="flex gap-3 flex-wrap">
              {selectedImage && (
                <div className="relative inline-block">
                  <Image src={selectedImage} alt="Preview" width={80} height={80} unoptimized className="h-20 w-20 object-cover rounded-2xl border-2 border-primary calm-shadow" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"><X className="w-3 h-3" /></button>
                </div>
              )}
              {selectedFile && (
                <div className="relative inline-flex items-center gap-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-2xl calm-shadow pr-8">
                  <FileText className="w-7 h-7 text-blue-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-zinc-700 truncate max-w-[140px]">{selectedFile.name}</span>
                    <span className="text-xs text-blue-600 uppercase">{selectedFile.type.split('/').pop()}</span>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-5">
              {/* Hidden file inputs */}
              <input type="file" accept="image/*" className="hidden" ref={imageInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) { alert("Imagen demasiado grande. Máximo 5MB."); return; }
                  const reader = new FileReader();
                  reader.onloadend = () => { setSelectedImage(reader.result as string); setSelectedFile(null); };
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }}
              />
              <input type="file" accept=".pdf,.doc,.docx,text/plain" className="hidden" ref={docInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) { alert("Archivo demasiado grande. Máximo 5MB."); return; }
                  const reader = new FileReader();
                  reader.onloadend = () => { setSelectedFile({ base64: reader.result as string, name: file.name, type: file.type }); setSelectedImage(null); };
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }}
              />

              {/* Attach dropdown */}
              <div className="relative">
                <button
                  onClick={() => setAttachMenuOpen(prev => !prev)}
                  className={cn(
                    "p-5 rounded-2xl border-2 transition-all interactive-element calm-shadow flex items-center gap-2 font-bold",
                    attachMenuOpen
                      ? (preferences.highContrast ? "bg-slate-900 text-zinc-200 border-slate-800" : "bg-primary/10 border-primary text-primary")
                      : (preferences.highContrast ? "bg-zinc-950 border-slate-800 text-zinc-200" : "bg-white border-white text-primary hover:bg-gray-50")
                  )}
                  title="Adjuntar archivo"
                >
                  <Paperclip className="w-6 h-6" />
                  <span className="text-sm hidden md:inline">Adjuntar</span>
                </button>

                <AnimatePresence>
                  {attachMenuOpen && (
                    <>
                      {/* Click-outside backdrop */}
                      <div className="fixed inset-0 z-10" onClick={() => setAttachMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          "absolute bottom-full mb-3 left-0 z-20 rounded-[1.5rem] border-2 p-3 flex flex-col gap-2 min-w-[220px] calm-shadow",
                          preferences.highContrast ? "bg-zinc-950 border-slate-800 text-zinc-200" : "bg-white border-white"
                        )}
                      >
                        <p className={cn("text-xs font-black uppercase tracking-widest px-3 py-1 opacity-50", preferences.highContrast ? "text-zinc-200" : "text-[#2C3E50]")}>
                          Adjuntar archivo
                        </p>
                        <button
                          onClick={() => { imageInputRef.current?.click(); setAttachMenuOpen(false); }}
                          className={cn(
                            "flex items-center gap-4 px-4 py-4 rounded-xl transition-all text-left font-bold",
                            preferences.highContrast ? "hover:bg-[#1A1A2E]/80" : "hover:bg-blue-50"
                          )}
                        >
                          <div className={cn("p-2.5 rounded-xl", preferences.highContrast ? "bg-slate-900/90" : "bg-blue-500/20")}>
                            <ImageIcon className={cn("w-6 h-6", preferences.highContrast ? "text-zinc-200" : "text-blue-600")} />
                          </div>
                          <div>
                            <p className={cn("font-black text-base", preferences.highContrast ? "text-zinc-200" : "text-[#2C3E50]")}>
                              Imagen
                            </p>
                            <p className={cn("text-xs font-medium opacity-60", preferences.highContrast ? "text-zinc-200" : "text-[#2C3E50]")}>JPG, PNG, GIF...</p>
                          </div>
                        </button>
                        <button
                          onClick={() => { docInputRef.current?.click(); setAttachMenuOpen(false); }}
                          className={cn(
                            "flex items-center gap-4 px-4 py-4 rounded-xl transition-all text-left font-bold",
                            preferences.highContrast ? "hover:bg-[#1A1A2E]/80" : "hover:bg-green-50"
                          )}
                        >
                          <div className={cn("p-2.5 rounded-xl", preferences.highContrast ? "bg-slate-900/90" : "bg-green-100")}>
                            <FileText className={cn("w-6 h-6", preferences.highContrast ? "text-zinc-200" : "text-green-600")} />
                          </div>
                          <div>
                            <p className={cn("font-black text-base", preferences.highContrast ? "text-zinc-200" : "text-[#2C3E50]")}>
                              Documento
                            </p>
                            <p className={cn("text-xs font-medium opacity-60", preferences.highContrast ? "text-zinc-200" : "text-[#2C3E50]")}>PDF, Word, TXT</p>
                          </div>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={selectedImage || selectedFile ? "Describe qué quieres saber de este archivo..." : "Escribe aquí... (ej: 'ayúdame con mi tarea')"}
                  className={cn(
                    "w-full p-6 pr-20 bg-white rounded-[2rem] border focus:outline-none focus:ring-8 focus:ring-primary/10 text-xl font-medium placeholder:text-[#2C3E50]/30 calm-shadow transition-all duration-500",
                    preferences.highContrast
                      ? "bg-slate-900 border-slate-800 border text-zinc-200 placeholder:text-gray-500 shadow-none"
                      : "border-white"
                  )}
                  value={input}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !selectedImage && !selectedFile) || isProcessing}
                  className="absolute right-3 top-2.5 bottom-2.5 px-6 bg-primary text-white rounded-2xl disabled:opacity-50 interactive-element font-black calm-shadow flex items-center justify-center gap-2"
                >
                  <Send className="w-6 h-6" />
                  <span className="hidden md:inline">Enviar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Focus Mode View Overlay */}
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



      {/* Settings Panel Overlay */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[110]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                "fixed top-0 right-0 h-full w-full max-w-sm z-[120] shadow-2xl p-8 overflow-y-auto transition-colors duration-500",
                preferences.highContrast ? "bg-slate-900 text-zinc-200 border-2 border-slate-800" : "bg-slate-900 text-white"
              )}
            >
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Settings className={cn("w-6 h-6", preferences.highContrast ? "text-zinc-200" : "text-primary")} />
                  Preferencias
                </h3>
                <button 
                  onClick={() => setSettingsOpen(false)}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    preferences.highContrast ? "hover:bg-[#1A1A2E]/80" : "hover:bg-gray-100"
                  )}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-10">
                {/* Reading Level */}
                <div className="space-y-4">
                  <label className={cn("text-sm font-bold uppercase tracking-wider", preferences.highContrast ? "opacity-60" : "opacity-60 text-zinc-300")}>Nivel de Lectura</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'simple', label: 'Simple (Bajo)', desc: 'Frases cortas y vocabulario básico. Ideal para reducir la fatiga mental y la sobrecarga.' },
                      { id: 'intermedio', label: 'Intermedio', desc: 'Explicaciones claras con un poco más de detalle. El equilibrio perfecto para el día a día.' },
                      { id: 'avanzado', label: 'Avanzado', desc: 'Lenguaje estándar y completo, manteniendo siempre la estructura organizada.' }
                    ].map((level) => (
                      <button
                        key={level.id}
                        onClick={() => setPreferences(prev => ({ ...prev, readingLevel: level.id }))}
                        className={cn(
                          "p-5 rounded-2xl text-left border-2 transition-all font-medium flex flex-col gap-2 relative overflow-hidden",
                          preferences.highContrast 
                            ? (preferences.readingLevel === level.id ? "bg-slate-900 text-zinc-200 border-slate-800" : "bg-zinc-950 border-slate-800 text-zinc-200 hover:bg-[#1A1A2E]/80")
                            : (preferences.readingLevel === level.id ? "bg-primary/10 border-primary text-white" : "border-border hover:border-primary/30 text-white")
                        )}
                      >
                        <div className="flex justify-between items-center">
                          <span className="capitalize font-black text-lg">{level.label}</span>
                          {preferences.readingLevel === level.id && <CheckCircle2 className="w-5 h-5" />}
                        </div>
                        <span className={cn(
                          "text-xs leading-relaxed",
                          preferences.highContrast ? "opacity-90 font-medium" : "opacity-70 text-zinc-300"
                        )}>{level.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone Level */}
                <div className="space-y-4">
                  <label className={cn("text-sm font-bold uppercase tracking-wider", preferences.highContrast ? "opacity-60" : "opacity-60 text-zinc-300")}>Tono de Comunicación</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'motivador', label: 'Motivador y Entusiasta', desc: 'Mucha energía, emojis positivos y validación constante.' },
                      { id: 'directo', label: 'Directo y Lógico', desc: 'Respuestas cortas, sin emojis ni texto de relleno, enfocado en el objetivo.' },
                      { id: 'empatico', label: 'Calmado y Empático', desc: 'Tranquilo, paciente y centrado en reducir la ansiedad.' }
                    ].map((toneOpt) => (
                      <button
                        key={toneOpt.id}
                        onClick={() => setPreferences(prev => ({ ...prev, tone: toneOpt.id }))}
                        className={cn(
                          "p-5 rounded-2xl text-left border-2 transition-all font-medium flex flex-col gap-2 relative overflow-hidden",
                          preferences.highContrast 
                            ? (preferences.tone === toneOpt.id ? "bg-slate-900 text-zinc-200 border-slate-800" : "bg-zinc-950 border-slate-800 text-zinc-200 hover:bg-[#1A1A2E]/80")
                            : (preferences.tone === toneOpt.id ? "bg-primary/10 border-primary text-white" : "border-border hover:border-primary/30 text-white")
                        )}
                      >
                        <div className="flex justify-between items-center">
                          <span className="capitalize font-black text-lg">{toneOpt.label}</span>
                          {preferences.tone === toneOpt.id && <CheckCircle2 className="w-5 h-5" />}
                        </div>
                        <span className={cn(
                          "text-xs leading-relaxed",
                          preferences.highContrast ? "opacity-90 font-medium" : "opacity-70 text-zinc-300"
                        )}>{toneOpt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className={cn("font-bold", preferences.highContrast ? "text-zinc-200" : "text-white")}>Contraste Alto</p>
                      <p className={cn("text-xs", preferences.highContrast ? "text-zinc-400" : "text-zinc-300")}>Mejora la visibilidad del texto</p>
                    </div>
                    <button 
                      onClick={() => setPreferences(prev => ({ ...prev, highContrast: !prev.highContrast }))}
                      className={cn(
                        "w-14 h-8 rounded-full relative transition-colors",
                        preferences.highContrast 
                          ? "bg-blue-400"
                          : "bg-gray-200"
                      )}
                    >
                      <motion.div 
                        animate={{ x: preferences.highContrast ? 24 : 4 }}
                        className={cn(
                          "absolute top-1 left-0 w-6 h-6 rounded-full shadow-md",
                          preferences.highContrast ? "bg-zinc-950" : "bg-slate-900"
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className={cn("font-bold", preferences.highContrast ? "text-zinc-200" : "text-white")}>Apoyo por Voz</p>
                      <p className={cn("text-xs", preferences.highContrast ? "text-zinc-400" : "text-zinc-300")}>Lectura automática de mensajes</p>
                    </div>
                    <button 
                      onClick={() => setPreferences(prev => ({ ...prev, textToSpeech: !prev.textToSpeech }))}
                      className={cn(
                        "w-14 h-8 rounded-full relative transition-colors",
                        preferences.textToSpeech 
                          ? (preferences.highContrast ? "bg-blue-400" : "bg-primary") 
                          : (preferences.highContrast ? "bg-white/20" : "bg-gray-200")
                      )}
                    >
                      <motion.div 
                        animate={{ x: preferences.textToSpeech ? 24 : 4 }}
                        className={cn(
                          "absolute top-1 left-0 w-6 h-6 rounded-full shadow-md",
                          preferences.highContrast ? "bg-zinc-950" : "bg-slate-900"
                        )}
                      />
                    </button>
                  </div>
                </div>

                <div className={cn(
                  "pt-6 border-t mt-4 pb-10",
                  preferences.highContrast ? "border-slate-800/50" : "border-gray-200"
                )}>
                  <button 
                    onClick={() => setSettingsOpen(false)}
                    className={cn(
                      "w-full py-4 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 outline-none shadow-lg interactive-element",
                      preferences.highContrast 
                        ? "bg-slate-900 text-zinc-200 font-black border-2 border-white hover:bg-white/90" 
                        : "bg-[#26C782] hover:bg-[#20A86D] text-white border-2 border-[#20A86D]"
                    )}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Guardar y Aplicar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* History Panel Overlay */}
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
              initial={{ x: '-100%' }} // Slides from left instead of right to differentiate from settings
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
                    
                    // Find the next assistant message
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
                          onClick={async (e) => {
                            e.stopPropagation();
                            // Delete from UI
                            setSavedHistory(prev => prev.filter(m => m !== msg && m !== nextMsg));
                            // Delete from DB if there's an ID
                            if (msg.id) deleteUserMessageLog(msg.id).catch(console.error);
                            if (nextMsg?.id) deleteUserMessageLog(nextMsg.id).catch(console.error);
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
      {/* Explanation Modal */}
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
