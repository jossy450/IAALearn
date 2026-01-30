# Mobile Transfer Feature - Complete Implementation Guide

## Current Status
✅ Backend APIs are ready:
- `/api/sessions/transfer-code` - Generate transfer codes
- `/api/sessions/transfer-status/:code` - Check transfer status  
- `/api/sessions/connect-transfer` - Connect via transfer code

✅ Frontend Components exist:
- `QRTransferModal.jsx` - QR code display
- `MobileScanner.jsx` - QR code reader
- `MobileSession.jsx` - Mobile interview interface

## What Needs to Work

### 1. Desktop → Mobile Transfer Flow
**Scenario**: User is doing interview on desktop, clicks "Transfer to Mobile"

**Steps**:
1. Desktop generates 6-character transfer code (already done in `transfer.js`)
2. QR Modal displays QR code containing transfer URL with code
3. User scans QR with phone
4. Phone decodes code and connects to session
5. Interview context transfers to mobile
6. Mobile continues from current question

**Code Path**:
```
InterviewSession.jsx (Desktop)
  ↓ Click "Transfer to Mobile"
  ↓
QRTransferModal.jsx
  ↓ Generates transfer code via sessionAPI.generateTransferCode()
  ↓ Displays QR with URL: https://app.com/mobile-transfer?code=ABC123
  ↓
MobileScanner.jsx (Phone)
  ↓ Scans QR code
  ↓ Calls sessionAPI.connectViaTransfer({ code: "ABC123" })
  ↓
MobileSession.jsx
  ↓ Loads session context and polls for updates
```

### 2. Screen Sharing Integration
**When to Trigger**: 
- User shares screen → Automatically suggest mobile transfer
- Show notification/modal with QR code ready to scan

**Already Implemented**:
- `InterviewSession.jsx` line 273: `checkScreenShare()`
- Sets `screenShareActive = true`
- Shows QR modal: `setShowQRTransfer(true)`

**What's Missing**:
- Mobile device detection (landscape/portrait optimization)
- Continuous sync of answers during transfer
- Response forwarding to mobile when needed

### 3. Full-Screen Answer Display
**Scenario**: Interview asks to share screen, AI generates response

**Expected Behavior**:
1. Interview interface on desktop stays hidden
2. Desktop shows screenshare content
3. Mobile device displays full-screen AI response
4. Mobile allows user to:
   - Read answer
   - Copy answer (to clipboard)
   - Hear answer (text-to-speech)
   - Request follow-up

**Implementation Needed**:
```javascript
// In MobileSession.jsx
1. Detect when screen is being shared (via polling)
2. Switch to "Full-Screen Answer Mode"
3. Display answer in large, readable font
4. Add action buttons (copy, speak, more)
5. Sync scroll position if answer is long
```

## Implementation Checklist

### Backend (Transfer)
- [x] Generate transfer codes with TTL
- [x] Validate and connect via transfer code
- [x] Log transfers in database
- [x] Clean up expired codes
- [ ] **Add endpoint**: Mark code as "fullscreen" when answer requested

### Backend (Mobile Session)
- [x] Create mobile session records
- [x] Track device connections
- [x] Poll for updates
- [ ] **Add endpoint**: Sync AI responses to mobile in real-time
- [ ] **Add endpoint**: Toggle full-screen answer mode

### Frontend (Desktop)
- [x] QR code generation and display
- [x] Screen share detection
- [x] Show transfer modal
- [ ] **Add feature**: Auto-hide interview UI when fullscreen share detected
- [ ] **Add feature**: Send current answer to mobile immediately

### Frontend (Mobile)
- [x] QR code scanning
- [x] Connect via transfer code
- [x] Poll for session updates
- [ ] **Add feature**: Landscape orientation lock when in full-screen mode
- [ ] **Add feature**: Dynamic font sizing based on answer length
- [ ] **Add feature**: Gesture controls (swipe to next answer, etc)
- [ ] **Add feature**: Persistent session in local storage

## Quick Start Implementation

### Step 1: Add Full-Screen Answer Mode to Mobile
**File**: `client/src/pages/MobileSession.jsx`

