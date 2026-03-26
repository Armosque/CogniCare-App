import { create } from 'zustand';
import { AgentMessage } from '@/lib/ai-agent';

export interface AppPreferences {
  readingLevel: string;
  tone: string;
  highContrast: boolean;
  textToSpeech: boolean;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  readingLevel: 'simple',
  tone: 'motivador',
  highContrast: false,
  textToSpeech: true
};

const INITIAL_MESSAGE: AgentMessage = { 
  role: 'assistant', 
  content: '¡Hola! Soy CogniCare. Estoy aquí para ayudarte a organizar tu día y simplificar las tareas que parezcan pesadas. ¿En qué podemos trabajar hoy?', 
  type: 'text' 
};

export interface AppState {
  // --- Preferences ---
  preferences: AppPreferences;
  settingsOpen: boolean;
  setPreferences: (prefs: Partial<AppPreferences> | AppPreferences) => void;
  setSettingsOpen: (open: boolean) => void;

  // --- Pomodoro ---
  focusMode: boolean;
  timerActive: boolean;
  timeLeft: number;
  setFocusMode: (active: boolean) => void;
  setTimerActive: (active: boolean) => void;
  setTimeLeft: (time: number) => void;

  // --- Chat UI ---
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
  expandedQueryIdx: number | null;
  setExpandedQueryIdx: (idx: number | null) => void;
  explanationOpen: boolean;
  setExplanationOpen: (open: boolean) => void;
  activeExplanation: string | undefined;
  setActiveExplanation: (exp: string | undefined) => void;
  speakingId: number | null;
  setSpeakingId: (id: number | null) => void;

  // --- Chat Data ---
  messages: AgentMessage[];
  setMessages: (updater: AgentMessage[] | ((prev: AgentMessage[]) => AgentMessage[])) => void;
  savedHistory: AgentMessage[];
  setSavedHistory: (updater: AgentMessage[] | ((prev: AgentMessage[]) => AgentMessage[])) => void;
  completedSteps: Set<string>;
  setCompletedSteps: (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => void;

  // --- Chat Input ---
  input: string;
  setInput: (input: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  selectedImage: string | null;
  setSelectedImage: (img: string | null) => void;
  selectedFile: { base64: string, name: string, type: string } | null;
  setSelectedFile: (file: { base64: string, name: string, type: string } | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // --- Preferences ---
  preferences: DEFAULT_PREFERENCES,
  settingsOpen: false,
  setPreferences: (prefs) => set((state) => ({ 
    preferences: { ...state.preferences, ...prefs } 
  })),
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  // --- Pomodoro ---
  focusMode: false,
  timerActive: false,
  timeLeft: 25 * 60,
  setFocusMode: (active) => set({ focusMode: active }),
  setTimerActive: (active) => set({ timerActive: active }),
  setTimeLeft: (time) => set({ timeLeft: time }),

  // --- Chat UI ---
  historyOpen: false,
  setHistoryOpen: (open) => set({ historyOpen: open }),
  expandedQueryIdx: null,
  setExpandedQueryIdx: (idx) => set({ expandedQueryIdx: idx }),
  explanationOpen: false,
  setExplanationOpen: (open) => set({ explanationOpen: open }),
  activeExplanation: undefined,
  setActiveExplanation: (exp) => set({ activeExplanation: exp }),
  speakingId: null,
  setSpeakingId: (id) => set({ speakingId: id }),

  // --- Chat Data ---
  messages: [INITIAL_MESSAGE],
  setMessages: (updater) => set((state) => ({
    messages: typeof updater === 'function' ? updater(state.messages) : updater
  })),
  savedHistory: [],
  setSavedHistory: (updater) => set((state) => ({
    savedHistory: typeof updater === 'function' ? updater(state.savedHistory) : updater
  })),
  completedSteps: new Set<string>(),
  setCompletedSteps: (updater) => set((state) => ({
    completedSteps: typeof updater === 'function' ? updater(state.completedSteps) : updater
  })),

  // --- Chat Input ---
  input: '',
  setInput: (input) => set({ input }),
  isProcessing: false,
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  selectedImage: null,
  setSelectedImage: (img) => set({ selectedImage: img }),
  selectedFile: null,
  setSelectedFile: (file) => set({ selectedFile: file }),
}));
