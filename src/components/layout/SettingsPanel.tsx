import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, AppPreferences } from '@/store/useAppStore';

export function SettingsPanel() {
  const preferences = useAppStore(state => state.preferences);
  const setPreferences = useAppStore(state => state.setPreferences);
  const settingsOpen = useAppStore(state => state.settingsOpen);
  const setSettingsOpen = useAppStore(state => state.setSettingsOpen);

  const updatePreference = <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    setPreferences({ [key]: value });
  };

  return (
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
                      onClick={() => updatePreference('readingLevel', level.id as AppPreferences['readingLevel'])}
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
                      onClick={() => updatePreference('tone', toneOpt.id as AppPreferences['tone'])}
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
                    onClick={() => updatePreference('highContrast', !preferences.highContrast)}
                    className={cn(
                      "w-14 h-8 rounded-full relative transition-colors",
                      preferences.highContrast ? "bg-blue-400" : "bg-gray-200"
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
                    onClick={() => updatePreference('textToSpeech', !preferences.textToSpeech)}
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
  );
}
