// client/src/store/sessionSyncStore.js
// Zustand store for cross-device session synchronization

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Session sync store - handles real-time synchronization across devices
 * Persisted to localStorage (web) or Capacitor Storage (mobile)
 */
export const useSessionSyncStore = create(
  persist(
    (set, get) => ({
      // Session info
      sessionId: null,
      deviceId: null,
      deviceType: null, // 'web', 'android', 'ios'
      userId: null,

      // Connection state
      isConnected: false,
      syncStatus: 'idle', // 'idle', 'syncing', 'offline', 'error'
      lastSyncTime: null,
      connectionError: null,

      // Session state
      sessionState: {
        currentQuestion: '',
        currentAnswer: '',
        isStreaming: false,
        isRecording: false,
        isAnswerHidden: false,
        floatingPosition: { x: 50, y: 50 },
        floatingSize: { width: 400, height: 300 },
        floatingCollapsed: false,
        mobileViewMode: 'full_screen',
        version: 0
      },

      // Device tracking
      connectedDevices: [], // Other devices on same session
      networkType: 'unknown',
      batteryLevel: 100,

      // Offline support
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      syncQueue: [], // Changes pending sync
      hasUnsyncedChanges: false,

      // WebSocket
      ws: null,
      wsRetries: 0,
      wsMaxRetries: 10,

      // Actions
      initializeSession: (sessionId, deviceId, deviceType, userId) => {
        set({
          sessionId,
          deviceId,
          deviceType,
          userId
        });
      },

      setConnected: (isConnected) => {
        set({ 
          isConnected,
          syncStatus: isConnected ? 'synced' : 'offline'
        });
      },

      setSyncStatus: (status) => {
        set({ syncStatus: status });
      },

      // Update session state and queue for sync
      updateSessionState: async (updates) => {
        const { sessionState, syncQueue, isOnline, deviceId } = get();
        
        const newState = {
          ...sessionState,
          ...updates,
          version: sessionState.version + 1
        };

        set({ 
          sessionState: newState,
          hasUnsyncedChanges: true,
          lastSyncTime: Date.now()
        });

        // Add to sync queue if offline
        if (!isOnline) {
          const queueItem = {
            id: `${Date.now()}_${Math.random()}`,
            action: 'update',
            entityType: 'state',
            payload: updates,
            timestamp: Date.now()
          };

          set({
            syncQueue: [...syncQueue, queueItem]
          });
        }

        // Send via WebSocket if connected
        const { ws } = get();
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({
              type: 'STATE_CHANGED',
              updates,
              timestamp: Date.now()
            }));
          } catch (error) {
            console.error('Error sending state change via WebSocket:', error);
          }
        }
      },

      // Stream answer chunks
      streamAnswerChunk: (chunk, chunkIndex, totalChunks) => {
        const { ws, isOnline } = get();

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'ANSWER_STREAM',
            answerChunk: chunk,
            chunkIndex,
            totalChunks,
            timestamp: Date.now()
          }));
        }

        // Also update local state
        set(state => ({
          sessionState: {
            ...state.sessionState,
            currentAnswer: state.sessionState.currentAnswer + chunk
          }
        }));
      },

      // Complete answer streaming
      completeAnswerStream: (fullAnswer) => {
        const { ws } = get();

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'ANSWER_COMPLETE',
            fullAnswer,
            timestamp: Date.now()
          }));
        }

        set(state => ({
          sessionState: {
            ...state.sessionState,
            currentAnswer: fullAnswer,
            isStreaming: false
          }
        }));
      },

      // Update connected devices
      setConnectedDevices: (devices) => {
        set({ connectedDevices: devices });
      },

      // Set network info
      setNetworkInfo: (networkType, batteryLevel) => {
        set({ networkType, batteryLevel });
      },

      // Handle online/offline events
      setOnlineStatus: (isOnline) => {
        set({ 
          isOnline,
          syncStatus: isOnline ? 'syncing' : 'offline'
        });

        if (isOnline) {
          // Trigger sync when reconnected
          get().syncOfflineQueue();
        }
      },

      // Add to offline sync queue
      addToSyncQueue: (action, entityType, payload) => {
        const { syncQueue } = get();

        const queueItem = {
          id: `${Date.now()}_${Math.random()}`,
          action,
          entityType,
          payload,
          timestamp: Date.now()
        };

        set({
          syncQueue: [...syncQueue, queueItem],
          hasUnsyncedChanges: true
        });
      },

      // Process offline sync queue
      syncOfflineQueue: async () => {
        const { syncQueue, ws, deviceId, sessionId } = get();

        if (syncQueue.length === 0) {
          set({ hasUnsyncedChanges: false });
          return;
        }

        if (!ws || ws.readyState !== WebSocket.OPEN) {
          console.warn('WebSocket not connected, cannot sync queue');
          return;
        }

        set({ syncStatus: 'syncing' });

        try {
          ws.send(JSON.stringify({
            type: 'OFFLINE_QUEUE_SYNC',
            queue: syncQueue,
            timestamp: Date.now()
          }));

          // Clear queue after sending (server will send ACK)
          set({
            syncQueue: [],
            hasUnsyncedChanges: false,
            lastSyncTime: Date.now()
          });
        } catch (error) {
          console.error('Error syncing offline queue:', error);
          set({ syncStatus: 'error', connectionError: error.message });
        }
      },

      // Request full sync from server
      requestFullSync: () => {
        const { ws } = get();

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'SYNC_REQUEST',
            timestamp: Date.now()
          }));
        }
      },

      // Send heartbeat
      sendHeartbeat: () => {
        const { ws, networkType, batteryLevel } = get();

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'HEARTBEAT',
            networkType,
            batteryLevel,
            timestamp: Date.now()
          }));
        }
      },

      // Handle incoming WebSocket messages
      handleWebSocketMessage: (message) => {
        const { type, ...data } = message;

        switch (type) {
          case 'CONNECTED':
            set({ isConnected: true, syncStatus: 'synced' });
            // Request full sync after connection
            setTimeout(() => get().requestFullSync(), 500);
            break;

          case 'FULL_SYNC':
            set({
              sessionState: data.data.state || get().sessionState,
              connectedDevices: data.data.connectedDevices || [],
              syncStatus: 'synced',
              lastSyncTime: Date.now()
            });
            break;

          case 'STATE_CHANGED':
            // Merge remote state (prefer remote if version is newer)
            if (data.state.version > get().sessionState.version) {
              set({ sessionState: data.state });
            }
            break;

          case 'ANSWER_STREAM':
            set(state => ({
              sessionState: {
                ...state.sessionState,
                currentAnswer: state.sessionState.currentAnswer + data.chunk,
                isStreaming: true
              }
            }));
            break;

          case 'ANSWER_COMPLETE':
            set(state => ({
              sessionState: {
                ...state.sessionState,
                currentAnswer: data.answer,
                isStreaming: false
              }
            }));
            break;

          case 'DEVICE_JOINED':
            set(state => ({
              connectedDevices: [...state.connectedDevices, {
                deviceId: data.deviceId,
                deviceType: data.deviceType,
                deviceName: data.deviceName,
                joinedAt: data.timestamp
              }]
            }));
            break;

          case 'DEVICE_LEFT':
            set(state => ({
              connectedDevices: state.connectedDevices.filter(
                d => d.deviceId !== data.deviceId
              )
            }));
            break;

          case 'SYNC_REQUIRED':
            console.log('Server requesting sync:', data.reason);
            get().requestFullSync();
            break;

          case 'OFFLINE_QUEUE_ACK':
            console.log('Offline queue synced:', data.results);
            break;

          case 'HEARTBEAT_ACK':
            // Keep alive
            break;

          case 'ERROR':
            console.error('WebSocket error:', data.error);
            set({ syncStatus: 'error', connectionError: data.error });
            break;

          default:
            console.warn('Unknown WebSocket message type:', type);
        }
      },

      // Set WebSocket instance
      setWebSocket: (ws) => {
        set({ ws });
        get().wsRetries = 0;
      },

      // Clear error
      clearError: () => {
        set({ connectionError: null, syncStatus: 'idle' });
      },

      // Reset store
      resetStore: () => {
        set({
          sessionId: null,
          deviceId: null,
          deviceType: null,
          userId: null,
          isConnected: false,
          syncStatus: 'idle',
          sessionState: {
            currentQuestion: '',
            currentAnswer: '',
            isStreaming: false,
            isRecording: false,
            isAnswerHidden: false,
            floatingPosition: { x: 50, y: 50 },
            floatingSize: { width: 400, height: 300 },
            floatingCollapsed: false,
            mobileViewMode: 'full_screen',
            version: 0
          },
          connectedDevices: [],
          syncQueue: [],
          hasUnsyncedChanges: false,
          ws: null,
          connectionError: null
        });
      }
    }),
    {
      name: 'session-sync-store',
      storage: createJSONStorage(() => {
        // Use different storage based on platform
        if (typeof window !== 'undefined' && window.Capacitor) {
          // Mobile app
          return {
            getItem: async (key) => {
              try {
                const value = await window.Capacitor.Storage.get({ key });
                return value?.value || null;
              } catch (error) {
                console.error('Error reading from Capacitor storage:', error);
                return null;
              }
            },
            setItem: async (key, value) => {
              try {
                await window.Capacitor.Storage.set({ key, value });
              } catch (error) {
                console.error('Error writing to Capacitor storage:', error);
              }
            },
            removeItem: async (key) => {
              try {
                await window.Capacitor.Storage.remove({ key });
              } catch (error) {
                console.error('Error removing from Capacitor storage:', error);
              }
            }
          };
        } else {
          // Web app - use localStorage
          return localStorage;
        }
      }),
      partialize: (state) => ({
        sessionId: state.sessionId,
        deviceId: state.deviceId,
        deviceType: state.deviceType,
        userId: state.userId,
        sessionState: state.sessionState,
        syncQueue: state.syncQueue,
        isOnline: state.isOnline
      })
    }
  )
);

export default useSessionSyncStore;
