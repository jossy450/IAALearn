# Neural Net AI Transcription Setup Guide

This guide helps you configure advanced neural net AI models for speech-to-text transcription with automatic fallback support.

## Overview

The system uses intelligent fallback logic to automatically try multiple neural net providers:

1. **AssemblyAI** - Cloud-based, best accuracy, real-time capable
2. **Deepgram** - Specialized for real-time, low latency
3. **Google Cloud Speech-to-Text** - Enterprise neural model
4. **Azure Speech Services** - Microsoft neural engine
5. **OpenAI Whisper** - Reliable fallback option

If one provider fails, the system automatically tries the next one.

---

## 1. AssemblyAI Setup (Recommended)

### Why AssemblyAI?
- ✅ Best accuracy for interview scenarios
- ✅ Real-time transcription support
- ✅ Speaker diarization (identify who spoke)
- ✅ Entity detection
- ✅ 99.9% uptime SLA
- ✅ Affordable pricing

### Steps:

1. **Create Account:**
   - Go to https://www.assemblyai.com
   - Sign up for free account (includes $100 credits)

2. **Get API Key:**
   - Dashboard → API keys
   - Copy your API key

3. **Configure Environment:**
   ```bash
   # Add to .env file
   ASSEMBLYAI_API_KEY=your_api_key_here
   ```

4. **Test:**
   ```bash
   curl -X GET http://localhost:3001/api/transcription/status \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Pricing:
- Free tier: $0 (100 minutes/month)
- Paid: $0.65 per 1000 minutes (~$39/month for 60 hours)

---

## 2. Deepgram Setup (Best for Real-time)

### Why Deepgram?
- ✅ Lowest latency (perfect for live interviews)
- ✅ Nova model (latest neural architecture)
- ✅ Real-time streaming
- ✅ Custom vocabulary support
- ✅ 99.95% uptime

### Steps:

1. **Create Account:**
   - Go to https://console.deepgram.com
   - Sign up free (includes $200 credits)

2. **Get API Key:**
   - Settings → API Keys
   - Create new key

3. **Configure Environment:**
   ```bash
   # Add to .env file
   DEEPGRAM_API_KEY=your_token_here
   ```

4. **Test:**
   ```bash
   curl -X GET http://localhost:3001/api/transcription/status \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Pricing:
- Free: $0 (includes $200 credits, ~25 hours)
- Paid: $0.0043 per minute (~$0.26/hour)

---

## 3. Google Cloud Speech-to-Text Setup

### Why Google?
- ✅ Enterprise-grade neural models
- ✅ 125+ language support
- ✅ Automatic punctuation
- ✅ Noise robust
- ✅ Google Cloud ecosystem integration

### Steps:

1. **Setup Google Cloud Project:**
   ```bash
   # Install gcloud CLI
   https://cloud.google.com/sdk/docs/install
   
   # Initialize
   gcloud init
   gcloud auth application-default login
   ```

2. **Enable Speech-to-Text API:**
   ```bash
   gcloud services enable speech.googleapis.com
   ```

3. **Create Service Account:**
   ```bash
   gcloud iam service-accounts create speech-service \
     --display-name="Speech Service"
   
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member=serviceAccount:speech-service@YOUR_PROJECT_ID.iam.gserviceaccount.com \
     --role=roles/speech.admin
   ```

4. **Create and Download Key:**
   ```bash
   gcloud iam service-accounts keys create key.json \
     --iam-account=speech-service@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

5. **Configure Environment:**
   ```bash
   # Add to .env file
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
   GOOGLE_CLOUD_SPEECH_KEY=your_key_from_json
   ```

6. **Install SDK:**
   ```bash
   npm install @google-cloud/speech
   ```

### Pricing:
- Free: $0 (300 minutes/month)
- Paid: $0.006 per 15 seconds (~$1.44/hour)

---

## 4. Azure Speech Services Setup

### Why Azure?
- ✅ Enterprise neural models
- ✅ HIPAA/SOC2 compliant
- ✅ On-prem deployment option
- ✅ Custom neural voices
- ✅ Speech analytics

### Steps:

1. **Create Azure Account:**
   - Go to https://portal.azure.com
   - Create free account ($200 credit)

2. **Create Speech Service:**
   - Create Resource → Cognitive Services → Speech
   - Select region (choose closest to you)
   - Choose F0 (free tier)

3. **Get Credentials:**
   - Copy API Key and Region
   - Found in: Resource → Keys and Endpoint

4. **Configure Environment:**
   ```bash
   # Add to .env file
   AZURE_SPEECH_KEY=your_key_here
   AZURE_SPEECH_REGION=your_region_here
   # Example: AZURE_SPEECH_REGION=eastus
   ```

5. **Install SDK:**
   ```bash
   npm install microsoft-cognitiveservices-speech-sdk
   ```

### Pricing:
- Free: $0 (5 hours/month)
- Paid: $1 per hour

---

## 5. OpenAI Whisper (Fallback)

Already configured by default as fallback. No additional setup needed.

### Pricing:
- $0.006 per minute of audio (~$0.36/hour)

---

## Configuration Priority

The system tries providers in this order (fastest → most reliable):

```
1. AssemblyAI     (Best accuracy + speed)
2. Deepgram       (Best real-time)
3. Google Cloud   (Enterprise reliability)
4. Azure          (Enterprise backup)
5. OpenAI Whisper (Ultimate fallback)
```

Whichever is configured and has valid credentials will be tried first.

---

## Environment File Example

```env
# .env file
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=interview_assistant
DB_USER=postgres
DB_PASSWORD=your_password

