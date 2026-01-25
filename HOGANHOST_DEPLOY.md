# 🚀 Deploy to Hoganhost (mightskytech.com)

Complete guide to deploy IAALearn to your Hoganhost account.

---

## 📋 Prerequisites

- ✅ Hoganhost hosting account
- ✅ Domain: mightskytech.com
- ✅ SSH/FTP access
- ✅ Node.js support on hosting (check with Hoganhost)

---

## 🎯 Option 1: Deploy to Subdomain (Recommended)

### Setup: `app.mightskytech.com` or `interview.mightskytech.com`

**Why subdomain?**
- Keeps main site separate
- Easier SSL setup
- Better for Node.js apps

### Steps:

#### 1. Create Subdomain in cPanel

1. Log in to Hoganhost cPanel
2. Go to **Domains** → **Subdomains**
3. Create subdomain:
   - Subdomain: `app` (or `interview`)
   - Domain: `mightskytech.com`
   - Document Root: `/public_html/app`

#### 2. Setup Node.js Application (if supported)

1. In cPanel, find **Setup Node.js App**
2. Create Application:
   - Node.js version: 18.x or higher
   - Application mode: Production
   - Application root: `app`
   - Application URL: `app.mightskytech.com`
   - Application startup file: `server/index.js`

#### 3. Upload Your Files

**Via FTP/SFTP:**
```bash
# On your local machine
cd /workspaces/IAALearn

# Build the client
cd client && npm run build && cd ..

# Create deployment package
tar -czf iaalearn.tar.gz \
  --exclude=node_modules \
  --exclude=client/node_modules \
  --exclude=.git \
  --exclude=.env \
  .

# Upload iaalearn.tar.gz to your hosting
```

**Via SSH (if available):**
```bash
# SSH into your hosting
ssh your-username@mightskytech.com

# Navigate to app directory
cd public_html/app

# Upload and extract
# (after uploading via FTP or using wget/curl)
tar -xzf iaalearn.tar.gz

# Install dependencies
npm install --production
cd client && npm install && npm run build && cd ..
```

#### 4. Setup Environment Variables

Create `.env` file in `/public_html/app`:

```bash
# Production Configuration
NODE_ENV=production
PORT=3001

# Your Domain
CLIENT_URL=https://app.mightskytech.com

# Demo Mode (no database required)
DEMO_MODE=true

# Security
JWT_SECRET=your-random-32-character-secret-here

# AI Services (optional)
OPENAI_API_KEY=your_openai_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 5. Start the Application

**If Node.js App Manager available:**
- Click "Restart" in cPanel Node.js interface

**If using PM2 (via SSH):**
```bash
# Install PM2 globally
npm install -g pm2

# Start app
pm2 start server/index.js --name iaalearn

# Save PM2 configuration
pm2 save

# Setup auto-restart
pm2 startup
```

#### 6. Configure Reverse Proxy

In cPanel, go to **Apache Configuration** or create `.htaccess`:

```apache
# /public_html/app/.htaccess
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3001/$1 [P,L]
```

#### 7. Setup SSL Certificate

1. In cPanel → **SSL/TLS**
2. Use **Let's Encrypt** (free)
3. Enable for `app.mightskytech.com`

---

## 🎯 Option 2: Deploy on Main Domain

### Setup: `mightskytech.com/app`

#### 1. Upload to Subfolder

Upload app files to: `/public_html/app`

#### 2. Update Environment

```bash
CLIENT_URL=https://mightskytech.com
```

#### 3. Configure .htaccess

```apache
# /public_html/app/.htaccess
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /app/
  
  # Proxy to Node.js
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ http://localhost:3001/app/$1 [P,L]
</IfModule>
```

---

## 🎯 Option 3: Use VPS/Dedicated Server (Best)

If Hoganhost offers VPS or you want full control:

### Setup Process:

#### 1. SSH into Server

```bash
ssh root@your-server-ip
# or
ssh username@mightskytech.com
```

#### 2. Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

#### 3. Clone Your Repository

```bash
cd /var/www
git clone https://github.com/jossy450/IAALearn.git
cd IAALearn
```

#### 4. Install Dependencies & Build

```bash
# Install server dependencies
npm install --production

