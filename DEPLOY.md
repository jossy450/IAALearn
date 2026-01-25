# 🚀 Quick Deploy Guide

Choose your platform and follow the steps:

## 🟣 Render (Easiest - Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy**:
   - Go to [render.com](https://render.com)
   - Click "New +" → "Blueprint"
   - Connect your GitHub repo
   - Click "Apply"

3. **Set Environment Variables** in Render dashboard:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `CLIENT_URL`: Your app URL (e.g., `https://iaalearn.onrender.com`)

4. **Done!** Visit your app URL

---

## 🚂 Railway (Fastest)

1. **Run deployment script**:
   ```bash
   ./deploy-railway.sh
   ```

2. **Or manually**:
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   railway variables set DEMO_MODE=true NODE_ENV=production
   railway up
   railway domain
   ```

3. **Set CLIENT_URL**:
   ```bash
   railway variables set CLIENT_URL=https://your-app.up.railway.app
   ```

---

## ✈️ Fly.io (Most Control)

1. **Run deployment script**:
   ```bash
   ./deploy-flyio.sh
   ```

2. **Or manually**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   fly launch
   fly secrets set DEMO_MODE=true
   fly deploy
   ```

---

## 🔑 Required Environment Variables

```bash
NODE_ENV=production
DEMO_MODE=true                    # Set to false if using database
JWT_SECRET=<random-32-char-string>
CLIENT_URL=https://your-app-url.com
OPENAI_API_KEY=<your-openai-key>   # Optional but needed for AI
```

---

## ✅ Quick Test

After deployment:

```bash
# Test health
curl https://your-app-url.com/health

# Test registration
curl -X POST https://your-app-url.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","fullName":"Test User"}'
```

---

## 📚 Full Documentation

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete instructions.

---

## 🆘 Need Help?

- **Render**: Check dashboard logs
- **Railway**: Run `railway logs`
- **Fly.io**: Run `fly logs`