# OpenAI
OPENAI_API_KEY=sk-...

# Neural Net Transcription - Choose at least ONE
ASSEMBLYAI_API_KEY=your_assemblyai_key
# DEEPGRAM_API_KEY=your_deepgram_token
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/google_key.json
# AZURE_SPEECH_KEY=your_azure_key
# AZURE_SPEECH_REGION=eastus

# Other configs...
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:5173
```

---

## Testing Transcription

### Test Endpoint:

```bash
# Get status
curl -X GET http://localhost:3001/api/transcription/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response example:
{
  "status": "operational",
  "service": "Neural Net Multi-Provider Transcription",
  "availableProviders": [
    { "name": "AssemblyAI", "priority": 1 },
    { "name": "OpenAI Whisper", "priority": 5 }
  ],
  "primaryProvider": "AssemblyAI",
  "totalProviders": 2
}
```

### Upload Audio:

```bash
curl -X POST http://localhost:3001/api/transcription/transcribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "audio=@recording.webm" \
  -F "format=webm" \
  -F "language=en"

# Response example:
{
  "success": true,
  "text": "What are your main strengths as a software engineer?",
  "provider": "AssemblyAI",
  "confidence": 0.95,
  "duration": 2341,
  "timestamp": "2026-01-28T17:20:00Z"
}
```

---

## Troubleshooting

### No providers configured
**Error:** "No transcription providers configured"
**Solution:** Set at least one API key in .env and restart server

### Transcription fails for all providers
**Check:**
1. API keys are correct (copy without extra spaces)
2. Accounts have sufficient credits
3. Audio file is valid (at least 1 second, proper format)
4. Network connectivity
5. Check server logs for detailed errors

### Audio too short error
**Solution:** Record at least 1 full second of audio

### Invalid format error
**Supported formats:**
- WebM (Opus codec) - Recommended
- WAV (PCM)
- MP3
- OGG (Opus)
- MPEG

---

## Cost Comparison

| Provider | Free | Paid | Per Hour |
|----------|------|------|----------|
| AssemblyAI | $0 (100 min) | $0.65/1000 min | $0.39 |
| Deepgram | $200 credits | $0.0043/min | $0.26 |
| Google | $0 (300 min) | $0.006/15s | $1.44 |
| Azure | $0 (5 hours) | $1/hour | $1.00 |
| OpenAI | N/A | $0.006/min | $0.36 |

**Recommendation:** Start with AssemblyAI free tier ($100 credits) or Deepgram free tier ($200 credits).

---

## Advanced Features

### Custom Vocabulary (AssemblyAI)
Add company names, technical terms:
```json
{
  "custom_vocabulary": ["JAR", "Maven", "Spring Boot", "Kubernetes"]
}
```

### Speaker Diarization (AssemblyAI)
Identify who spoke (useful for panel interviews):
```json
{
  "speaker_labels": true
}
```

### Real-time Streaming (Deepgram)
For live interview transcription without recording first.

### Custom Models (Azure)
Train on company-specific terminology.

---

## Recommended Setup for Different Use Cases

### **Best Accuracy (Interviews)**
→ AssemblyAI (99%+ accuracy, great for technical terms)

### **Best Speed (Live Sessions)**
→ Deepgram (lowest latency, <500ms)

### **Best Enterprise Support**
→ Azure or Google Cloud (SLAs, security, compliance)

### **Best Free Option**
→ AssemblyAI or Deepgram (both have generous free tiers)

### **Best Reliability (Multiple Fallbacks)**
→ Configure 2-3 providers (system auto-switches if one fails)

---

## Monitoring

Check provider health:
```bash
# See which providers are active
curl http://localhost:3001/api/transcription/status

# Check logs for provider selection
tail -f logs/transcription.log
```

---

## Next Steps

1. Choose your primary provider
2. Set up API key in .env
3. Restart server
4. Test with `curl` examples above
5. Monitor first few transcriptions
6. Add backup provider if needed

Questions? Check provider documentation:
- AssemblyAI: https://www.assemblyai.com/docs
- Deepgram: https://developers.deepgram.com
- Google: https://cloud.google.com/speech-to-text/docs
- Azure: https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/
