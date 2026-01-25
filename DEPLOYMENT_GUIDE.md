# 🚀 Deployment Guide - IAALearn

Complete guide to deploy your Interview Answer Assistant to Render, Fly.io, or Railway.

---

## 📋 Prerequisites

Before deploying, ensure you have:
- ✅ Git repository (GitHub recommended)
- ✅ Node.js application ready
- ✅ Environment variables prepared
- ✅ OpenAI API key (for AI features)

---

## 🎯 Quick Comparison

| Platform | Best For | Free Tier | Database | Pros |
|----------|----------|-----------|----------|------|
| **Render** | Beginners | ✅ Yes | PostgreSQL Free | Easy setup, auto-deploy |
| **Railway** | Fast deploy | ✅ $5 credit | PostgreSQL included | Fastest setup |
| **Fly.io** | Advanced | ✅ Limited | External DB | Most control, global edge |

---

## 🟣 Option 1: Deploy to Render (Recommended for Beginners)

### Step 1: Prepare Your Repository

1. **Push to GitHub** (if not already):
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. **Create `render.yaml`** (already exists in project root):
```yaml
services:
  # Web Service (Backend + Frontend)
  - type: web
    name: iaalearn
    env: node
    region: oregon
    plan: free
    buildCommand: npm install && cd client && npm install && npm run build && cd ..
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      - key: DEMO_MODE
        value: true
      - key: CLIENT_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: OPENAI_API_KEY
        sync: false

databases:
  # PostgreSQL Database (Optional)
  - name: iaalearn-db
    plan: free
    databaseName: interview_assistant
    user: iaalearn
```

### Step 2: Deploy on Render

