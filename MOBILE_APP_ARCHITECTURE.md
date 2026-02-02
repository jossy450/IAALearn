# Mobile App Architecture: Android & iOS Interview Assistant

## Overview
Seamless cross-platform native mobile apps (Android & iOS) using Capacitor for web-based code sharing with native plugins. Enables uninterrupted interview sessions with session continuity, real-time synchronization, and offline capabilities.

## Architecture Decision

### Technology Stack
- **Framework**: Capacitor (JavaScript/React → Native)
- **UI Framework**: React (shared code base)
- **State Management**: Zustand (with persistence)
- **Real-time Sync**: WebSocket + REST API fallback
- **Offline Support**: SQLite (via Capacitor SQLite)
- **Local Storage**: Capacitor Storage + IndexedDB
- **Battery/Network**: Capacitor Network & Battery Status
- **Audio**: Capacitor Audio Recorder
- **Background Tasks**: Capacitor Background Tasks
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **App ID**: `com.interviewassistant.app`

### Why Capacitor?
- ✅ Single React codebase for web, iOS, and Android
- ✅ Direct access to native APIs (camera, microphone, battery)
- ✅ Existing Capacitor setup already in project
- ✅ Simple deployment: `npm run android:run` / `npm run ios:run`
- ✅ Can wrap existing web app with minimal changes
- ✅ OTA updates possible (no App Store submission for web changes)

## Session Continuity Architecture

### Problem Statement
User starts interview on desktop → Network drops → Switches to mobile → 
Must continue session WITHOUT losing: answers, questions, state, auth

### Solution: Distributed Session State

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloud Backend                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL                                            │ │
│  │  ├─ interview_sessions (main session)                 │ │
│  │  ├─ questions (Q&A history)                           │ │
│  │  ├─ session_state (real-time state)                   │ │
│  │  ├─ device_sessions (device tracking)                 │ │
│  │  └─ sync_queue (offline changes)                      │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Redis Cache                                           │ │
│  │  ├─ session:{id} (active sessions)                    │ │
│  │  ├─ device_sync:{id} (device state)                   │ │
│  │  └─ locks:{id} (concurrency control)                  │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  WebSocket Server                                      │ │
│  │  ├─ Real-time answer streaming                        │ │
│  │  ├─ Device synchronization                            │ │
│  │  ├─ State change broadcasts                           │ │
│  │  └─ Heartbeat monitoring                              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
              ↓ WebSocket / REST API ↓
┌─────────────────────────────────────────────────────────────┐
│              Device Layer (Shared React Code)               │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐  ┌────────────────────────┐    │
│  │  Desktop/Web           │  │  Android/iOS           │    │
│  │  ├─ localStorage       │  │  ├─ SQLite DB          │    │
│  │  ├─ IndexedDB          │  │  ├─ Capacitor Storage  │    │
│  │  └─ SessionStorage     │  │  ├─ SharedPreferences  │    │
│  │                        │  │  └─ Keychain (iOS)     │    │
│  └────────────────────────┘  └────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐  ┌────────────────────────┐    │
│  │  React State (Zustand) │←→│  React State (Zustand) │    │
│  │  ├─ sessionState       │  │  ├─ sessionState       │    │
│  │  ├─ answers            │  │  ├─ answers            │    │
│  │  ├─ syncQueue          │  │  ├─ syncQueue          │    │
│  │  └─ deviceInfo         │  │  └─ deviceInfo         │    │
│  └────────────────────────┘  └────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema Extensions

### New Tables Required

#### 1. `device_sessions` - Track devices accessing session
```sql
CREATE TABLE device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  session_id UUID NOT NULL REFERENCES interview_sessions(id),
  device_id VARCHAR NOT NULL,  -- Unique device identifier
  device_name VARCHAR,          -- "iPhone 15", "Samsung S24"
  device_type VARCHAR CHECK (device_type IN ('web', 'android', 'ios')),
  app_version VARCHAR,
  os_version VARCHAR,
  connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_heartbeat TIMESTAMP DEFAULT NOW(),
  disconnected_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  network_type VARCHAR,         -- 'wifi', '4g', '5g', etc
  battery_level INT,
  screen_size VARCHAR,          -- "6.5-inch" for responsive design
  capabilities JSONB DEFAULT '{}', -- microphone, camera, etc
  CONSTRAINT unique_device_session UNIQUE(session_id, device_id)
);
```

