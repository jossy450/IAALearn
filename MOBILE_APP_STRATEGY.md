# Mobile App Strategy: Complete Design Document

## Executive Summary

We've designed a comprehensive mobile app strategy for **Android** and **iOS** that enables seamless interview session continuation WITHOUT any breakage. Users can start on desktop and continue on mobile (or vice versa) with complete state synchronization, offline support, and real-time answer streaming.

### Key Features
✅ **Native Apps** via Capacitor (single React codebase)
✅ **Real-time Sync** across web, Android, iOS
✅ **Offline Support** with automatic queue
✅ **Session Continuity** - switch devices mid-interview
✅ **WebSocket** for real-time answer streaming
✅ **No Data Loss** - all changes synced when online
✅ **Battery Optimized** - adaptive sync intervals
✅ **Security** - device fingerprinting, token refresh

---

## Architecture Overview

### Technology Stack
```
┌─────────────────────────────────────────────────┐
│  Frontend (Shared React Codebase)              │
│  ├─ Web: React + Vite (localhost:5173)        │
│  ├─ iOS: Capacitor wrapper (App Store)         │
│  └─ Android: Capacitor wrapper (Play Store)    │
└────────────────┬────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
 REST API   WebSocket   REST API
  (/api)     (/ws)       (/api)
    │            │            │
    └────────────┴────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Backend (Node.js + Express + WebSocket)      │
│  ├─ Session Sync Manager (new service)        │
│  ├─ WebSocket Handler (real-time)             │
│  └─ Offline Queue Processor (batch sync)      │
└────────────────┬────────────────────────────────┘
                 │
        ┌────────┴─────────┐
        │                  │
        ▼                  ▼
    PostgreSQL          Redis (optional)
    (Persistent)        (Session cache)
```

### Why Capacitor?
| Aspect | Benefit |
|--------|---------|
| **Single Codebase** | Write React once, runs everywhere |
| **Native Access** | Direct API for camera, microphone, battery |
| **Easy Deployment** | Scripts: `npm run android:run` / `npm run ios:run` |
| **Existing Setup** | Project already has `capacitor.config.json` |
| **Plugin Ecosystem** | Pre-built for storage, notifications, etc |

---

## Session Continuity Architecture

### The Challenge
```
Desktop: Question asked → Answer streaming → Mobile app opens
         ↓
         WHAT HAPPENS TO THE ANSWER?
```

### The Solution: Real-time Sync Layer

```
Device A (Desktop)                  Device B (Mobile)
┌──────────────────┐               ┌──────────────────┐
│ React App        │ ──WebSocket──→│ React App        │
│ Zustand Store    │←─────────────│ Zustand Store    │
│ localStorage     │   Broadcast   │ SQLite + Storage │
└──────────────────┘               └──────────────────┘
         ↓                                ↑
    REST API                         REST API
         │                                │
         └────────────┬────────────────────┘
                      │
              PostgreSQL Database
              (session_state table)
```

### Device Session Flow

```
Time 0: Desktop Interview Active
├─ session_id: 123
├─ device_id: desktop-uuid
├─ State stored in: session_state table
└─ WebSocket connected: WS /api/ws/session/123:desktop-uuid

Time 5: Mobile App Opens
├─ Detects active session 123
├─ Registers device: POST /api/device-sessions/register
│  └─ Response: {deviceId, token, status: 'registered'}
├─ Joins WebSocket: WS /api/ws/session/123:mobile-uuid
└─ Requests full sync: Message {type: 'SYNC_REQUEST'}

Time 7: Mobile Receives Full State
├─ All questions answered so far
├─ Current answer being streamed
├─ Floating position, hide state, etc
├─ All synced to mobile SQLite
└─ Zustand store populated

Time 10: User Sees Answer on Mobile
├─ Real-time updates from desktop
├─ If desktop answers new question → Mobile shows it
├─ If mobile goes offline → Local queue stores changes
├─ When back online → Changes synced to server
└─ Desktop updates show mobile's changes too

Time 15: Both Devices in Perfect Sync
├─ Desktop sees answers asked on mobile
├─ Mobile sees real-time streaming from desktop
├─ Both show same UI state (position, hidden, etc)
└─ No data loss, no conflicts
```

---

## Database Schema (New Tables)

### 1. device_sessions
**Purpose**: Track which devices are connected to each session