# Install client dependencies and build
cd client
npm install
npm run build
cd ..
```

#### 5. Setup Environment

```bash
nano .env
```

Add:
```bash
NODE_ENV=production
PORT=3001
CLIENT_URL=https://mightskytech.com
DEMO_MODE=true
JWT_SECRET=$(openssl rand -hex 32)
OPENAI_API_KEY=your_key_here
```

#### 6. Install & Configure PM2

```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start server/index.js --name iaalearn

# Configure startup
pm2 startup systemd
pm2 save

# Monitor
pm2 status
pm2 logs iaalearn
```

#### 7. Configure Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/mightskytech.com
```

Add:
```nginx
server {
    listen 80;
    server_name mightskytech.com www.mightskytech.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/mightskytech.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 8. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d mightskytech.com -d www.mightskytech.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## 🔧 Configuration for mightskytech.com

Update these files for your domain:

### Update .env
```bash
CLIENT_URL=https://mightskytech.com
# or
CLIENT_URL=https://app.mightskytech.com
```

### Update render.yaml (if using cloud later)
```yaml
envVars:
  - key: CLIENT_URL
    value: https://mightskytech.com
```

---

## 📝 Database Setup (PostgreSQL - Required for OAuth)

### Step 1: Create PostgreSQL Database in cPanel

1. Log in to Hoganhost cPanel
2. Go to **PostgreSQL Databases**
3. Create new database:
   - Database name: `iaalearn_db` (cPanel may prefix with your username)
   - Note the full database name (e.g., `username_iaalearn_db`)

4. Create database user:
   - Username: `iaalearn_user`
   - Password: Generate strong password (save it!)
   - Note: cPanel may prefix username

5. Add user to database:
   - Select user: `iaalearn_user`
   - Select database: `iaalearn_db`
   - Grant **ALL PRIVILEGES**

6. Note your connection details:
   - Host: `localhost` (or check cPanel for specific host)
   - Port: `5432` (default PostgreSQL port)
   - Database: Your full database name
   - Username: Your full username
   - Password: The password you created

### Step 2: Update .env with Database Connection

```bash
# IMPORTANT: Set to false to use database
DEMO_MODE=false

# PostgreSQL Connection
DATABASE_URL=postgresql://username_iaalearn_user:your_password@localhost:5432/username_iaalearn_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=username_iaalearn_db
DB_USER=username_iaalearn_user
DB_PASSWORD=your_password
```

### Step 3: Run Database Migrations

**Via SSH:**
```bash
cd /path/to/your/app
npm run db:migrate
```

**Or manually via psql:**
```bash
# Connect to database
psql -h localhost -U username_iaalearn_user -d username_iaalearn_db

# Copy and paste the contents of server/database/schema.sql
\i server/database/schema.sql

# Exit
\q
```

**Or via phpPgAdmin (if available in cPanel):**
1. Open phpPgAdmin
2. Select your database
3. Go to SQL tab
4. Copy contents from `server/database/schema.sql`
5. Execute

### Step 4: Verify Database Setup

```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"

# Check tables
psql $DATABASE_URL -c "\dt"

