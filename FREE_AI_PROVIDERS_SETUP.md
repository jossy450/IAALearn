# Free AI Provider Setup Guide

## 🆓 Overview

This guide shows you how to set up **FREE AI providers** as alternatives to OpenAI. All providers have free tiers that work great for interview assistance!

### Available Providers

| Provider | Cost | Speed | Quality | Free Tier |
|----------|------|-------|---------|-----------|
| **Groq** | 🆓 FREE | ⚡⚡⚡ Very Fast | ⭐⭐⭐⭐ Excellent | 14,400 requests/day |
| **Hugging Face** | 🆓 FREE | ⚡⚡ Fast | ⭐⭐⭐ Good | Unlimited (rate limited) |
| **Together AI** | 🆓 FREE | ⚡⚡⚡ Very Fast | ⭐⭐⭐⭐ Excellent | $25 free credits |
| **Cohere** | 🆓 FREE | ⚡⚡ Fast | ⭐⭐⭐ Good | 1000 calls/month |
| OpenAI | 💰 Paid | ⚡⚡ Fast | ⭐⭐⭐⭐⭐ Best | Pay-per-use |

---

## 🚀 Quick Setup (Choose One or More)

### Option 1: Groq (RECOMMENDED - Best Free Option)

**Why Groq?**
- ✅ Completely FREE
- ✅ Extremely fast (faster than OpenAI)
- ✅ 14,400 requests per day
- ✅ Excellent quality (Mixtral, Llama models)

**Setup Steps:**

1. **Get API Key:**
   - Go to https://console.groq.com/
   - Sign up with Google/GitHub (free)
   - Go to "API Keys" section
   - Click "Create API Key"
   - Copy the key (starts with `gsk_...`)

2. **Add to Render Environment:**
   ```bash
   GROQ_API_KEY=gsk_your_key_here
   ```

3. **Test:**
   ```bash
   curl https://your-app.com/api/answers-optimized/providers
   # Should show: "groq" in available providers
   ```

---

### Option 2: Hugging Face (Unlimited Free)

**Why Hugging Face?**
- ✅ Completely FREE forever
- ✅ No request limits (rate limited per minute)
- ✅ Access to 1000+ models
- ✅ Open source models

**Setup Steps:**

1. **Get API Key:**
   - Go to https://huggingface.co/
   - Sign up (free)
   - Go to Settings → Access Tokens
   - Click "New token"
   - Name it "IAALearn" and create
   - Copy the token (starts with `hf_...`)

2. **Add to Render Environment:**
   ```bash
   HUGGINGFACE_API_KEY=hf_your_key_here
   ```

3. **Note:** First request may be slow (~20s) as model loads, then fast

---

### Option 3: Together AI (Fast & Free)

**Why Together AI?**
- ✅ $25 free credits (never expires)
- ✅ Very fast inference
- ✅ Multiple open-source models
- ✅ Good quality

**Setup Steps:**

1. **Get API Key:**
   - Go to https://api.together.xyz/
   - Sign up (free)
   - Get $25 free credits automatically
   - Go to "API Keys"
   - Create new key
   - Copy the key

2. **Add to Render Environment:**
   ```bash
   TOGETHER_API_KEY=your_key_here
   ```

---

### Option 4: Cohere (Simple & Free)

**Why Cohere?**
- ✅ 1000 calls/month free
- ✅ Simple API
- ✅ Good for basic questions
- ✅ Enterprise-grade reliability

**Setup Steps:**

1. **Get API Key:**
   - Go to https://dashboard.cohere.com/
   - Sign up (free)
   - Dashboard → API Keys
   - Copy the "Trial API Key"

2. **Add to Render Environment:**
   ```bash
   COHERE_API_KEY=your_key_here
   ```

---

## 🎯 Recommended Configuration

### For Maximum Cost Savings (All Free):

```bash
# Priority 1: Groq (fastest, free)
GROQ_API_KEY=gsk_your_key

# Priority 2: Together AI (backup, free credits)
TOGETHER_API_KEY=your_key

# Priority 3: Hugging Face (unlimited, slower start)
HUGGINGFACE_API_KEY=hf_your_key

# Optional: Keep OpenAI for premium quality
# OPENAI_API_KEY=sk_your_key
```

### For Best Performance:

```bash
# Use Groq for speed + OpenAI for quality
GROQ_API_KEY=gsk_your_key
OPENAI_API_KEY=sk_your_key
```

---

## 📊 How the Fallback System Works

The system tries providers in this order:

1. **Free providers first** (if `preferFree: true`)
   - Groq → Hugging Face → Together → Cohere

2. **Paid providers as fallback**
   - OpenAI (only if others fail or quality mode)

3. **Automatic retry**
   - If one provider fails, automatically tries next
   - Logs which provider was used

### Example Flow:

```
User asks question
  ↓
Try Groq (free) → Success! ✅ (1.2s)
  ↓
Return answer with badge: "Groq (FREE)"
```

If Groq fails:
```
User asks question
  ↓
Try Groq → Failed ❌
  ↓
Try Hugging Face → Success! ✅ (2.5s)
  ↓
Return answer with badge: "Hugging Face (FREE)"
```

