import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function usePomodoro() {
  const timerActive = useAppStore(state => state.timerActive);
  const timeLeft = useAppStore(state => state.timeLeft);
  const setTimerActive = useAppStore(state => state.setTimerActive);
  const setTimeLeft = useAppStore(state => state.setTimeLeft);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        useAppStore.setState((state) => ({ timeLeft: state.timeLeft - 1 }));
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, setTimerActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startFocus = (mins: number) => {
    setTimeLeft(mins * 60);
    setTimerActive(true);
  };

  const stopFocus = () => {
    setTimerActive(false);
  };

  const resetFocus = () => {
    setTimerActive(false);
    setTimeLeft(25 * 60);
  };

  return {
    formatTime,
    startFocus,
    stopFocus,
    resetFocus
  };
}