1. **Sign up**: Go to [render.com](https://render.com) and sign up with GitHub

2. **New Blueprint**:
   - Click "New +"
   - Select "Blueprint"
   - Connect your GitHub repository
   - Select the repository: `jossy450/IAALearn`

3. **Configure Environment Variables**:
   - Render will read from `render.yaml`
   - Add these in the dashboard:
     - `OPENAI_API_KEY`: Your OpenAI API key
     - `CLIENT_URL`: Will be `https://your-app-name.onrender.com`
     - `JWT_SECRET`: Auto-generated (or set your own)
     - `DEMO_MODE`: `true` (or `false` if using database)

4. **Deploy**:
   - Click "Apply" to create services
   - Wait 5-10 minutes for build
   - Your app will be live at: `https://iaalearn.onrender.com`

### Step 3: Connect Database (Optional)

If you want to use PostgreSQL instead of demo mode:

1. **Get Database URL** from Render dashboard
2. **Update Environment Variables**:
   ```
   DEMO_MODE=false
   DATABASE_URL=<your-postgres-url-from-render>
   ```
3. **Run Migrations**:
   - Go to Shell in Render dashboard
   - Run: `npm run db:migrate`

### Step 4: Update Client URL

After deployment:
1. Copy your app URL (e.g., `https://iaalearn.onrender.com`)
2. Update `CLIENT_URL` environment variable to this URL
3. Redeploy

---

## 🚂 Option 2: Deploy to Railway (Fastest Setup)

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### Step 2: Initialize Project

```bash
cd /workspaces/IAALearn
railway init
```

### Step 3: Add PostgreSQL (Optional)

```bash
railway add postgresql
```

### Step 4: Set Environment Variables

```bash
# Required
railway variables set NODE_ENV=production
railway variables set DEMO_MODE=true
railway variables set JWT_SECRET=$(openssl rand -hex 32)

# Optional (for full features)
railway variables set OPENAI_API_KEY=your_key_here
railway variables set PERPLEXITY_API_KEY=your_key_here
```

### Step 5: Deploy

```bash
railway up
```

### Step 6: Get Your URL

```bash
railway domain
```

Your app will be live at: `https://your-app.up.railway.app`

### Step 7: Update CLIENT_URL

```bash
railway variables set CLIENT_URL=https://your-app.up.railway.app
```

---

## ✈️ Option 3: Deploy to Fly.io (Most Control)

### Step 1: Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
fly auth signup  # or fly auth login
```

### Step 2: Launch App

```bash
cd /workspaces/IAALearn
fly launch
```

Answer the prompts:
- App name: `iaalearn` (or your choice)
- Region: Choose closest to you
- PostgreSQL: Yes (optional)
- Deploy now: No (configure first)

### Step 3: Configure `fly.toml`

The file is already created. Update if needed:

```toml
app = "iaalearn"
primary_region = "sjc"

[build]
  [build.args]
    NODE_VERSION = "18"

[env]
  NODE_ENV = "production"
  PORT = "3001"
  DEMO_MODE = "true"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

### Step 4: Set Secrets

```bash
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly secrets set OPENAI_API_KEY=your_key_here
fly secrets set CLIENT_URL=https://iaalearn.fly.dev
```

### Step 5: Deploy

```bash
fly deploy
```

### Step 6: Check Status

```bash
fly status
fly logs
```

Your app: `https://iaalearn.fly.dev`

---

## 🔧 Post-Deployment Configuration

### 1. Update OAuth Redirect URLs

If using Google/GitHub OAuth:

**Google Cloud Console**:
- Authorized redirect URIs: `https://your-app-url.com/api/auth/google/callback`

**GitHub Settings**:
- Authorization callback URL: `https://your-app-url.com/api/auth/github/callback`

### 2. Test Your Deployment

```bash
# Test health endpoint
curl https://your-app-url.com/health

# Test registration
curl -X POST https://your-app-url.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","fullName":"Test User"}'
```

### 3. Enable HTTPS

All three platforms provide automatic HTTPS. Ensure:
- `force_https = true` (Fly.io)
- HTTPS is enabled in dashboard (Render/Railway)

### 4. Set Up Custom Domain (Optional)

#### Render:
1. Go to Settings → Custom Domain
2. Add your domain
3. Update DNS records

#### Railway:
```bash
railway domain add yourdomain.com
```

#### Fly.io:
```bash
fly certs add yourdomain.com
```

---

## 🗄️ Database Setup

### Option A: Use Demo Mode (No Database)
```
DEMO_MODE=true
```
- ✅ Instant setup
- ✅ No database costs
- ⚠️ Data lost on restart
- ⚠️ Single instance only

### Option B: PostgreSQL Database

1. **Get Database URL** from your platform
2. **Set Environment Variables**:
   ```
   DEMO_MODE=false
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   ```
3. **Run Migrations**:
   
   **Render**: Use Shell in dashboard
   ```bash
   npm run db:migrate
   ```
   
   **Railway**: 
   ```bash
   railway run npm run db:migrate
   ```
   
   **Fly.io**:
   ```bash
   fly ssh console
   npm run db:migrate
   ```

---

## 🔒 Environment Variables Checklist

### Required
- [x] `NODE_ENV=production`
- [x] `PORT=3001`
- [x] `JWT_SECRET=<random-secret>`
- [x] `CLIENT_URL=<your-app-url>`
- [x] `DEMO_MODE=true` or `false`

### Optional (for full features)
- [ ] `OPENAI_API_KEY=<your-key>`
- [ ] `PERPLEXITY_API_KEY=<your-key>`
- [ ] `DATABASE_URL=<postgres-url>`
- [ ] `GOOGLE_CLIENT_ID=<oauth-id>`
- [ ] `GOOGLE_CLIENT_SECRET=<oauth-secret>`
- [ ] `GITHUB_CLIENT_ID=<oauth-id>`
- [ ] `GITHUB_CLIENT_SECRET=<oauth-secret>`

---

## 🐛 Troubleshooting

### Build Fails

**Issue**: Build timeout or memory error

**Solution**:
```bash
# Increase build resources (Render/Railway)
# Or split build commands:
npm install
cd client && npm install && npm run build
```

### Database Connection Fails

**Issue**: Can't connect to database

**Solution**:
```bash
# Test connection
psql $DATABASE_URL

# Check environment variables
echo $DATABASE_URL

# Verify DEMO_MODE
echo $DEMO_MODE
```

### OAuth Not Working

**Issue**: OAuth redirects fail

**Solution**:
1. Check `CLIENT_URL` matches your deployed URL
2. Update OAuth app redirect URIs
3. Verify callback route: `/auth/callback`

### App Crashes on Start

**Issue**: Application won't start

**Solution**:
```bash
# Check logs
# Render: Dashboard → Logs
# Railway: railway logs
# Fly.io: fly logs

# Common issues:
# - Missing NODE_ENV
# - Wrong PORT
# - Database connection (set DEMO_MODE=true)
```

---

## 📊 Monitoring

### Render
- Dashboard → Logs
- Dashboard → Metrics
- Email alerts available

### Railway
```bash
railway logs
railway status
```

### Fly.io
```bash
fly logs
fly status
fly dashboard
```

---

## 💰 Cost Estimates

### Free Tier Limits

**Render**:
- 750 hours/month
- Sleeps after 15min inactivity
- 512MB RAM

**Railway**:
- $5 free credit/month
- Pay only for usage
- No sleep time

**Fly.io**:
- 3 shared VMs free
- 160GB transfer
- May need credit card

### Paid Plans

**For Production** (~$7-20/month):
- Render: Starter ($7/month)
- Railway: Usage-based (~$5-10/month)
- Fly.io: ~$2-5/month per VM

---

## 🎯 Recommended Workflow

1. **Start with Demo Mode** (`DEMO_MODE=true`)
2. **Deploy to Railway** (fastest, easiest)
3. **Test thoroughly**
4. **Add PostgreSQL** when ready
5. **Set up custom domain**
6. **Enable monitoring**

---

## 🚀 Quick Start Commands

### For Railway (Recommended):
```bash
npm install -g @railway/cli
railway login
railway init
railway variables set DEMO_MODE=true NODE_ENV=production
railway up
railway domain
```

### For Render:
1. Push to GitHub
2. New Blueprint → Connect repo
3. Deploy

### For Fly.io:
```bash
fly launch
fly secrets set DEMO_MODE=true
fly deploy
```

---

## 📞 Support

- **Render**: [render.com/docs](https://render.com/docs)
- **Railway**: [docs.railway.app](https://docs.railway.app)
- **Fly.io**: [fly.io/docs](https://fly.io/docs)

---

## ✅ Deployment Checklist

Before going live:

- [ ] Git repository pushed to GitHub
- [ ] Environment variables configured
- [ ] JWT_SECRET generated
- [ ] CLIENT_URL set correctly
- [ ] Database migrated (if not using demo mode)
- [ ] OAuth configured (if using)
- [ ] HTTPS enabled
- [ ] Test registration/login
- [ ] Test QR transfer feature
- [ ] Monitor logs for errors

---

**Need help?** Check the logs first, then consult platform-specific documentation!