#### 2. `session_state` - Real-time session state
```sql
CREATE TABLE session_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES interview_sessions(id),
  current_question TEXT,
  current_answer TEXT,
  is_streaming BOOLEAN DEFAULT false,
  is_recording BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  floating_position JSONB,      -- {x, y} for floating widget
  mobile_view_mode VARCHAR,     -- 'full_screen', 'minimized'
  last_updated_at TIMESTAMP DEFAULT NOW(),
  last_updated_by UUID REFERENCES users(id),
  version INT DEFAULT 0         -- For optimistic locking
);
```

#### 3. `sync_queue` - Offline changes queue
```sql
CREATE TABLE sync_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  session_id UUID NOT NULL REFERENCES interview_sessions(id),
  device_id VARCHAR NOT NULL,
  action VARCHAR NOT NULL,      -- 'create', 'update', 'delete'
  entity_type VARCHAR NOT NULL, -- 'answer', 'question', 'state'
  entity_id UUID,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  CONSTRAINT max_retries CHECK (retry_count < 5)
);
```

#### 4. `device_capabilities` - Track device features
```sql
CREATE TABLE device_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR NOT NULL UNIQUE,
  has_microphone BOOLEAN DEFAULT true,
  has_camera BOOLEAN DEFAULT true,
  has_speaker BOOLEAN DEFAULT true,
  has_file_system BOOLEAN DEFAULT true,
  supports_background_tasks BOOLEAN DEFAULT false,
  supports_push_notifications BOOLEAN DEFAULT false,
  offline_storage_mb INT DEFAULT 100,
  sync_interval_ms INT DEFAULT 1500,
  battery_saver_mode BOOLEAN DEFAULT false
);
```

## Real-time Synchronization Flow

### Scenario: Desktop → Mobile Switch (Mid-Interview)

```
Time 0: User on Desktop (localhost:5173/session/123)
├─ Asking question, recording audio
├─ Answer streaming to floating widget
├─ State stored in localStorage + server
└─ Session ID: 123

Time 5: Network drops on desktop
├─ App detects no connection
├─ UI shows "Offline - syncing when available"
├─ Local state cached in SQLite
├─ Question/answer continues locally
└─ Retry connection every 3 seconds

Time 10: User opens mobile app (iOS)
├─ App boots → Checks for active session
├─ Requests: GET /api/sessions/active
│  └─ Response: session 123 is active on desktop
├─ Shows: "Continue on Mobile?" button
└─ User clicks "Continue"

Time 12: Mobile app takes over (iaalearn-cloud.fly.dev/mobile/123)
├─ Step 1: Establish device session
│  ├─ POST /api/device-sessions/register
│  ├─ Payload: {sessionId, deviceId, deviceType: 'ios', ...}
│  └─ Response: device registered, token issued
│
├─ Step 2: Sync session state
│  ├─ GET /api/sessions/123/state
│  ├─ Response: full session state + all answers
│  └─ Zustand store updated
│
├─ Step 3: Connect WebSocket
│  ├─ WS /api/sync/123
│  ├─ Message: {action: 'device_joined', deviceType: 'ios'}
│  └─ Server broadcasts to desktop (if reconnects)
│
├─ Step 4: Load cached data
│  ├─ SQLite query: SELECT * FROM questions WHERE session_id = 123
│  ├─ IndexedDB query: session_state:123
│  └─ Merge with cloud data (cloud version wins)
│
└─ Step 5: Mobile view ready
   ├─ Display current question
   ├─ Display current answer
   ├─ Enable recording/transcription
   └─ Real-time polling for updates

Time 15: User sees the answer on mobile
├─ Answer text auto-populated from cloud
├─ Floating position synced if user moved it
├─ Can hide/reveal, copy, navigate
└─ All actions broadcasted to any connected devices

Time 20: Desktop reconnects
├─ Desktop: "You were offline. Sync now?"
├─ POST /api/device-sessions/sync
├─ Server: "Mobile has taken over session"
├─ Options: 
│  A) Continue on mobile (disconnect desktop)
│  B) Take back to desktop (sync all changes)
│  C) Dual view (both devices synced)
```

