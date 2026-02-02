# Mobile App Implementation Guide: Phase 1

## Quick Start

### 1. Database Setup
Run the migration to add session continuity tables:

```bash
cd server
node database/migrate.js  # Automatically runs all pending migrations including 009_mobile_app_session_continuity.sql
```

This creates:
- `device_sessions` - Track devices
- `session_state` - Real-time sync state
- `sync_queue` - Offline changes
- `device_capabilities` - Device features
- Views for analytics

### 2. Start Development Server
```bash
# Terminal 1: Backend
npm run server:dev

# Terminal 2: Web Frontend
npm run client:dev

# Terminal 3: WebSocket Server (if separate)
# Currently integrated into backend on port 3001
```

### 3. Initialize Android Build
```bash
cd client
npm run android:init  # Creates android/ directory
npm run android:sync  # Syncs web dist to Android
npm run android:open  # Opens Android Studio
```

### 4. Initialize iOS Build
```bash
cd client
npm run ios:init      # Creates ios/ directory
npm run ios:sync      # Syncs web dist to iOS
npm run ios:open      # Opens Xcode
```

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Web Browser (localhost:5173)                   │
│  ├─ Interview Session (Desktop)                 │
│  └─ Mobile Web (Responsive)                     │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────┼─────────┐
         │         │         │
         ▼         ▼         ▼
    REST API   WebSocket   REST API
     (/api)     (/ws)      (/api)
         │         │         │
         └─────────┴─────────┘
              │
              ▼
    ┌─────────────────────────┐
    │  Node.js Backend        │
    │  ├─ Express (REST)      │
    │  ├─ WebSocket Server    │
    │  ├─ Session Sync Mgr    │
    │  └─ Auth Middleware     │
    └──────────┬──────────────┘
               │
         ┌─────┴─────┐
         │           │
         ▼           ▼
    PostgreSQL    Redis
    (Sessions)    (Cache)
         │           │
         └─────┬─────┘
              │
    ┌─────────────────────────┐
    │  Mobile Apps (via APK)  │
    │  ├─ Android            │
    │  └─ iOS                │
    │  Built with Capacitor  │
    │  + React               │
    └─────────────────────────┘
```

## Key Components

### 1. Server-Side Services

#### `sessionSyncManager.js` (NEW)
- `registerDevice()` - Add device to session
- `updateSessionState()` - Sync state across devices
- `broadcastToSession()` - Send to all devices
- `syncOfflineQueue()` - Process offline changes
- `getFullSessionState()` - Complete state for new device

#### `sessionHandler.js` (NEW - WebSocket)
- `handleConnection()` - New WebSocket connection
- `handleMessage()` - Route messages to handlers
- `handleAnswerStream()` - Stream answer chunks
- `handleStateChanged()` - State sync
- `handleOfflineQueueSync()` - Offline queue processing

### 2. Client-Side Services

#### `sessionSyncStore.js` (NEW)
Zustand store for managing sync state:
- `updateSessionState()` - Update and queue changes
- `streamAnswerChunk()` - Send answer chunks
- `syncOfflineQueue()` - Process pending changes
- `handleWebSocketMessage()` - Process incoming messages

#### `useSessionSyncStore` Hook
```jsx
import { useSessionSyncStore } from '@/store/sessionSyncStore';

const Component = () => {
  const { 
    sessionState,         // Current state
    connectedDevices,     // Other devices
    isOnline,            // Network status
    syncStatus,          // 'idle', 'syncing', 'error'
    updateSessionState   // Update function
  } = useSessionSyncStore();
};
```

## API Endpoints (To be implemented)

### Device Management
```
POST   /api/device-sessions/register
GET    /api/device-sessions/:sessionId
POST   /api/device-sessions/:sessionId/heartbeat
POST   /api/device-sessions/disconnect
```

### Session State
```
GET    /api/sessions/:id/state
PUT    /api/sessions/:id/state
POST   /api/sessions/:id/state/sync
```

### Offline Sync
```
POST   /api/sync/queue/flush
GET    /api/sync/queue/status
```

### WebSocket
```
WS     /api/ws/session/:sessionId
  ├─ Message: ANSWER_STREAM
  ├─ Message: STATE_CHANGED
  ├─ Message: SYNC_REQUEST
  └─ Message: HEARTBEAT
```

## Database Schema (Already Created)

### device_sessions
```sql
- id: UUID
- user_id: UUID (FK users)
- session_id: UUID (FK interview_sessions)
- device_id: VARCHAR (unique per device)
- device_type: 'web' | 'android' | 'ios'
- device_name: VARCHAR
- app_version: VARCHAR
- os_version: VARCHAR
- connected_at: TIMESTAMP
- last_heartbeat: TIMESTAMP
- is_active: BOOLEAN
- network_type: VARCHAR
- battery_level: INT
- capabilities: JSONB
```

### session_state
```sql
- id: UUID
- session_id: UUID (UNIQUE, FK interview_sessions)
- current_question_text: TEXT
- current_answer_text: TEXT
- is_streaming: BOOLEAN
- is_recording: BOOLEAN
- is_answer_hidden: BOOLEAN
- floating_position: JSONB
- floating_collapsed: BOOLEAN
- mobile_view_mode: VARCHAR
- version: INT (for optimistic locking)
- last_updated_at: TIMESTAMP
- last_updated_from_device: VARCHAR
```

### sync_queue
```sql
- id: BIGSERIAL
- user_id: UUID (FK users)
- session_id: UUID (FK interview_sessions)
- device_id: VARCHAR
- action: 'create' | 'update' | 'delete' | 'stream'
- entity_type: 'answer' | 'question' | 'state' | 'metadata'
- payload: JSONB
- created_at: TIMESTAMP
- synced_at: TIMESTAMP
- retry_count: INT
- sequence_number: INT (for ordering)
```

## Session Transfer Flow

### Scenario: Continue from Desktop to Mobile

```
STEP 1: Desktop Session Active
├─ User on /session/123
├─ Asking question
├─ Answer streaming to floating widget
└─ State stored in session_state table

