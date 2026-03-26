import { useEffect } from 'react';
import { fetchUserPreferences, persistPreferences } from '@/lib/actions';
import { useSession } from 'next-auth/react';
import { useAppStore, AppPreferences } from '@/store/useAppStore';

export function usePreferences() {
  const { status } = useSession();
  const preferences = useAppStore(state => state.preferences);
  const setPreferences = useAppStore(state => state.setPreferences);

  // Sync with Cosmos DB or localStorage when session changes
  useEffect(() => {
    async function syncData() {
      if (status === 'authenticated') {
        const savedPrefs = await fetchUserPreferences();
        if (savedPrefs) {
          setPreferences(savedPrefs as AppPreferences);
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
  }, [status, setPreferences]);

  // Persistent preferences update
  useEffect(() => {
    localStorage.setItem('cognicare_preferences', JSON.stringify(preferences));
    if (status === 'authenticated') {
      persistPreferences(preferences);
    }
  }, [preferences, status]);

  const updatePreference = <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    setPreferences({ [key]: value } as Partial<AppPreferences>);
  };

  return { updatePreference };
}
