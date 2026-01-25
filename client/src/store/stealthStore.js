import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStealthStore = create(
  persist(
    (set, get) => ({
      // Current disguise theme
      activeDisguise: null,
      
      // Stealth mode status
      stealthMode: false,
      
      // Panic button configuration
      panicKey: { key: 'Escape', modifiers: [] },
      panicAction: 'decoy',
      decoyScreen: 'google-search',
      
      // Floating widget settings
      floatingWidget: {
        enabled: false,
        size: 'small',
        position: 'bottom-right',
        opacity: 0.9,
        style: 'sticky-note',
        alwaysOnTop: true
      },
      
      // Detection settings
      detection: {
        screenRecording: true,
        screenSharing: true,
        autoHide: true,
        alertUser: true
      },
      
      // Quick copy settings
      quickCopy: {
        enabled: true,
        singleClick: true,
        autoClipboard: true,
        showToast: false
      },
      
      // Clipboard history
      clipboardHistory: [],
      maxClipboardItems: 20,
      
      // Silent mode
      silentMode: true,
      
      // Picture-in-picture
      pipEnabled: false,
      pipPosition: { x: 0, y: 0 },
      
      // Window state
      isHidden: false,
      originalWindowState: null,
      
      // Actions
      setActiveDisguise: (theme) => set({ activeDisguise: theme }),
      
      toggleStealthMode: () => set((state) => ({ 
        stealthMode: !state.stealthMode 
      })),
      
      setPanicKey: (key, modifiers) => set({ 
        panicKey: { key, modifiers } 
      }),
      
      setPanicAction: (action) => set({ panicAction: action }),
      
      setDecoyScreen: (screen) => set({ decoyScreen: screen }),
      
      updateFloatingWidget: (settings) => set((state) => ({
        floatingWidget: { ...state.floatingWidget, ...settings }
      })),
      
      toggleFloatingWidget: () => set((state) => ({
        floatingWidget: { 
          ...state.floatingWidget, 
          enabled: !state.floatingWidget.enabled 
        }
      })),
      
      updateDetection: (settings) => set((state) => ({
        detection: { ...state.detection, ...settings }
      })),
      
      updateQuickCopy: (settings) => set((state) => ({
        quickCopy: { ...state.quickCopy, ...settings }
      })),
      
      addToClipboard: (text) => set((state) => {
        const newHistory = [
          { text, timestamp: Date.now() },
          ...state.clipboardHistory
        ].slice(0, state.maxClipboardItems);
        return { clipboardHistory: newHistory };
      }),
      
      clearClipboardHistory: () => set({ clipboardHistory: [] }),
      
      toggleSilentMode: () => set((state) => ({ 
        silentMode: !state.silentMode 
      })),
      
      togglePIP: () => set((state) => ({ 
        pipEnabled: !state.pipEnabled 
      })),
      
      setPIPPosition: (x, y) => set({ 
        pipPosition: { x, y } 
      }),
      
      hideApp: () => set((state) => ({
        isHidden: true,
        originalWindowState: {
          disguise: state.activeDisguise,
          url: window.location.href
        }
      })),
      
      showApp: () => set((state) => {
        if (state.originalWindowState) {
          // Restore original state
        }
        return { isHidden: false, originalWindowState: null };
      }),
      
      triggerPanic: () => {
        const state = get();
        switch (state.panicAction) {
          case 'minimize':
            if (document.hidden !== undefined) {
              document.hidden = true;
            }
            break;
          case 'decoy':
            state.hideApp();
            // Show decoy screen
            window.location.href = `#/decoy/${state.decoyScreen}`;
            break;
          case 'blank':
            state.hideApp();
            document.body.innerHTML = '';
            document.body.style.background = '#ffffff';
            break;
          case 'close':
            window.close();
            break;
          case 'switch-app':
            // Alt+Tab simulation (browser can't do this)
            window.blur();
            break;
        }
      },
      
      // Screen recording detection
      isScreenBeingRecorded: false,
      setScreenRecording: (status) => set({ 
        isScreenBeingRecorded: status 
      }),
      
      // Reset all stealth settings
      resetStealth: () => set({
        activeDisguise: null,
        stealthMode: false,
        isHidden: false,
        pipEnabled: false
      })
    }),
    {
      name: 'stealth-storage',
      partialize: (state) => ({
        panicKey: state.panicKey,
        panicAction: state.panicAction,
        decoyScreen: state.decoyScreen,
        floatingWidget: state.floatingWidget,
        detection: state.detection,
        quickCopy: state.quickCopy,
        silentMode: state.silentMode,
        maxClipboardItems: state.maxClipboardItems
      })
    }
  )
);

export default useStealthStore;
