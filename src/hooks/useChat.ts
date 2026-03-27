import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AgentMessage } from '@/lib/ai-agent';
import { 
  persistMessage, 
  fetchUserHistory, 
  deleteUserMessageLog, 
  extractTextFromFile 
} from '@/lib/actions';
import { analyzeComplexDocument, extractTextFromImage } from '@/lib/document-analysis';
import { useAppStore } from '@/store/useAppStore';
import confetti from 'canvas-confetti';

export function useChat() {
  const { status } = useSession();

  useEffect(() => {
    async function fetchHistory() {
      if (status === 'authenticated') {
        const history = await fetchUserHistory();
        if (history && history.length > 0) {
          useAppStore.getState().setSavedHistory(history);
        }
      }
    }
    fetchHistory();
  }, [status]);

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5, angle: 60, spread: 55, origin: { x: 0 },
        colors: ['#26C782', '#34B5FF', '#FFB020']
      });
      confetti({
        particleCount: 5, angle: 120, spread: 55, origin: { x: 1 },
        colors: ['#26C782', '#34B5FF', '#FFB020']
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const toggleStep = (stepId: string) => {
    const state = useAppStore.getState();
    const newSet = new Set(state.completedSteps);
    if (newSet.has(stepId)) {
      newSet.delete(stepId);
    } else {
      newSet.add(stepId);
      triggerConfetti();
    }
    state.setCompletedSteps(newSet);
  };

  const handleDeleteConversation = async (index: number) => {
    const state = useAppStore.getState();
    const msgToDelete = state.savedHistory[index];
    if (!msgToDelete || !msgToDelete.id) return;

    const newHistory = [...state.savedHistory];
    newHistory.splice(index, 1);
    state.setSavedHistory(newHistory);

    try {
      await deleteUserMessageLog(msgToDelete.id);
    } catch (e) {
      console.error("No se pudo eliminar de Cosmos DB", e);
    }
  };

  const playAudio = (text: string, id: number) => {
    const state = useAppStore.getState();
    if (!state.preferences.textToSpeech) return;
    if (state.speakingId === id) {
      window.speechSynthesis.cancel();
      state.setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#\[\]]/g, '');
    const maxChunkLength = 200;
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    const chunks: string[] = [];
    sentences.forEach(s => {
      if (s.length > maxChunkLength) {
        const subchunks = s.match(new RegExp(`.{1,${maxChunkLength}}(\\s+|$)`, 'g')) || [s];
        chunks.push(...subchunks);
      } else {
        chunks.push(s);
      }
    });

    let chunkIndex = 0;
    const speakNextChunk = () => {
      if (chunkIndex < chunks.length) {
        const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.onend = () => {
          chunkIndex++;
          speakNextChunk();
        };
        utterance.onerror = (e) => {
          console.error("SpeechSynthesisUtterance.onerror", e);
          useAppStore.getState().setSpeakingId(null);
        };
        window.speechSynthesis.speak(utterance);
      } else {
        useAppStore.getState().setSpeakingId(null);
      }
    };
    state.setSpeakingId(id);
    speakNextChunk();
  };

  const handleSend = async () => {
    const state = useAppStore.getState();
    if ((!state.input.trim() && !state.selectedImage && !state.selectedFile) || state.isProcessing) return;

    if (status !== 'authenticated') {
      state.setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '🔒 **Ayuda necesaria**: Para que pueda ayudarte a organizar tu día y recordar tus preferencias, por favor haz clic en el botón **"Conectar"** de arriba primero. ✨',
        type: 'text'
      }]);
      state.setInput('');
      return;
    }

    if (state.isProcessing) return;
    state.setIsProcessing(true);

    let docText = "";
    if (state.selectedFile) {
      try {
        const fileType = state.selectedFile.type;
        // Enrutamiento Inteligente de Herramientas de Extracción (CogniCare Logic)
        if (fileType.startsWith("text/") || fileType.includes("json") || fileType.includes("javascript") || fileType.includes("csv")) {
          // El texto plano va directo al extractor nativo rápido (sin consumir API de Document Intelligence)
          docText = await extractTextFromFile(state.selectedFile.base64, fileType);
        } else {
          // Los PDFs y documentos con diseño visual van a Azure Document Intelligence
          docText = await analyzeComplexDocument(state.selectedFile.base64, fileType);
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        alert("Error al procesar el archivo: " + message);
        state.setIsProcessing(false);
        return;
      }
    }

    if (state.selectedImage) {
      try {
        const ocrText = await extractTextFromImage(state.selectedImage);
        docText = docText ? `${docText}\n\nTexto extraido de la imagen:\n${ocrText}` : ocrText;
      } catch (e) {
        console.error("Error en OCR:", e);
      }
    }

    const userInput = state.input;
    const userMsg: AgentMessage = { 
      role: 'user', 
      content: userInput || (state.selectedFile ? `Analizando: ${state.selectedFile.name}` : (state.selectedImage ? "Analiza esta imagen." : "")),
      documentText: docText || undefined,
      image: state.selectedImage || undefined,
      id: state.selectedFile ? `file-${state.selectedFile.name}` : undefined
    };
    
    state.setMessages(prev => [...prev, userMsg]);
    state.setSavedHistory(prev => [...prev, userMsg]);
    state.setInput('');
    state.setSelectedImage(null);
    state.setSelectedFile(null);

    if (status === 'authenticated') {
      persistMessage(userMsg).then(id => {
        if (id) {
          useAppStore.getState().setSavedHistory(prev => prev.map(m => m === userMsg ? { ...m, id } : m));
          useAppStore.getState().setMessages(prev => prev.map(m => m === userMsg ? { ...m, id } : m));
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
        const currentState = useAppStore.getState();
        currentState.setMessages(prev => [...prev, greetingResponse]);
        currentState.setSavedHistory(prev => [...prev, greetingResponse]);
        if (status === 'authenticated') {
          persistMessage(greetingResponse).then(id => {
            if (id) {
              const latestState = useAppStore.getState();
              latestState.setSavedHistory(prev => prev.map(m => m === greetingResponse ? { ...m, id } : m));
              latestState.setMessages(prev => prev.map(m => m === greetingResponse ? { ...m, id } : m));
            }
          });
        }
        currentState.setIsProcessing(false);
      }, 400);
      return;
    }

    try {
      const currentHistory = useAppStore.getState().messages; 
      const msgId = `assistant-${crypto.randomUUID()}`;

      // Usar Server Action directamente en lugar de fetch
      const result = await (await import('@/lib/actions')).callAgentAction(
        currentHistory,
        state.preferences.readingLevel,
        state.preferences.tone
      );

      const finalMsg: AgentMessage = {
        ...result,
        id: msgId,
        role: 'assistant',
      };
      
      // Render everything at once - clean, complete response
      const s = useAppStore.getState();
      s.setMessages(prev => [...prev, finalMsg]);
      s.setSavedHistory(prev => [...prev, finalMsg]);
      
      if (status === 'authenticated') {
        persistMessage(finalMsg).then(id => {
          if (id) {
            const finalState = useAppStore.getState();
            finalState.setSavedHistory(prev => prev.map(m => m.id === msgId ? { ...m, id } : m));
            finalState.setMessages(prev => prev.map(m => m.id === msgId ? { ...m, id } : m));
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
      const errState = useAppStore.getState();
      errState.setMessages(prev => [...prev, errResponse]);
      errState.setSavedHistory(prev => [...prev, errResponse]);
    } finally {
      useAppStore.getState().setIsProcessing(false);
    }
  };

  return {
    toggleStep,
    playAudio,
    handleSend,
    handleDeleteConversation
  };
}
