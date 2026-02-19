import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import pushNotifications from '../services/pushNotifications';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        set({ token, user });
        // Attempt to flush any pending push token now that auth exists
        try { pushNotifications.flushPendingPushToken(); } catch (_) {}
      },
      logout: () => {
        // Clear Zustand state
        set({ token: null, user: null });
        
        // Clear all localStorage keys
        try {
          localStorage.removeItem('auth-storage');
          localStorage.clear();
        } catch (e) {
          console.error('Error clearing localStorage:', e);
        }
        
        // Clear sessionStorage
        try {
          sessionStorage.clear();
        } catch (e) {
          console.error('Error clearing sessionStorage:', e);
        }
        
        // Clear all cookies
        document.cookie.split(';').forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name && name !== 'SESSION_ID') { // Keep session for server cleanup
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
          }
        });
      },
    }),
    {
      name: 'auth-storage',
      version: 1,
      // Ensure clean hydration
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Hydration error:', error);
          localStorage.removeItem('auth-storage');
        }
      }
    }
  )
);
