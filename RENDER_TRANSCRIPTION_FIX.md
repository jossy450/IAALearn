# Render Transcription Fix Guide

## Quick Fix for Transcription Issues

Your transcription service is failing because all providers are unavailable. Here's how to fix it:

---

## ✅ **Immediate Solution (Recommended)**

### **Add OpenAI API Key to Render**

1. Go to your Render Dashboard
2. Select your web service
3. Go to **Environment** tab
4. Add this environment variable:
   ```
   Key: OPENAI_API_KEY
   Value: sk-proj-YOUR_KEY_HERE
   ```
4. Click **Save Changes** (this will redeploy)

**Cost:** ~$0.006 per minute of audio (~$0.36/hour)  
**Reliability:** 99%+ success rate  
**Formats:** Supports WebM, WAV, MP3, OGG directly (no conversion needed)

---

## 🆓 **Free Alternative (Hugging Face)**

The app already includes Hugging Face FREE transcription, but it requires ffmpeg for audio conversion.

### **Update your render.yaml:**
```yaml
services:
  - type: web
    name: iaalearn
    env: node
    plan: free
    buildCommand: apt-get update && apt-get install -y ffmpeg && npm install && npm run build
    startCommand: npm start
```

**This is already updated in your codebase** ✅

### **Then redeploy:**
1. Commit the updated `render.yaml`
2. Push to GitHub
3. Render will auto-deploy with ffmpeg installed

**Note:** Hugging Face free tier may be rate-limited during peak hours.

---

## 🔄 **Fallback Order**

The app tries providers in this order:

1. **Grok STT** (if `GROK_API_KEY` set) - FREE for xAI users
2. **OpenAI Whisper** (if `OPENAI_API_KEY` set) - Most reliable
3. **Hugging Face** (FREE) - No key needed, requires ffmpeg
4. **Coqui STT** - Not installed (skip)
5. **Wav2Vec 2.0** - Not installed (skip)
6. **Silero STT** - Not for transcription (skip)

---

## 🧪 **Testing After Deployment**

### Test the transcription endpoint:
```bash
# Check available providers
curl https://your-app.onrender.com/api/transcription/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should show:
# - OpenAI Whisper (if key set)
# - Hugging Face (FREE)
```

---

## 🐛 **Current Issues Fixed**

### Before:
- ❌ No API keys configured
- ❌ Hugging Face conversion failing (no ffmpeg)
- ❌ All providers failing with unclear error

### After:
- ✅ Better error messages
- ✅ ffmpeg installed via render.yaml
- ✅ Graceful fallback if conversion fails
- ✅ Clear instructions in error messages

---

## 📝 **Environment Variables for Render**

### Required:
```
NODE_ENV=production
DATABASE_URL=<auto-set by Render if using PostgreSQL>
SESSION_SECRET=<random-string-here>
JWT_SECRET=<random-string-here>
```

### For Transcription (at least one):
```
OPENAI_API_KEY=sk-proj-...    # Recommended
GROK_API_KEY=...               # Free alternative
```

### Optional OAuth:
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
CLIENT_URL=https://your-app.onrender.com
```

---

## 🚀 **Deployment Steps**

1. **Commit these changes:**
   ```bash
   git add .
   git commit -m "Fix transcription with ffmpeg and better error handling"
   git push origin main
   ```

2. **Add OpenAI key in Render:**
   - Dashboard → Your Service → Environment
   - Add `OPENAI_API_KEY`

3. **Wait for deploy to complete**

4. **Test transcription in your app**

---

## 💡 **Cost Optimization**

### Free Option:
- Use Hugging Face (FREE) - works after ffmpeg is installed
- May be slow/rate-limited during peak hours

### Paid Option ($5 gets you far):
- OpenAI Whisper: $0.006/minute
- $5 = ~833 minutes = ~14 hours of transcription

### Best Setup:
- Set `OPENAI_API_KEY` for reliability
- Keep Hugging Face as free fallback
- System automatically tries OpenAI first, falls back to HF if fails

---

## 📞 **Support**

If issues persist after deploying:

1. Check Render logs: Dashboard → Logs
2. Look for: "🎤 Attempting transcription with..."
3. Check which provider is being tried
4. Verify ffmpeg installed: should see "ffmpeg" in build logs
5. Test endpoint: `/api/transcription/status`

---

**Ready to deploy!** The fixes are already in your code. Just push and add the OpenAI key.