## API Endpoints Required

### Session Management
```
POST   /api/sessions                    # Create session
GET    /api/sessions/:id                # Get session
GET    /api/sessions/active             # List active sessions
PUT    /api/sessions/:id                # Update session
GET    /api/sessions/:id/state          # Get real-time state
PUT    /api/sessions/:id/state          # Update state
DELETE /api/sessions/:id                # End session
```

### Device Management
```
POST   /api/device-sessions/register    # Register device
GET    /api/device-sessions/:sessionId  # List devices on session
POST   /api/device-sessions/heartbeat   # Send heartbeat
POST   /api/device-sessions/disconnect  # Disconnect device
GET    /api/device-sessions/:id/sync    # Get sync data
```

### Synchronization
```
POST   /api/sync/queue/push             # Add to offline queue
POST   /api/sync/queue/flush            # Sync all queued items
GET    /api/sync/queue/status           # Get queue status
POST   /api/sync/:sessionId/pull        # Pull latest changes
POST   /api/sync/:sessionId/push        # Push local changes
```

### Answer Streaming (WebSocket)
```
WS /api/ws/session/:sessionId
├─ Events:
│  ├─ ANSWER_STREAM (answer text chunk)
│  ├─ ANSWER_COMPLETE (full answer done)
│  ├─ QUESTION_ASKED (new question)
│  ├─ STATE_CHANGED (session state update)
│  ├─ DEVICE_JOINED (device connected)
│  ├─ DEVICE_LEFT (device disconnected)
│  ├─ SYNC_REQUIRED (force sync)
│  └─ HEARTBEAT (ping/pong)
```

## Client-Side Implementation

### 1. Enhanced Zustand Store (Persistent)
```typescript
// client/src/store/sessionStore.ts

interface SessionState {
  sessionId: string;
  deviceId: string;
  deviceType: 'web' | 'android' | 'ios';
  currentQuestion: string;
  currentAnswer: string;
  isStreaming: boolean;
  isRecording: boolean;
  isHidden: boolean;
  
  // Sync metadata
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncTime: number;
  syncQueue: SyncItem[];
  
  // Device tracking
  connectedDevices: DeviceSession[];
  networkType: string;
  isOnline: boolean;
  
  // Actions
  setSessionState: (update) => void;
  addToSyncQueue: (item) => void;
  syncNow: () => Promise<void>;
  registerDevice: () => Promise<void>;
  connectWebSocket: () => void;
}

// With persistence:
export const useSessionStore = create<SessionState>(
  persist(
    (set, get) => ({...}),
    {
      name: 'session-store',
      storage: createJSONStorage(() => ({
        getItem: async (key) => {
          // Use Capacitor Storage for mobile
          // Use localStorage for web
        },
        setItem: async (key, value) => {...},
        removeItem: async (key) => {...},
      }))
    }
  )
);
```

### 2. Offline Queue Manager
```typescript
// client/src/services/offlineQueue.ts

class OfflineQueueManager {
  async addToQueue(action: string, payload: any) {
    // If online: execute immediately
    // If offline: store in SQLite
    if (navigator.onLine) {
      return this.execute(action, payload);
    } else {
      return this.store(action, payload);
    }
  }
  
  async syncWhenOnline() {
    // Listen for online event
    window.addEventListener('online', async () => {
      const queue = await this.getQueue();
      for (const item of queue) {
        try {
          await this.execute(item.action, item.payload);
          await this.removeFromQueue(item.id);
        } catch (error) {
          // Keep in queue for retry
        }
      }
    });
  }
  
  private async store(action: string, payload: any) {
    // Store in Capacitor Storage or SQLite
    // Return: {id, queued: true, willSyncAt: ...}
  }
  
  private async execute(action: string, payload: any) {
    // Call API endpoint
    // Update Zustand store
  }
}
```

