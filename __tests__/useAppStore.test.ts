import { useAppStore } from '@/store/useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset state before each test if necessary
    // Fortunately Zustand lets us fetch initial state via useAppStore.getState()
    const state = useAppStore.getState();
    state.setInput('');
    state.setMessages([]);
    state.setSelectedImage(null);
    state.setSelectedFile(null);
  });

  it('should initialize with default values', () => {
    const state = useAppStore.getState();
    expect(state.input).toBe('');
    expect(state.messages).toEqual([]);
    expect(state.preferences.highContrast).toBe(false);
    expect(state.preferences.readingLevel).toBe('simple');
    expect(state.isProcessing).toBe(false);
  });

  it('should update text input correctly', () => {
    useAppStore.getState().setInput('Hola mundo');
    const state = useAppStore.getState();
    expect(state.input).toBe('Hola mundo');
  });

  it('should append messages correctly', () => {
    const testMsg = { role: 'user' as const, content: 'Test', type: 'text' as const };
    useAppStore.getState().setMessages(prev => [...prev, testMsg]);
    
    const state = useAppStore.getState();
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toEqual(testMsg);
  });
  
  it('should update preferences', () => {
    useAppStore.getState().setPreferences({ highContrast: true, textToSpeech: true });
    
    const state = useAppStore.getState();
    expect(state.preferences.highContrast).toBe(true);
    expect(state.preferences.textToSpeech).toBe(true);
    // Should preserve default readingLevel
    expect(state.preferences.readingLevel).toBe('simple');
  });
});