```sql
CREATE TABLE device_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  device_id VARCHAR(255) NOT NULL,        -- Unique device identifier
  device_type VARCHAR(32),                 -- 'web', 'android', 'ios'
  device_name VARCHAR(255),                -- "iPhone 15", "Samsung S24"
  app_version VARCHAR(32),                 -- "2.7.1"
  os_version VARCHAR(32),                  -- "iOS 17.2"
  connected_at TIMESTAMP NOT NULL,
  last_heartbeat TIMESTAMP,
  disconnected_at TIMESTAMP,
  is_active BOOLEAN,
  network_type VARCHAR(32),                -- 'wifi', '4g', '5g'
  battery_level INT,                       -- 0-100
  capabilities JSONB,                      -- {microphone, camera, ...}
  UNIQUE(session_id, device_id)           -- One device per session (initially)
);
```

**Key Points**:
- One row per device per session
- `is_active = false` when device disconnects (history retained)
- `last_heartbeat` updates every 30 seconds
- `capabilities` tracks device features

### 2. session_state
**Purpose**: Real-time state shared across all devices

```sql
CREATE TABLE session_state (
  id UUID PRIMARY KEY,
  session_id UUID UNIQUE NOT NULL,        -- One row per session
  current_question_text TEXT,
  current_answer_text TEXT,
  is_streaming BOOLEAN,
  is_recording BOOLEAN,
  is_answer_hidden BOOLEAN,
  floating_position JSONB,                 -- {x: 50, y: 50}
  floating_size JSONB,                     -- {width: 400, height: 300}
  floating_collapsed BOOLEAN,
  mobile_view_mode VARCHAR,                -- 'full_screen', 'minimized'
  version INT,                             -- For optimistic locking
  last_updated_at TIMESTAMP,
  last_updated_from_device VARCHAR        -- Which device made the change
);
```

**Key Points**:
- Single row per session (like a session summary)
- `version` increments with each change (detects conflicts)
- If device A and B both try to update: version check prevents overwrite
- Mobile and desktop always see same state

### 3. sync_queue
**Purpose**: Store offline changes while device is disconnected

```sql
CREATE TABLE sync_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  action VARCHAR(32),                      -- 'create', 'update', 'delete'
  entity_type VARCHAR(32),                 -- 'answer', 'question', 'state'
  payload JSONB NOT NULL,                  -- The actual change
  created_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP,                     -- NULL = pending, has timestamp = done
  retry_count INT,                         -- Retry counter
  sequence_number INT                      -- Maintains order
);
```

**Key Points**:
- Added to locally when device offline
- Processed in order (sequence_number)
- Retried up to 5 times
- Cleared after successful sync

---

## Real-time Synchronization

### WebSocket Messages

#### From Client (Mobile → Server → Desktop)
```javascript
// 1. User hides/reveals answer on mobile
{
  type: 'STATE_CHANGED',
  updates: { isAnswerHidden: true },
  timestamp: 1707...
}

// 2. Server broadcasts to all devices
// Desktop app receives and updates Zustand store

// 3. User moves floating widget on desktop
{
  type: 'STATE_CHANGED',
  updates: { 
    floatingPosition: { x: 200, y: 150 }
  },
  timestamp: 1707...
}

// 4. Mobile app receives and updates floating position
```

#### Answer Streaming
```javascript
// Desktop: Answer from AI starts streaming
{
  type: 'ANSWER_STREAM',
  chunk: 'This is a great question...',
  chunkIndex: 0,
  totalChunks: 15
}

// Mobile receives chunk → appends to current answer
// Shows real-time streaming in large text

{
  type: 'ANSWER_STREAM',
  chunk: 'because the company values...',
  chunkIndex: 1,
  totalChunks: 15
}

// ... more chunks ...

// Final message
{
  type: 'ANSWER_COMPLETE',
  answer: 'This is a great question because...',
  timestamp: 1707...
}
```

### Offline Queue Processing
```javascript
// Mobile goes offline
// Local changes stored in sync_queue:
[
  {
    id: 1,
    action: 'update',
    entity_type: 'state',
    payload: { isAnswerHidden: true },
    synced_at: null  // Pending
  },
  {
    id: 2,
    action: 'create',
    entity_type: 'answer',
    payload: { questionText: 'Why?', responseTime: 3000 },
    synced_at: null  // Pending
  }
]

// Mobile reconnects
// Send: { type: 'OFFLINE_QUEUE_SYNC', queue: [...] }
// Server processes each item
// Response: { type: 'OFFLINE_QUEUE_ACK', results: [...] }
// Mobile clears queue (synced_at set on server)
// Desktop receives full sync broadcast
```

