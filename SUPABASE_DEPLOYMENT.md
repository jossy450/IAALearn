# 🚀 Supabase + Hoganhost Deployment Guide

## Overview
- **Database**: Supabase (Free PostgreSQL hosting)
- **Application**: Hoganhost Shared Hosting
- **Domain**: mightskytech.com
- **Cost**: FREE (Supabase free tier + your existing Hoganhost plan)

---

## Part 1: Setup Supabase PostgreSQL Database

### Step 1: Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign in with GitHub (recommended) or email
4. Free tier includes:
   - 500MB database space
   - 1GB file storage
   - 50,000 monthly active users
   - Unlimited API requests

### Step 2: Create New Project

1. Click **"New Project"**
2. Fill in details:
   ```
   Project Name: IAALearn
   Database Password: [Generate strong password - SAVE THIS!]
   Region: Choose closest to your location
   Plan: Free
   ```
3. Click **"Create new project"**
4. Wait 2-3 minutes for setup to complete

### Step 3: Get Database Connection String

1. In your Supabase project dashboard
2. Click **"Settings"** (gear icon) → **"Database"**
3. Scroll to **"Connection string"** section
4. Select **"URI"** tab
5. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklm.supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with the password you set in Step 2

### Step 4: Run Database Migrations

**Option A: Using Supabase SQL Editor (Easiest)**

1. In Supabase dashboard, click **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Copy and paste the entire contents of `server/database/schema.sql`
4. Click **"Run"** or press Ctrl/Cmd + Enter
5. You should see: `Success. No rows returned`

**Option B: Using Local psql**

```bash
# From your IAALearn project directory
psql "postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres" < server/database/schema.sql
```

### Step 5: Verify Database Setup

1. In Supabase, click **"Table Editor"** (left sidebar)
2. You should see these tables:
   - users
   - interview_sessions
   - questions
   - answer_cache
   - session_transfers
   - privacy_settings
   - performance_metrics

---

## Part 2: Configure Your Application

### Step 1: Update Environment Variables

Create `.env.production` file:

```env
# ═══════════════════════════════════════════════
# Production Configuration for mightskytech.com
# Using Supabase PostgreSQL + Hoganhost Hosting
# ═══════════════════════════════════════════════

# Server Configuration
NODE_ENV=production
PORT=3001

# Domain Configuration
CLIENT_URL=https://mightskytech.com

# Supabase Database Configuration
DEMO_MODE=false
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[YOUR-PASSWORD]

# Security (Generate new JWT secret)
JWT_SECRET=your_jwt_secret_here_generate_with_openssl

# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret
GITHUB_CLIENT_ID=Iv1.your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# AI Services (Optional)
OPENAI_API_KEY=your_openai_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Performance Settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CACHE_TTL_SECONDS=3600
ENABLE_CACHING=true
```

**Generate JWT Secret:**
```bash
openssl rand -hex 32
```

### Step 2: Test Database Connection Locally

```bash
# Update your local .env with Supabase credentials
# Then test the connection
npm run dev

# Try to register a user
# If successful, your Supabase connection works!
```

---

## Part 3: Deploy to Hoganhost Shared Hosting

### Prerequisites
- Node.js support enabled in cPanel (contact Hoganhost if needed)
- FTP/SFTP access credentials
- Domain mightskytech.com configured

### Step 1: Build Application

```bash
# From your project root
cd client
npm install
npm run build
cd ..
```

### Step 2: Prepare Deployment Package

```bash
# Create deployment directory
mkdir -p deploy-package

# Copy server files
cp -r server deploy-package/
cp package.json package-lock.json deploy-package/

# Copy built client
cp -r client/dist deploy-package/client-dist

# Copy environment file
cp .env.production deploy-package/.env

# Create archive
tar -czf hoganhost-deploy.tar.gz deploy-package/
```

### Step 3: Upload to Hoganhost

**Using FTP/SFTP:**

1. Connect to Hoganhost via FTP (FileZilla, Cyberduck, or cPanel File Manager)
2. Navigate to `public_html` or your domain's root directory
3. Upload `hoganhost-deploy.tar.gz`
4. Extract the archive (via cPanel File Manager or SSH)
5. Move contents of `deploy-package/` to root

**File structure should be:**
```
public_html/
├── server/
├── client-dist/
├── package.json
├── package-lock.json
└── .env
```

### Step 4: Configure Node.js Application in cPanel

1. Log in to cPanel
2. Find **"Setup Node.js App"** or **"Node.js Selector"**
3. Click **"Create Application"**
4. Configure:
   ```
   Node.js version: 18.x or 20.x (latest available)
   Application mode: Production
   Application root: public_html (or your app directory)
   Application URL: mightskytech.com
   Application startup file: server/index.js
   ```
5. Click **"Create"**

### Step 5: Install Dependencies

