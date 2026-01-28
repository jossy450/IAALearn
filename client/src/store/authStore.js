import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => {
        // Clear all auth data
        set({ token: null, user: null });
        // Clear localStorage directly to ensure complete cleanup
        localStorage.removeItem('auth-storage');
        // Clear any session data
        sessionStorage.clear();
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