---

## Implementation Timeline

### Phase 1: Infrastructure (1-2 weeks)
✅ **Completed**
- Database migrations (device_sessions, session_state, sync_queue)
- SessionSyncManager service
- WebSocket handler
- Client-side sync store

📋 **To Do**:
1. Create API endpoints for device registration
2. Connect WebSocket to main server
3. Implement heartbeat mechanism
4. Test with manual WebSocket client

### Phase 2: Mobile UI (2-3 weeks)
- Create responsive mobile session view
- Implement large answer display
- Add device status indicator
- Add offline indicator
- Create device switcher dialog

### Phase 3: Integration (2-3 weeks)
- Connect React components to sync store
- Implement streaming answer display
- Handle network changes
- Battery level optimization
- Offline queue persistence

### Phase 4: Testing & Build (2 weeks)
- Unit tests for sync logic
- E2E tests for device switching
- Android emulator testing
- iOS simulator testing
- Beta release via TestFlight/Firebase

### Phase 5: Production (1 week)
- Play Store submission (Android)
- App Store submission (iOS)
- Launch announcement
- Monitor crash rates

---

## API Endpoints (To be implemented)

### Device Management
```
POST /api/device-sessions/register
├─ Body: {sessionId, deviceId, deviceType, ...}
└─ Response: {deviceId, token, status}

GET /api/device-sessions/:sessionId
├─ Response: [{deviceId, deviceType, isActive, ...}]
└─ Lists all devices on session

POST /api/device-sessions/:sessionId/heartbeat
└─ Keep-alive ping (every 30 seconds)

POST /api/device-sessions/disconnect
└─ Mark device as inactive
```

### Session State
```
GET /api/sessions/:id/state
├─ Response: Full session state
└─ Used for initial sync

PUT /api/sessions/:id/state
├─ Body: State updates
└─ Updates session_state table

GET /api/sessions/:id/state/sync
└─ Returns: all Q&A, metadata, device list
```

### Offline Sync
```
POST /api/sync/queue/flush
├─ Body: {queue: [{...}, {...}]}
└─ Process offline queue items

GET /api/sync/queue/status
└─ Response: {pending: 5, synced: 100}
```

### WebSocket
```
WS /api/ws/session/:sessionId
├─ Headers: Authorization, X-Device-ID, X-Device-Type
├─ Client → Server Messages:
│  ├─ ANSWER_STREAM {chunk, chunkIndex}
│  ├─ STATE_CHANGED {updates}
│  ├─ SYNC_REQUEST {}
│  ├─ HEARTBEAT {networkType, batteryLevel}
│  └─ OFFLINE_QUEUE_SYNC {queue}
├─ Server → Client Messages:
│  ├─ CONNECTED {deviceId, token}
│  ├─ ANSWER_STREAM {chunk}
│  ├─ FULL_SYNC {state, questions, devices}
│  ├─ DEVICE_JOINED {deviceId, deviceType}
│  ├─ DEVICE_LEFT {deviceId}
│  └─ SYNC_REQUIRED {reason}
└─ Auto-reconnect with exponential backoff
```

---

## Client-Side Zustand Store

### `useSessionSyncStore`

```javascript
const {
  // Session info
  sessionId,
  deviceId,
  deviceType,        // 'web', 'android', 'ios'
  
  // Connection
  isConnected,
  syncStatus,        // 'idle', 'syncing', 'offline', 'error'
  
  // Session state
  sessionState: {
    currentQuestion,
    currentAnswer,
    isStreaming,
    isRecording,
    isAnswerHidden,
    floatingPosition,
    floatingCollapsed,
    mobileViewMode
  },
  
  // Devices
  connectedDevices,  // Other devices on session
  
  // Network
  isOnline,
  networkType,
  batteryLevel,
  
  // Sync queue
  syncQueue,
  hasUnsyncedChanges,
  
  // Actions
  updateSessionState,
  streamAnswerChunk,
  completeAnswerStream,
  syncOfflineQueue,
  requestFullSync,
  sendHeartbeat,
  handleWebSocketMessage
} = useSessionSyncStore();
```

### Usage Example
```javascript
function InterviewSession() {
  const { 
    updateSessionState, 
    isOnline, 
    syncStatus 
  } = useSessionSyncStore();
  
  const hideAnswer = () => {
    updateSessionState({
      isAnswerHidden: true
    });
    // Automatically:
    // 1. If online → Send via WebSocket
    // 2. If offline → Store in sync_queue + SQLite
  };
  
  return (
    <div>
      {syncStatus === 'offline' && <OfflineIndicator />}
      <button onClick={hideAnswer}>Hide Answer</button>
    </div>
  );
}
```

