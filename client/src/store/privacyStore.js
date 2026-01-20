import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const usePrivacyStore = create(
  persist(
    (set) => ({
      disguiseMode: false,
      disguiseTheme: 'productivity',
      quickHideEnabled: true,
      quickHideKey: 'Escape',
      
      setDisguiseMode: (disguiseMode) => set({ disguiseMode }),
      setDisguiseTheme: (disguiseTheme) => set({ disguiseTheme }),
      setQuickHide: (quickHideEnabled, quickHideKey) => 
        set({ quickHideEnabled, quickHideKey }),
    }),
    {
      name: 'privacy-storage',
    }
  )
);