---

## 🔧 Testing Your Setup

### 1. Check Available Providers

```bash
curl https://your-app.com/api/answers-optimized/providers \
  -H "Authorization: Bearer YOUR_JWT"
```

**Expected Response:**
```json
{
  "total": 3,
  "free": 3,
  "paid": 0,
  "providers": [
    {
      "name": "groq",
      "free": true,
      "priority": 1,
      "models": {
        "fast": "mixtral-8x7b-32768",
        "smart": "llama-3.1-70b-versatile"
      }
    },
    {
      "name": "huggingface",
      "free": true,
      "priority": 2
    },
    {
      "name": "together",
      "free": true,
      "priority": 3
    }
  ],
  "message": "3 provider(s) available (3 free, 0 paid)"
}
```

### 2. Test Answer Generation

```bash
curl -X POST https://your-app.com/api/answers-optimized/generate \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are your strengths?",
    "sessionId": 1,
    "stream": false
  }'
```

Check the response for provider info:
```json
{
  "answer": "My strengths include...",
  "cached": false,
  "responseTime": 1250,
  "source": "fast",
  "performance": {
    "provider": "groq",
    "free": true
  }
}
```

### 3. Check Logs

In Render deployment logs, you should see:
```
✅ AI Providers initialized: groq, huggingface, together
🆓 Free providers available: groq, huggingface, together
✅ AI generated by groq in 1200ms (FREE)
```

---

## 💡 Best Practices

### 1. Use Multiple Providers

Set up 2-3 free providers for redundancy:
```bash
GROQ_API_KEY=gsk_...
TOGETHER_API_KEY=...
HUGGINGFACE_API_KEY=hf_...
```

**Benefits:**
- If one is down, others work
- Rate limit protection
- Better reliability

### 2. Monitor Usage

Check provider statistics:
```bash
GET /api/answers-optimized/performance
```

Look for:
- Which provider is used most
- Success/failure rates
- Average response times

### 3. Optimize for Speed

**Fastest Setup:**
```bash
# Just Groq - fastest free provider
GROQ_API_KEY=gsk_your_key
```

**Most Reliable Setup:**
```bash
# All free providers + OpenAI backup
GROQ_API_KEY=gsk_your_key
TOGETHER_API_KEY=your_key
HUGGINGFACE_API_KEY=hf_your_key
OPENAI_API_KEY=sk_your_key
```

---

## 🎁 Cost Comparison

### Monthly Costs (1000 interview questions)

| Setup | Monthly Cost | Speed | Reliability |
|-------|-------------|-------|-------------|
| **Only Free (Recommended)** | $0.00 | Fast | High |
| **Free + OpenAI Backup** | ~$2-5 | Very Fast | Very High |
| **Only OpenAI** | ~$15-30 | Fast | High |

### Free Tier Limits

```
Groq:         14,400 requests/day   = 432,000/month  ✅ More than enough
Together:     $25 credits           = ~50,000 calls  ✅ Very generous  
Hugging Face: Unlimited (rate limit) = ~1000/hour   ✅ Good for backup
Cohere:       1000 calls/month                      ⚠️  Use as last resort
```

**Recommendation:** Use Groq as primary (14,400/day is plenty!), Together as backup.

---

## 🔍 Troubleshooting

### Issue: "No AI providers configured"

**Solution:**
1. Check environment variables are set in Render
2. Restart the Render service
3. Check deployment logs for provider initialization

### Issue: "All AI providers failed"

**Possible Causes:**
1. Invalid API keys
2. Rate limit exceeded
3. Network issues

**Debug:**
```bash
# Check provider status
curl https://your-app.com/api/answers-optimized/providers

# Check recent errors in Render logs
```

### Issue: Slow responses

**Solutions:**
1. Use Groq (fastest free provider)
2. Enable caching (should be enabled by default)
3. Use fast mode instead of research mode

### Issue: "Model is loading" (Hugging Face)

**Normal behavior:**
- First request: 20-30 seconds (model loading)
- Subsequent requests: 2-5 seconds

**Solution:**
- Set Groq as priority 1 (always ready)
- Hugging Face as backup

---

## ✅ Verification Checklist

After setup, verify:

- [ ] At least one API key added to Render
- [ ] Service restarted/redeployed
- [ ] `/providers` endpoint shows your providers
- [ ] Test question returns answer with provider name
- [ ] Deployment logs show provider initialization
- [ ] Performance is acceptable (< 3 seconds)

---

## 🆓 Summary: Best Free Setup

**Optimal Configuration (100% FREE):**

```bash
# Step 1: Get Groq API key (5 minutes)
GROQ_API_KEY=gsk_...

# Step 2: Get Together API key (5 minutes)  
TOGETHER_API_KEY=...

# Optional: Hugging Face for unlimited backup
HUGGINGFACE_API_KEY=hf_...
```

**Expected Performance:**
- Response time: 1-2 seconds
- Cost: $0.00
- Reliability: Very High
- Daily limit: 14,400+ requests

**You're all set! 🎉**

---

**Questions?** Check the Render deployment logs or test the `/providers` endpoint to see which providers are active.