# Should see tables:
# - users
# - interview_sessions
# - questions
# - answer_cache
# - session_transfers
# - privacy_settings
# - performance_metrics
```

---

## 🔐 OAuth Setup (Google & GitHub)

### Prerequisites
- ✅ PostgreSQL database configured (above)
- ✅ DEMO_MODE=false in .env
- ✅ Domain with SSL (https://mightskytech.com)

### Google OAuth Setup

#### 1. Create Google OAuth Application

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "IAALearn" (or use existing)
3. Enable APIs:
   - Go to **APIs & Services** → **Library**
   - Search and enable: **Google+ API** or **People API**

4. Create OAuth Credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: "IAALearn Production"
   
5. Configure OAuth Consent Screen (if not done):
   - User Type: **External**
   - App name: "Interview Answer Assistant"
   - User support email: your email
   - Developer contact: your email
   - Scopes: email, profile
   - Add test users if in development

6. Set Authorized redirect URIs:
   ```
   https://mightskytech.com/api/auth/google/callback
   https://app.mightskytech.com/api/auth/google/callback
   ```

7. Save and copy:
   - **Client ID**: `xxxxx.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-xxxxx`

#### 2. Update .env with Google Credentials

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
```

### GitHub OAuth Setup

#### 1. Create GitHub OAuth Application