```javascript
const [fullscreenMode, setFullscreenMode] = useState(false);
const [answerFontSize, setAnswerFontSize] = useState('text-4xl');

// Detect orientation
useEffect(() => {
  const handleOrientationChange = () => {
    if (window.matchMedia('(orientation: landscape)').matches) {
      setAnswerFontSize('text-3xl');
    } else {
      setAnswerFontSize('text-4xl');
    }
  };
  window.addEventListener('orientationchange', handleOrientationChange);
  return () => window.removeEventListener('orientationchange', handleOrientationChange);
}, []);

// Render full-screen answer
if (fullscreenMode && currentAnswer) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-purple-900 text-white flex flex-col justify-center p-8">
      <div className={`${answerFontSize} leading-relaxed text-center mb-8`}>
        {currentAnswer}
      </div>
      <div className="flex justify-center gap-4">
        <button onClick={() => handleCopy(currentAnswer)} className="bg-blue-600 px-6 py-3 rounded">
          Copy
        </button>
        <button onClick={() => handleSpeak(currentAnswer)} className="bg-green-600 px-6 py-3 rounded">
          Speak
        </button>
        <button onClick={() => setFullscreenMode(false)} className="bg-gray-600 px-6 py-3 rounded">
          Done
        </button>
      </div>
    </div>
  );
}
```

### Step 2: Enhance Transfer with Full-Screen Flag
**File**: `server/routes/transfer.js`

```javascript
// Add to transferData structure:
{
  sessionId,
  userId,
  fullscreenMode: false,  // NEW
  createdAt: Date.now(),
  expiresAt: Date.now() + (5 * 60 * 1000),
  transferred: false
}

// Add endpoint to toggle fullscreen:
router.post('/:sessionId/toggle-fullscreen', authenticate, async (req, res) => {
  const { sessionId } = req.params;
  const { enable } = req.body;
  
  // Update transfer code to enable fullscreen
  // Notify mobile device via WebSocket or polling
  
  res.json({ success: true });
});
```

### Step 3: Add WebSocket or Polling Optimization
**For Real-Time Sync** (Currently uses 2-second polling):

Option A: Keep polling (simpler, works now)
Option B: Add WebSocket (faster, more complex)

**For now, enhance polling**:
```javascript
// In MobileSession.jsx
const fetchSession = async () => {
  try {
    const response = await sessionAPI.getOne(sessionId);
    
    // Check if fullscreen mode was enabled remotely
    if (response.data.fullscreen_mode && !fullscreenMode) {
      setFullscreenMode(true);
      // Lock orientation to landscape
      if (screen.orientation?.lock) {
        screen.orientation.lock('landscape').catch(e => console.log('Orientation lock failed'));
      }
    }
    
    // Update UI
    setSession(response.data);
  } catch (error) {
    console.error('Failed to fetch session:', error);
  }
};
```

## Testing Checklist

- [ ] Generate transfer code on desktop
- [ ] QR code displays correctly
- [ ] Scan QR with phone camera
- [ ] Phone loads MobileScanner page
- [ ] Code extracted from URL correctly
- [ ] Mobile connects and fetches session
- [ ] Questions/answers sync to mobile (2-second poll)
- [ ] Copy button works on mobile
- [ ] Text-to-speech works on mobile
- [ ] Full-screen answer mode displays correctly
- [ ] Landscape orientation optimizes layout
- [ ] Session persists on phone refresh (localStorage)
- [ ] Code expires after 5 minutes
- [ ] Invalid codes show error

## Database Schema Check

Ensure these tables exist:
```sql
-- Check existing
\dt session_transfers
\dt mobile_sessions
\dt interview_sessions

-- Add if missing:
ALTER TABLE interview_sessions ADD COLUMN fullscreen_mode BOOLEAN DEFAULT false;
```

## Environment Variables

Ensure these are set in Render:
- `CLIENT_URL` - Frontend URL (e.g., `https://iaalearn.onrender.com`)
- `SERVER_URL` or `RENDER_EXTERNAL_URL` - API URL

This ensures transfer URLs are correct on mobile.

## Next Steps

1. **Test current flow** - Follow testing checklist above
2. **Add full-screen mode** - Implement Step 1 above  
3. **Add WebSocket** (optional) - For instant updates instead of polling
4. **Add offline mode** - Store session in localStorage for offline access
5. **Add camera control** - Allow phone to send camera input back to desktop