### 3. WebSocket Connection Manager
```typescript
// client/src/services/websocketManager.ts

class WebSocketManager {
  private ws: WebSocket;
  private messageQueue: Message[] = [];
  
  connect(sessionId: string, deviceId: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/api/ws/session/${sessionId}`;
    
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      this.send({type: 'DEVICE_JOINED', deviceId, deviceType: this.getDeviceType()});
      this.flushMessageQueue();
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.reconnectWithBackoff();
    };
  }
  
  private handleMessage(data: any) {
    switch(data.type) {
      case 'ANSWER_STREAM':
        // Stream answer to floating widget
        useSessionStore.setState({currentAnswer: data.text});
        break;
      case 'STATE_CHANGED':
        // Merge state from server
        useSessionStore.setState(data.state);
        break;
      case 'DEVICE_JOINED':
        // Another device connected
        useSessionStore.setState({connectedDevices: data.devices});
        break;
    }
  }
  
  private reconnectWithBackoff() {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
  }
}
```

### 4. Device Battery/Network Monitoring
```typescript
// client/src/services/deviceMonitor.ts

class DeviceMonitor {
  async init() {
    // Monitor network status
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
    
    // Monitor battery level (Capacitor)
    Battery.getBatteryInfo().then(info => {
      useSessionStore.setState({batteryLevel: info.level});
    });
    
    // Monitor network type (Capacitor)
    Network.getStatus().then(status => {
      useSessionStore.setState({networkType: status.type});
    });
  }
  
  private onOnline = async () => {
    useSessionStore.setState({isOnline: true, syncStatus: 'syncing'});
    await new OfflineQueueManager().syncWhenOnline();
    useSessionStore.setState({syncStatus: 'synced'});
  };
  
  private onOffline = () => {
    useSessionStore.setState({isOnline: false, syncStatus: 'offline'});
  };
}
```

## Server-Side Implementation

### 1. Device Session Middleware
```javascript
// server/middleware/deviceSession.js

const deviceSessionMiddleware = async (req, res, next) => {
  const deviceId = req.headers['x-device-id'];
  const sessionId = req.params.sessionId || req.body.sessionId;
  
  if (!deviceId || !sessionId) {
    return res.status(400).json({error: 'Missing device tracking info'});
  }
  
  // Register/update device session
  await query(`
    INSERT INTO device_sessions (user_id, session_id, device_id, device_type)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (session_id, device_id) DO UPDATE
    SET last_heartbeat = NOW();
  `, [req.user.id, sessionId, deviceId, req.headers['x-device-type']]);
  
  req.deviceId = deviceId;
  next();
};
```

### 2. Real-time State Synchronization
```javascript
// server/services/sessionSync.js

class SessionSyncManager {
  async broadcastStateChange(sessionId, newState, sourceDeviceId) {
    // Update session_state table
    await query(`
      UPDATE session_state 
      SET current_answer = $1, version = version + 1
      WHERE session_id = $2
    `, [newState.currentAnswer, sessionId]);
    
    // Broadcast to all connected devices via WebSocket
    this.broadcastToSession(sessionId, {
      type: 'STATE_CHANGED',
      state: newState,
      sourceDevice: sourceDeviceId,
      timestamp: Date.now()
    });
  }
  
  async syncOfflineQueue(userId, sessionId, deviceId, queue) {
    // Process sync queue from mobile device
    for (const item of queue) {
      try {
        // Validate against server state (prevent conflicts)
        if (this.canApply(item)) {
          await this.applyChange(item);
          await this.ackQueueItem(deviceId, item.id);
        }
      } catch (error) {
        await this.nackQueueItem(deviceId, item.id, error.message);
      }
    }
  }
}
```

### 3. WebSocket Handler
```javascript
// server/websocket/sessionHandler.js

