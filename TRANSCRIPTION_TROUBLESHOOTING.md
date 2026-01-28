# Audio Transcription Troubleshooting Guide

## Common Issues and Solutions

### 1. "Failed to transcribe audio" Error

#### Cause: Node.js File API Issue (FIXED)
**Problem:** The transcription service was using browser's `File` constructor which doesn't exist in Node.js.

**Solution:** Updated to use file streams with temporary files.

#### How to Verify the Fix:
1. Record audio in interview session
2. Check browser console for: "Audio recorded successfully: [size] bytes"
3. Check server logs for: "📝 Transcribing audio: [size] bytes"
4. Should see: "✅ Transcription successful"

### 2. "OpenAI API key is invalid or missing"

#### Solution:
Check your environment variables on Render:

```bash
OPENAI_API_KEY=sk-proj-...
```

**Verify:**
```bash
curl https://your-app.onrender.com/api/transcription/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. "No audio recorded"

#### Possible Causes:
- Microphone permissions not granted
- Recording stopped too quickly
- Browser doesn't support MediaRecorder API

#### Solutions:
1. **Grant Microphone Permission:**
   - Click the microphone icon in browser address bar
   - Allow microphone access

2. **Record for at least 1 second:**
   - System now validates recording length
   - Minimum: 100 bytes

3. **Browser Compatibility:**
   - Use Chrome, Edge, or Firefox
   - Safari may have limited support

### 4. "Invalid audio format or corrupted audio file"

#### Solution:
The app records in `webm` format by default. If issues persist:

1. **Check Audio Format Support:**
   ```javascript
   // In browser console:
   MediaRecorder.isTypeSupported('audio/webm') // Should be true
   ```

2. **Try Different Format:**
   Update recording format in code:
   ```javascript
   const mediaRecorder = new MediaRecorder(stream, {
     mimeType: 'audio/webm;codecs=opus'
   });
   ```

### 5. Server Logs Show Errors

#### Check Server Logs:
```bash
# On Render
View logs in dashboard

# Look for:
❌ Transcription error: [error message]
```

#### Common Server Errors:

**"Audio file too large"**
- Current limit: 10MB
- Solution: Record shorter audio clips

**"Invalid audio format"**
- Allowed formats: webm, wav, mp3, mpeg, ogg
- Check `mimetype` in server logs

**"Temporary file cleanup failed"**
- Non-critical warning
- Temp files auto-cleaned by OS

## Testing Checklist

### Before Recording:
- [ ] Microphone connected and working
- [ ] Browser permissions granted
- [ ] Logged into the application
- [ ] Interview session started

### During Recording:
- [ ] Red "Recording..." indicator visible
- [ ] Speak clearly for at least 2-3 seconds
- [ ] Click stop recording button

### After Recording:
- [ ] "Processing..." message appears
- [ ] Check browser console for logs
- [ ] Transcribed text appears in question box
- [ ] Answer generation starts automatically

## Debug Mode

### Enable Detailed Logging:

**Frontend (Browser Console):**
```javascript
// Already enabled in latest version
// You'll see:
// "Audio recorded successfully: X bytes"
// "Transcribing audio blob: X bytes"
// "Transcription successful: [text]"
```

**Backend (Server Logs):**
```javascript
// Already enabled in latest version
// You'll see:
// "📝 Transcribing audio: X bytes, format: webm"
// "✅ Transcription successful: [text preview]"
```

## API Testing

### Test Transcription Endpoint Directly:

```bash
# 1. Record audio file (use any voice recorder)
# 2. Test upload:

curl -X POST https://your-app.onrender.com/api/transcription/transcribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "audio=@recording.webm" \
  -F "format=webm"
```

**Expected Response:**
```json
{
  "success": true,
  "text": "Your transcribed text here",
  "duration": 1234,
  "timestamp": "2026-01-28T12:00:00.000Z"
}
```

## Environment Variables

### Required on Render:

```bash
# OpenAI API (REQUIRED for transcription)
OPENAI_API_KEY=sk-proj-...

# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-here

# Optional
NODE_ENV=production
```

### Verify Configuration:

```bash
# Check transcription status
curl https://your-app.onrender.com/api/transcription/status \
  -H "Authorization: Bearer TOKEN"
```

## Quick Fixes

### Fix 1: Restart Recording
1. Refresh the page
2. Start new interview session
3. Try recording again

### Fix 2: Clear Browser Cache
1. Open browser DevTools (F12)
2. Application tab → Clear Storage
3. Refresh page and login again

### Fix 3: Check API Key
1. Go to Render dashboard
2. Environment variables
3. Verify `OPENAI_API_KEY` is set
4. Should start with `sk-proj-...`

### Fix 4: Check Server Logs
1. Render dashboard → Logs
2. Look for transcription errors
3. Check if service started successfully

## Known Limitations

1. **Maximum Audio Length:** 10MB file size limit
2. **Supported Formats:** webm, wav, mp3, mpeg, ogg
3. **Language:** Currently English only (configurable)
4. **Internet Required:** Transcription uses OpenAI API

## Performance Tips

1. **Speak Clearly:** Better audio quality = better transcription
2. **Reduce Background Noise:** Use quiet environment
3. **Optimal Length:** 5-30 seconds per recording
4. **Good Microphone:** Built-in or external mic

## Recent Fixes (v2.1.1)

✅ **Fixed:** Node.js File API issue (replaced with file streams)  
✅ **Added:** Audio blob size validation  
✅ **Added:** Detailed error messages  
✅ **Added:** Console logging for debugging  
✅ **Added:** Better error handling on frontend  
✅ **Added:** Temporary file cleanup  

## Support

If issues persist after trying these solutions:

1. Check browser console for errors
2. Check server logs in Render
3. Verify OpenAI API key is valid
4. Ensure microphone permissions granted
5. Try different browser

---

**Last Updated:** January 28, 2026  
**Version:** 2.1.1 - Transcription Fix
