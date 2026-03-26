import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Image as ImageIcon, FileText, Paperclip, X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useChat } from '@/hooks/useChat';

export function ChatInput() {
  const preferences = useAppStore(state => state.preferences);
  const input = useAppStore(state => state.input);
  const setInput = useAppStore(state => state.setInput);
  const isProcessing = useAppStore(state => state.isProcessing);
  const selectedImage = useAppStore(state => state.selectedImage);
  const setSelectedImage = useAppStore(state => state.setSelectedImage);
  const selectedFile = useAppStore(state => state.selectedFile);
  const setSelectedFile = useAppStore(state => state.setSelectedFile);

  const { handleSend } = useChat();

  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const onImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Imagen demasiado grande. Máximo 5MB."); return; }
    const reader = new FileReader();
    reader.onloadend = () => { 
      setSelectedImage(reader.result as string); 
      setSelectedFile(null); 
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Archivo demasiado grande. Máximo 5MB."); return; }
    const reader = new FileReader();
    reader.onloadend = () => { 
      setSelectedFile({ base64: reader.result as string, name: file.name, type: file.type }); 
      setSelectedImage(null); 
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="p-8 bg-white/40 border-t border-white/60 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        {/* Previews */}
        <div className="flex gap-3 flex-wrap">
          {selectedImage && (
            <div className="relative inline-block">
              <Image src={selectedImage} alt="Preview" width={80} height={80} unoptimized className="h-20 w-20 object-cover rounded-2xl border-2 border-primary calm-shadow" />
              <button 
                onClick={() => setSelectedImage(null)} 
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {selectedFile && (
            <div className="relative inline-flex items-center gap-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-2xl calm-shadow pr-8">
              <FileText className="w-7 h-7 text-blue-500 shrink-0" />
              <div className="flex flex-col">
                <span className="font-bold text-sm text-zinc-700 truncate max-w-[140px]">{selectedFile.name}</span>
                <span className="text-xs text-blue-600 uppercase">{selectedFile.type.split('/').pop()}</span>
              </div>
              <button 
                onClick={() => setSelectedFile(null)} 
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-5">
          {/* Hidden file inputs */}
          <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={onImageUpload} />
          <input type="file" accept=".pdf,.doc,.docx,text/plain" className="hidden" ref={docInputRef} onChange={onDocUpload} />

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
  );
}