1. Go to [GitHub Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in details:
   - Application name: "IAALearn"
   - Homepage URL: `https://mightskytech.com`
   - Authorization callback URL: 
     ```
     https://mightskytech.com/api/auth/github/callback
     ```
   - (Add both if using subdomain):
     ```
     https://app.mightskytech.com/api/auth/github/callback
     ```

4. Register application

5. Copy credentials:
   - **Client ID**: `Iv1.xxxxx`
   - **Client Secret**: Click "Generate a new client secret"

#### 2. Update .env with GitHub Credentials

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=Iv1.your_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Complete .env Configuration

Here's your full production `.env` with database and OAuth:

```bash
# Production Configuration
NODE_ENV=production
PORT=3001

# Domain Configuration
CLIENT_URL=https://mightskytech.com

# Database Configuration (PostgreSQL)
DEMO_MODE=false
DATABASE_URL=postgresql://username_iaalearn_user:your_password@localhost:5432/username_iaalearn_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=username_iaalearn_db
DB_USER=username_iaalearn_user
DB_PASSWORD=your_secure_password

# Security
JWT_SECRET=your_random_32_character_secret_string_here

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=Iv1.your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# AI Services
OPENAI_API_KEY=sk-your_openai_api_key_here
PERPLEXITY_API_KEY=pplx-your_perplexity_api_key_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cache Configuration
CACHE_TTL_SECONDS=3600
ENABLE_CACHING=true
```

### Restart Application

```bash
# If using PM2
pm2 restart iaalearn

# Check logs
pm2 logs iaalearn
```

---

## 🧪 Testing OAuth Integration

### 1. Test Database Connection

```bash
# Via app health check
curl https://mightskytech.com/health

# Via database directly
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

### 2. Test Google OAuth

1. Open browser: `https://mightskytech.com/login`
2. Click **"Sign in with Google"** button
3. Should redirect to Google login
4. After login, should redirect back and create user in database

### 3. Test GitHub OAuth

1. Open browser: `https://mightskytech.com/login`
2. Click **"Sign in with GitHub"** button
3. Should redirect to GitHub authorization
4. After authorization, should redirect back and create user

### 4. Verify User Created in Database

```bash
# Check users table
psql $DATABASE_URL -c "SELECT email, provider, created_at FROM users ORDER BY created_at DESC LIMIT 5;"

# Should see users with provider 'google' or 'github'
```

---

## 🔧 OAuth Troubleshooting

### Issue: "Redirect URI mismatch"

**Solution:**
- Check CLIENT_URL in .env matches redirect URI in OAuth app
- Ensure using HTTPS, not HTTP
- Check for trailing slashes (remove them)
- Wait 5 minutes after updating OAuth settings

### Issue: OAuth works but user not saved

**Solution:**
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1;"

# Verify users table exists
psql $DATABASE_URL -c "\d users"

# Check application logs
pm2 logs iaalearn --lines 50
```

### Issue: "Invalid client" error

**Solution:**
- Verify CLIENT_ID and CLIENT_SECRET in .env
- No extra spaces or quotes in credentials
- Restart application after updating .env

### Issue: Database connection fails

**Solution:**
```bash
# Test connection string
psql $DATABASE_URL

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database exists
psql -U postgres -c "\l"

# Grant permissions if needed
psql -U postgres -d username_iaalearn_db -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO username_iaalearn_user;"
```

---

## 🧪 Testing Your Deployment

### 1. Check Health Endpoint

```bash
curl https://mightskytech.com/health
# or
curl https://app.mightskytech.com/health
```

### 2. Test Registration

```bash
curl -X POST https://mightskytech.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","fullName":"Test User"}'
```

### 3. Visit Your App

Open browser:
- Main domain: https://mightskytech.com
- Subdomain: https://app.mightskytech.com

---

## 🐛 Troubleshooting

### Issue: Node.js not available

**Solution**: Contact Hoganhost support to enable Node.js or upgrade to VPS plan

### Issue: Permission denied

**Solution**: 
```bash
chmod -R 755 /public_html/app
chown -R username:username /public_html/app
```

### Issue: App not starting

**Solution**:
```bash
# Check logs
pm2 logs iaalearn

# Check port
netstat -tulpn | grep 3001

# Restart
pm2 restart iaalearn
```

### Issue: SSL not working

**Solution**:
1. Check cPanel SSL/TLS status
2. Force HTTPS in .htaccess:
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

## 📊 Recommended Architecture

```
mightskytech.com (Main Site)
    │
    ├── / (Your main website)
    │
    └── app.mightskytech.com (Interview Assistant)
        ├── Node.js Application (Port 3001)
        ├── PM2 Process Manager
        ├── Nginx Reverse Proxy
        └── SSL Certificate (Let's Encrypt)
```

---

## 💰 Hosting Requirements

**Minimum:**
- Node.js 16+ support
- 512MB RAM
- 1GB storage
- SSL certificate

**Recommended:**
- Node.js 18+
- 1GB+ RAM
- 5GB storage
- VPS or dedicated server

---

## 🚀 Quick Deploy Script for VPS

Save as `deploy-hoganhost.sh`:

```bash
#!/bin/bash

echo "🚀 Deploying to mightskytech.com..."

# Variables
DOMAIN="mightskytech.com"
APP_DIR="/var/www/IAALearn"
NODE_VERSION="18"

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone or pull repository
if [ -d "$APP_DIR" ]; then
    cd $APP_DIR && git pull
else
    git clone https://github.com/jossy450/IAALearn.git $APP_DIR
    cd $APP_DIR
fi

# Install dependencies
npm install --production
cd client && npm install && npm run build && cd ..

# Setup environment
cat > .env << EOF
NODE_ENV=production
PORT=3001
CLIENT_URL=https://${DOMAIN}
DEMO_MODE=true
JWT_SECRET=$(openssl rand -hex 32)
EOF

# Start with PM2
pm2 stop iaalearn 2>/dev/null || true
pm2 start server/index.js --name iaalearn
pm2 save

echo "✅ Deployment complete!"
echo "🌐 Your app: https://${DOMAIN}"
```

---

## 📞 Contact Hoganhost Support

For assistance with:
- Enabling Node.js
- Setting up reverse proxy
- SSL certificate issues
- Server configuration

**Hoganhost Support**: Check their website for contact details

---

## ✅ Deployment Checklist

- [ ] Choose deployment option (subdomain/main domain/VPS)
- [ ] Upload files to hosting
- [ ] Install Node.js dependencies
- [ ] Configure environment variables
- [ ] Setup reverse proxy (if needed)
- [ ] Enable SSL certificate
- [ ] Start application (PM2 or cPanel)
- [ ] Test health endpoint
- [ ] Test user registration
- [ ] Configure domain DNS if needed
- [ ] Monitor application logs

---

**Your app will be live at**: `https://mightskytech.com` or `https://app.mightskytech.com` 🎉