STEP 2: Mobile App Opens
├─ Detects active session: 123
├─ User clicks "Continue on Mobile"
├─ POST /api/device-sessions/register
│  ├─ Payload: {sessionId: 123, deviceId: "iphone-uuid", deviceType: "ios"}
│  └─ Response: Device registered, token
└─ Page navigates to /mobile/123

STEP 3: Mobile View Loads
├─ Zustand store initialized with sessionId
├─ Connects WebSocket: WS /api/ws/session/123
│  └─ Message: {type: 'DEVICE_JOINED', deviceId: '...'}
├─ Requests full sync: {type: 'SYNC_REQUEST'}
└─ Server responds with all answers + current state

STEP 4: Real-time Sync Active
├─ Desktop answers streaming → WebSocket
├─ Mobile receives chunks → Display in real-time
├─ Both devices always in sync
├─ If mobile goes offline:
│  └─ Changes queued locally in sync_queue
└─ When reconnects:
   └─ Offline changes pushed to server
```

## Testing Checklist

- [ ] Database migrations run successfully
- [ ] `device_sessions` table created
- [ ] `session_state` table created with triggers
- [ ] `sync_queue` table created
- [ ] Backend starts without errors
- [ ] WebSocket server accepts connections
- [ ] Device registration works
- [ ] State sync broadcasts to all devices
- [ ] Offline queue stores changes locally
- [ ] Offline queue syncs when reconnected
- [ ] Answer streaming works in real-time
- [ ] Heartbeat keeps connections alive

## Next Steps (Phase 2)

1. **REST API Implementation**
   - Implement device registration endpoints
   - Implement state sync endpoints
   - Add offline queue flushing endpoints

2. **Mobile App UI**
   - Create responsive mobile session view
   - Implement large answer display
   - Add device switching UI
   - Create offline indicator

3. **WebSocket Integration**
   - Connect frontend to WebSocket server
   - Implement message handlers
   - Add reconnection logic with exponential backoff
   - Add heartbeat mechanism

4. **Offline Support**
   - Implement SQLite storage (Capacitor SQLite)
   - Implement offline queue manager
   - Add sync when online event listener
   - Handle conflict resolution

5. **Build & Distribution**
   - Build APK for Android
   - Build IPA for iOS
   - Submit to Play Store
   - Submit to App Store

## Troubleshooting

### WebSocket Connection Refused
- Check backend server is running on port 3001
- Verify CORS headers allow WebSocket
- Check firewall/proxy settings

### Device Session Not Registering
- Verify device_id header is sent
- Check user is authenticated (token valid)
- Check session_id is valid and belongs to user

### Sync Queue Not Processing
- Verify network connectivity
- Check sync_queue table for pending items
- Review server logs for errors
- Manual sync: POST /api/sync/queue/flush

### State Version Conflicts
- This is expected with optimistic locking
- Solution: Request full sync via SYNC_REQUEST message
- Server will send complete state

## File Structure

```
server/
├─ services/
│  └─ sessionSyncManager.js (NEW)
├─ websocket/
│  └─ sessionHandler.js (NEW)
├─ routes/
│  ├─ sessions.js (modify to use sync manager)
│  └─ (new device endpoints)
└─ database/
   └─ migrations/
      └─ 009_mobile_app_session_continuity.sql (NEW)

client/
├─ src/
│  └─ store/
│     └─ sessionSyncStore.js (NEW)
└─ capacitor.config.json (exists)
```

## Environment Variables

Add to `.env`:
```
WEBSOCKET_ENABLED=true
WEBSOCKET_HOST=0.0.0.0
WEBSOCKET_PORT=3001
REDIS_ENABLED=false  # Can enable for session caching
OFFLINE_SYNC_TIMEOUT=30000  # 30 seconds
MAX_SYNC_QUEUE_SIZE=5000
```

## Performance Tips

1. **Connection Management**
   - Reuse WebSocket for all communications
   - Implement exponential backoff for reconnects
   - Close connections on app background

2. **Battery Optimization**
   - Reduce heartbeat interval on low battery
   - Increase sync interval when battery < 20%
   - Batch updates instead of sending individually

3. **Data Optimization**
   - Only sync changed fields (delta sync)
   - Compress large payloads
   - Expire old sync queue items after 7 days

4. **Storage Optimization**
   - Limit offline queue to 1000-5000 items
   - Clear SQLite cache on session end
   - Implement periodic cleanup

## Security Considerations

1. **Device Identification**
   - Use unique device ID (UDID/Android ID)
   - Implement device fingerprinting
   - Validate device on each request

2. **Token Management**
   - Store JWT in Capacitor SecureStorage
   - Auto-refresh before expiry
   - Invalidate on logout

3. **Message Signing**
   - HMAC sign all WebSocket messages
   - Verify signature on server
   - Include timestamp to prevent replay attacks

4. **Rate Limiting**
   - Limit sync requests: 10/sec per device
   - Limit WebSocket messages: 100/min per connection
   - Implement backpressure mechanism

## Monitoring & Metrics

- Device connection count per session
- Offline sync success rate
- Average sync latency
- WebSocket error rates
- Battery usage impact
- Data usage per session
- Peak concurrent connections