const handleSessionWebSocket = (ws, req) => {
  const sessionId = req.params.sessionId;
  const deviceId = req.headers['x-device-id'];
  
  activeConnections.set(`${sessionId}:${deviceId}`, ws);
  
  ws.on('message', async (data) => {
    const message = JSON.parse(data);
    
    if (message.type === 'ANSWER_STREAM') {
      // Broadcast to all devices on session
      broadcastToSession(sessionId, message, deviceId);
      
      // Update server state
      await updateSessionState(sessionId, {currentAnswer: message.text});
    }
  });
  
  ws.on('close', () => {
    activeConnections.delete(`${sessionId}:${deviceId}`);
    broadcastToSession(sessionId, {type: 'DEVICE_LEFT', deviceId});
  });
};

const broadcastToSession = (sessionId, message, sourceDeviceId) => {
  for (const [key, ws] of activeConnections) {
    if (key.startsWith(`${sessionId}:`)) {
      const deviceId = key.split(':')[1];
      if (deviceId !== sourceDeviceId) {
        ws.send(JSON.stringify(message));
      }
    }
  }
};
```

## Build & Deployment

### Building Native Apps

#### Android
```bash
# Generate Android project
npm run android:init

# Build and run on emulator
npm run android:run

# Build APK/AAB for Play Store
cd client
npx cap build android --keystorepath=release.keystore

# Or
cd android && ./gradlew bundleRelease
```

#### iOS
```bash
# Generate iOS project
npm run ios:init

# Build and run on simulator
npm run ios:run

# Build for App Store
cd ios
xcodebuild -scheme InterviewAssistant -configuration Release archive
```

### Capacitor Configuration
```json
// capacitor.config.json
{
  "appId": "com.interviewassistant.app",
  "appName": "Interview Assistant",
  "webDir": "dist",
  "plugins": {
    "CapacitorHttp": {
      "enabled": true
    },
    "CapacitorSQLite": {
      "iosDatabaseLocation": "Documents"
    },
    "FCM": {
      "senderId": "YOUR_FCM_SENDER_ID"
    }
  }
}
```

## Testing Strategy

### Unit Tests
- Offline queue manager (store/retrieve/sync)
- WebSocket reconnection logic
- State merging (conflict resolution)
- Device detection

### Integration Tests
- Desktop → Mobile session transfer
- Real-time answer streaming across devices
- Offline queue sync when reconnecting
- Multiple devices on same session

### E2E Tests
- Full interview flow on Android emulator
- Full interview flow on iOS simulator
- Network interruption handling
- Battery saver mode impact

## Rollout Plan

### Phase 1: Internal Testing (Week 1-2)
- [ ] Build and test on Android emulator
- [ ] Build and test on iOS simulator
- [ ] Test session continuity locally
- [ ] Test offline scenarios

### Phase 2: Beta Release (Week 3-4)
- [ ] Deploy to Firebase App Distribution (Android)
- [ ] Deploy to TestFlight (iOS)
- [ ] Invite 50 beta testers
- [ ] Collect feedback and iterate

### Phase 3: Production Release (Week 5+)
- [ ] Play Store submission (Android)
- [ ] App Store submission (iOS)
- [ ] Announce in changelog
- [ ] Monitor crash rates and analytics

## Security Considerations

1. **Token Management**: 
   - Store JWT in Capacitor SecureStorage
   - Auto-refresh before expiry
   - Invalidate on logout

2. **Device Registration**:
   - Unique device ID (UDID/Android ID)
   - Device fingerprinting for fraud detection
   - Allow max 3 devices per user

3. **Encryption**:
   - All WebSocket messages signed with HMAC
   - Sensitive data encrypted at rest (SQLite)
   - HTTPS/WSS only (no mixed content)

4. **Rate Limiting**:
   - Sync queue flush: max 10 req/sec per device
   - WebSocket messages: max 100/min per connection
   - API: standard rate limits apply

## Performance Optimization

1. **Bundle Size**: Tree-shake unused code, lazy load routes
2. **Network**: Delta sync (only changed fields), gzip compression
3. **Storage**: Expire old offline queue items after 7 days
4. **Battery**: Adjust sync interval based on battery level
5. **Memory**: Unload inactive sessions, limit offline queue to 1000 items

## Monitoring & Analytics

- App crashes (Firebase Crashlytics)
- Session transfer success rate
- Average offline sync time
- Device types and OS versions
- Network type distribution
- Battery usage metrics