In cPanel's Node.js app interface:
1. Click **"Run NPM Install"**
2. Wait for dependencies to install
3. Or via SSH:
   ```bash
   cd public_html
   npm install --production
   ```

### Step 6: Configure Environment Variables (cPanel)

In cPanel Node.js App settings, add these environment variables:
- `NODE_ENV` = `production`
- `PORT` = `3001`
- `DATABASE_URL` = `[Your Supabase connection string]`
- `CLIENT_URL` = `https://mightskytech.com`
- `JWT_SECRET` = `[Your generated secret]`

### Step 7: Start Application

1. In cPanel Node.js App interface
2. Click **"Start"** or **"Restart"**
3. Application should now be running!

### Step 8: Configure .htaccess for Routing

Create `.htaccess` in `public_html`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # API requests go to Node.js app
  RewriteCond %{REQUEST_URI} ^/api/
  RewriteRule ^(.*)$ http://localhost:3001/$1 [P,L]
  
  # Static files from React build
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ client-dist/index.html [L]
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "DENY"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>
```

---

## Part 4: Setup OAuth (Google & GitHub)

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "IAALearn"
3. Enable **Google+ API** or **People API**
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Application type: **Web application**
6. Authorized redirect URIs:
   ```
   https://mightskytech.com/api/auth/google/callback
   ```
7. Copy **Client ID** and **Client Secret**
8. Update `.env` file on server

### GitHub OAuth Setup

1. Go to [GitHub Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in:
   ```
   Application name: IAALearn
   Homepage URL: https://mightskytech.com
   Authorization callback URL: https://mightskytech.com/api/auth/github/callback
   ```
4. Click **Register application**
5. Click **Generate a new client secret**
6. Copy **Client ID** and **Client Secret**
7. Update `.env` file on server

---

## Part 5: Enable SSL Certificate

### Using cPanel SSL/TLS

1. In cPanel, go to **"SSL/TLS Status"**
2. Select your domain: `mightskytech.com`
3. Click **"Run AutoSSL"** (Let's Encrypt)
4. Wait for certificate to be issued
5. Verify HTTPS works: `https://mightskytech.com`

---

## Part 6: Testing Your Deployment

### Test Checklist

- [ ] Visit https://mightskytech.com (should load without errors)
- [ ] Test registration with email/password
- [ ] Test Google OAuth login
- [ ] Test GitHub OAuth login
- [ ] Create new interview session
- [ ] Test QR transfer feature
- [ ] Check database in Supabase (users table should have entries)
- [ ] Test on mobile device
- [ ] Check browser console for errors

### Monitor Application

**Check Logs in cPanel:**
- Node.js App → **View Logs**
- Error logs will show any issues

**Monitor Supabase:**
- Dashboard → **Table Editor** (see data)
- Dashboard → **Database** → **Database Performance**
- Dashboard → **Auth** (if using Supabase auth later)

---

## Troubleshooting

### Database Connection Failed

```bash
# Test Supabase connection
psql "postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres" -c "SELECT 1;"
```

**Common fixes:**
- Check password has no special characters that need escaping
- Verify connection string format
- Check Supabase project is not paused (free tier pauses after 7 days inactivity)

### Application Won't Start

1. Check Node.js version (should be 18+)
2. Verify all environment variables are set
3. Check cPanel error logs
4. Ensure `npm install` completed successfully

### OAuth Errors

- Verify redirect URIs match exactly (including https://)
- Check CLIENT_URL in .env matches your domain
- Ensure OAuth credentials are correct

### Static Files Not Loading

- Verify `.htaccess` is in place
- Check `client-dist/` directory contains built files
- Clear browser cache

---

## Maintenance

### Update Application

```bash
# Pull latest from GitHub
git pull origin main

# Rebuild client
cd client && npm install && npm run build && cd ..

# Re-upload to Hoganhost
# Restart Node.js app in cPanel
```

### Database Backups

Supabase automatically backs up your database. To download:
1. Dashboard → **Database** → **Backups**
2. Download backup file
3. Store securely

### Monitor Free Tier Limits

Check Supabase dashboard for:
- Database size (500MB limit)
- Monthly active users (50,000 limit)
- If approaching limits, consider upgrading

---

## Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| Supabase | Free Tier | $0/month |
| Hoganhost | Your existing plan | Already paid |
| SSL Certificate | Let's Encrypt | $0/month |
| **Total** | | **$0/month additional** |

---

## Next Steps

1. ✅ Create Supabase account and project
2. ✅ Run database migrations in Supabase
3. ✅ Build your application
4. ✅ Upload to Hoganhost
5. ✅ Configure Node.js app in cPanel
6. ✅ Setup OAuth apps
7. ✅ Enable SSL
8. ✅ Test everything!

---

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Hoganhost Support**: Contact via their portal
- **IAALearn Issues**: https://github.com/jossy450/IAALearn/issues

---

**Estimated Setup Time**: 1-2 hours
**Difficulty**: Medium (step-by-step guidance provided)
