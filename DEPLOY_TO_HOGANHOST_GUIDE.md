# 🚀 Complete Hoganhost Deployment Guide

## SSH Access Setup - mightysk@mightskytech.com

### Step 1: Test SSH Connection

Open your terminal and run:
```bash
ssh mightysk@mightskytech.com
```

**What happens?**
- ✅ If prompted for password: Enter your password
- ✅ If you get a shell prompt: SSH is working! Continue to Step 2
- ❌ If "Connection refused": Contact Hoganhost to enable SSH
- ❌ If timeout: Check your internet connection

---

## Step 2: Check Current Server Setup

Once logged in via SSH, run these commands one by one:

```bash
# Check current directory
pwd

# Check Node.js version
node --version

# Check npm version
npm --version

# Check if PM2 is installed
pm2 --version

# Check what's in your web directory
ls -la ~/public_html/

# Check if ialearn is already deployed
ls -la ~/public_html/ialearn/ 2>/dev/null || echo "ialearn directory not found"
```

**Copy and paste the output of all these commands and send it to me.**

---

## Step 3: Check if App is Already Running

```bash
# Check for running Node.js processes
ps aux | grep node

# Check if PM2 is managing processes
pm2 list

# Check what's listening on port 3001
netstat -tuln | grep 3001 || ss -tuln | grep 3001
```

---

## Step 4: Locate Your App Files

```bash
# Find where the app might be installed
find ~/public_html -name "package.json" -type f 2>/dev/null

# Check if there's an ialearn folder
ls -la ~/public_html/ialearn/ 2>/dev/null

# Check subdomain folders
ls -la ~/public_html/
```

---

## Step 5: Install/Update the Application

### If Node.js is NOT installed or version is < 16:

**Contact Hoganhost Support** to:
1. Enable Node.js (version 18 or higher)
2. Enable PM2 or process management

### If Node.js IS installed:

**Option A: Fresh Installation**

```bash
# Navigate to web directory
cd ~/public_html/ialearn/

# If directory doesn't exist, create it
mkdir -p ~/public_html/ialearn
cd ~/public_html/ialearn/

# Clone or download your code
# (You'll need to upload via FTP or use git)
```

**Option B: Upload via Git**

```bash
cd ~/public_html/ialearn/

# If git is available
git clone https://github.com/jossy450/IAALearn.git .

# Or if already cloned
git pull origin main
```

**Option C: Upload Files Manually**

I'll create a deployment package for you to upload via FTP.

---

## Step 6: Set Environment Variables

```bash
cd ~/public_html/ialearn/

# Create .env file
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001

# Your domain
CLIENT_URL=https://mightskytech.com/ialearn

# Demo mode (no database needed)
DEMO_MODE=true

# Generate a secure JWT secret (run this to generate: openssl rand -hex 32)
JWT_SECRET=your_generated_secret_here

# Optional: Add your API keys
OPENAI_API_KEY=your_openai_key_here
PERPLEXITY_API_KEY=your_perplexity_key_here

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

# Set proper permissions
chmod 600 .env
```

---

## Step 7: Install Dependencies and Build

```bash
cd ~/public_html/ialearn/

# Install server dependencies
npm install --production

# Build the client
cd client
npm install
npm run build
cd ..

# Verify build exists
ls -la client/dist/
```

---

## Step 8: Start the Application

### Using PM2 (Recommended):

```bash
cd ~/public_html/ialearn/

# Install PM2 if not already installed
npm install -g pm2

# Start the application
pm2 start server/index.js --name ialearn

# Save PM2 process list
pm2 save

# Set up auto-start on reboot
pm2 startup

# Check status
pm2 status
pm2 logs ialearn --lines 50
```

### Using Node directly (Alternative):

```bash
cd ~/public_html/ialearn/

# Start in background
nohup node server/index.js > server.log 2>&1 &

# Check if running
ps aux | grep node

# View logs
tail -f server.log
```

---

## Step 9: Configure Web Server

### Create/Update .htaccess in ~/public_html/ialearn/

```bash
cd ~/public_html/ialearn/

cat > .htaccess << 'EOF'
# ═══════════════════════════════════════════════
# IAALearn - Hoganhost Configuration
# ═══════════════════════════════════════════════

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /ialearn/
  
  # API requests go to Node.js app (port 3001)
  RewriteCond %{REQUEST_URI} ^/ialearn/api/
  RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]
  
  # Serve static files from React build
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_URI} !^/ialearn/api/
  RewriteRule ^(.*)$ client/dist/index.html [L]
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Enable GZIP Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>
EOF
```

---

## Step 10: Test the Deployment

```bash
# Test the health endpoint
curl http://localhost:3001/api/health

# Should return: {"status":"healthy","timestamp":"..."}

# Test from outside
curl https://mightskytech.com/ialearn/api/health
```

---

## Step 11: Verify in Browser

1. Open: https://mightskytech.com/ialearn/
2. You should see the login page
3. Check browser console for any errors

---

## 🔧 Troubleshooting

### If Node.js app won't start:

```bash
# Check Node.js version (needs 16+)
node --version

# Check for errors in package.json
cd ~/public_html/ialearn/
cat package.json

# Try running directly to see errors
node server/index.js
```

### If you see 503 errors:

```bash
# Check if Node.js is running
ps aux | grep node
pm2 list

# Check logs
pm2 logs ialearn
# or
tail -f ~/public_html/ialearn/server.log
```

### If .htaccess isn't working:

```bash
# Check if mod_rewrite is enabled
# Contact Hoganhost support to enable:
# - mod_rewrite
# - mod_proxy
# - mod_proxy_http
```

---

## 📝 What to Send Me

After running the commands in **Step 2**, send me:

1. Output of `node --version`
2. Output of `npm --version`
3. Output of `pm2 --version` (or "not found")
4. Output of `ls -la ~/public_html/ialearn/`
5. Output of `ps aux | grep node`

Then I can give you the exact next steps!

---

## 🚨 Quick Start (If Everything is Ready)

If Node.js 16+ is installed and you have the code ready:

```bash
cd ~/public_html/ialearn/
npm install --production
cd client && npm install && npm run build && cd ..
echo "NODE_ENV=production
PORT=3001
CLIENT_URL=https://mightskytech.com/ialearn
DEMO_MODE=true
JWT_SECRET=$(openssl rand -hex 32)" > .env
pm2 start server/index.js --name ialearn
pm2 save
```

---

## 🆘 Need Help?

If you get stuck at any step, send me:
- The command you ran
- The complete error message
- Output of `pwd` and `ls -la`

I'll help you troubleshoot!
