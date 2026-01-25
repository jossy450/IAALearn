import { create } from 'zustand';

export const useSessionStore = create((set) => ({
  currentSession: null,
  sessions: [],
  isRecording: false,
  
  setCurrentSession: (session) => set({ currentSession: session }),
  setSessions: (sessions) => set({ sessions }),
  setRecording: (isRecording) => set({ isRecording }),
  
  addQuestion: (question) => set((state) => ({
    currentSession: state.currentSession
      ? {
          ...state.currentSession,
          questions: [...(state.currentSession.questions || []), question]
        }
      : null
  })),
  
  clearSession: () => set({ currentSession: null, isRecording: false }),
}));