---

## Offline Support Strategy

### Client-Side Offline Detection
```javascript
// Detect network status
window.addEventListener('online', () => {
  store.setOnlineStatus(true);
  // Trigger sync
});

window.addEventListener('offline', () => {
  store.setOnlineStatus(false);
  // Stop sync attempts
});

// Capacitor for mobile
Network.addListener('networkStatusChange', (status) => {
  store.setNetworkInfo(status.type, status.connected);
});
```

### Offline Queue Storage
```
Mobile Device:
├─ Zustand store (in-memory)
├─ SQLite database (persistent)
├─ Capacitor Storage (key-value)
└─ IndexedDB (fallback web)

Queue Processing:
1. User updates state → Store in Zustand + SQLite
2. If online → Send immediately via WebSocket
3. If offline → Keep in queue, show "Offline" indicator
4. When online → Send all pending items in order
5. If error → Show "Sync failed, will retry"
6. Max retries: 5 (then user can manually sync)
```

---

## Device Capabilities Detection

```javascript
// Detect device capabilities on startup
const capabilities = {
  microphone: true,      // From navigator.mediaDevices
  camera: true,          // From navigator.mediaDevices
  speaker: true,         // Assume true for mobile
  fileSystem: true,      // Capacitor Filesystem
  backgroundTasks: Platform === 'android' ? true : false,
  pushNotifications: true,
  offlineStorage: 500,   // MB
  syncInterval: 1500,    // ms
  maxConnections: 3
};

// Adaptive behavior based on battery
if (batteryLevel < 20) {
  syncInterval = 30000;  // 30 seconds
}

if (batteryLevel < 5) {
  disable = ['streaming', 'transcription'];  // CPU intensive
}
```

---

## Security Architecture

### Device Identification
```
Device UUID:
  ├─ iOS: UIDevice.current.identifierForVendor
  ├─ Android: ANDROID_ID or UUID
  └─ Web: localStorage UUID

Device Fingerprint:
  ├─ Device model
  ├─ OS version
  ├─ App version
  ├─ Screen resolution
  └─ Used to detect suspicious activity
```

### Token Management
```
JWT Flow:
├─ Login → Get JWT token
├─ Store in Capacitor SecureStorage (mobile)
├─ Store in localStorage (web)
├─ Add to Authorization header
├─ Auto-refresh before expiry (1 hour)
└─ Invalidate on logout

Device Token:
├─ Generated per device per session
├─ Signed with HMAC-SHA256
├─ Prevents token reuse across devices
└─ Expires after 24 hours
```

### Message Signing
```javascript
// Sign WebSocket messages
const signature = HMAC('sha256', message, secretKey);
{
  type: 'STATE_CHANGED',
  payload: {...},
  signature,
  timestamp
}

// Prevent replay attacks
if (timestamp < Date.now() - 5000) {
  reject('Message too old');
}
```

---

## Performance Optimization

### Network
- **Delta Sync**: Only send changed fields
- **Compression**: gzip WebSocket messages
- **Batching**: Group multiple updates
- **Connection Pooling**: Reuse WebSocket

### Storage
- **SQLite Limits**: Cap offline queue at 5000 items
- **Cleanup**: Auto-delete synced items older than 7 days
- **Indexing**: Fast queries on device_id, session_id

### Battery
- **Adaptive Heartbeat**: Increase interval on low battery
- **CPU Optimization**: Reduce update frequency
- **Background Suspension**: Sync only when app is active

### Memory
- **Lazy Loading**: Load questions one batch at a time
- **Store Cleanup**: Unload old sessions from memory
- **Garbage Collection**: Manual cleanup on disconnect

---

## Monitoring & Analytics

### Key Metrics
```
1. Connection Success Rate
   ├─ WebSocket connections: Target 99%+
   ├─ Reconnection time: < 5 seconds
   └─ Device registration: 100%

2. Sync Performance
   ├─ Average sync time: < 500ms
   ├─ Offline queue size: < 100 items
   └─ Sync failure rate: < 1%

3. Device Distribution
   ├─ Web (desktop): 40%
   ├─ iOS: 35%
   ├─ Android: 25%
   └─ Multi-device sessions: 15%

4. Battery Impact
   ├─ Standby drain: < 3% per hour
   ├─ Active usage: < 1% per minute
   └─ Worst case: < 5% per minute

5. Data Usage
   ├─ Per session: < 5MB
   ├─ Per day: < 20MB
   ├─ WiFi only sessions: 70%
   └─ Cellular: 30%
```

### Logging
```javascript
// Firebase Crashlytics
Crashlytics.recordError(error);
Crashlytics.log('Session switch: desktop → mobile');

// Analytics events
Analytics.logEvent('device_registered', {
  deviceType: 'ios',
  networkType: 'wifi',
  sessionDuration: 600
});

Analytics.logEvent('offline_sync', {
  itemCount: 25,
  duration: 2000,
  success: true
});
```

---

## Files Overview

### New Files Created

#### Documentation
- **MOBILE_APP_ARCHITECTURE.md** (1500+ lines)
  - Complete technical design
  - Database schema with examples
  - API endpoint specifications
  - Client/server implementation details

- **MOBILE_APP_PHASE1_GUIDE.md** (400+ lines)
  - Quick start guide
  - Implementation checklist
  - Troubleshooting section
  - Next steps for Phase 2

#### Database
- **009_mobile_app_session_continuity.sql** (400+ lines)
  - device_sessions table
  - session_state table
  - sync_queue table
  - device_capabilities table
  - Views for analytics
  - Triggers for automation

#### Backend Services
- **server/services/sessionSyncManager.js** (600+ lines)
  - registerDevice()
  - updateSessionState()
  - broadcastToSession()
  - syncOfflineQueue()
  - getFullSessionState()
  - Cleanup stale connections

- **server/websocket/sessionHandler.js** (500+ lines)
  - handleConnection()
  - handleAnswerStream()
  - handleStateChanged()
  - handleSyncRequest()
  - Ping/pong keepalive

#### Client Store
- **client/src/store/sessionSyncStore.js** (450+ lines)
  - Zustand store with persistence
  - updateSessionState()
  - streamAnswerChunk()
  - syncOfflineQueue()
  - WebSocket message handling

---

## Next Steps

### Immediate (This Week)
1. Review architecture and validate design
2. Create REST API endpoints for device registration
3. Integrate WebSocket handler into main server
4. Test with WebSocket client tool (Postman/Insomnia)

### Short-term (Next 2 Weeks)
1. Implement device status UI
2. Create mobile-responsive session view
3. Add offline indicator
4. Test sync with manual device switching

### Medium-term (Month 2)
1. Build Android APK
2. Build iOS IPA
3. Beta testing with real devices
4. Optimize performance/battery

### Long-term (Month 3+)
1. Play Store submission
2. App Store submission
3. Launch announcement
4. Ongoing monitoring and optimization

---

## Success Criteria

✅ **Functional**
- [ ] Switch from desktop to mobile mid-interview
- [ ] All answers visible on both devices
- [ ] No data loss during network interruption
- [ ] Offline changes synced when reconnected
- [ ] Answer streaming in real-time across devices

✅ **Performance**
- [ ] WebSocket connections < 2 seconds
- [ ] Sync latency < 500ms (95th percentile)
- [ ] Battery impact < 2% per hour standby

✅ **Reliability**
- [ ] 99%+ WebSocket connection success
- [ ] < 1% sync failures
- [ ] Zero critical bugs in beta

✅ **Adoption**
- [ ] 50%+ active users download mobile app in first month
- [ ] 30%+ daily active users
- [ ] 4.5+ star rating on app stores

---

## Support & Resources

### Documentation
- [MOBILE_APP_ARCHITECTURE.md](MOBILE_APP_ARCHITECTURE.md) - Full technical design
- [MOBILE_APP_PHASE1_GUIDE.md](MOBILE_APP_PHASE1_GUIDE.md) - Developer guide
- [API.md](API.md) - Updated with new endpoints
- [Database Schema](database/migrations/009_mobile_app_session_continuity.sql)

### Tools & Services
- **Capacitor Documentation**: https://capacitorjs.com/docs
- **WebSocket Best Practices**: https://socket.io/docs
- **Firebase**: Crashlytics, Analytics, Cloud Messaging
- **TestFlight/Firebase App Distribution**: Beta testing

### Team Resources
- **Architecture Review**: Weekly sync
- **Code Reviews**: All PRs reviewed
- **Design System**: Existing component library
- **CI/CD**: GitHub Actions configured

---

**Status**: ✅ ARCHITECTURE COMPLETE - Ready for Phase 1 Implementation  
**Last Updated**: February 2, 2026  
**Version**: 1.0
