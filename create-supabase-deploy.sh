#!/bin/bash

# 🚀 Supabase Deployment Package Creator for Hoganhost
# This script creates a deployment-ready package for Hoganhost shared hosting

echo "═══════════════════════════════════════════════"
echo "  📦 Creating Supabase + Hoganhost Deployment"
echo "  Domain: mightskytech.com"
echo "═══════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}━━━ $1 ━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Run this script from the IAALearn root directory."
    exit 1
fi

# Step 1: Gather Supabase information
print_step "Step 1: Supabase Configuration"
echo ""
echo "Please provide your Supabase database details:"
echo "(You can find these in Supabase Dashboard → Settings → Database)"
echo ""

read -p "Supabase Database Host (e.g., db.abcdefg.supabase.co): " SUPABASE_HOST
read -sp "Supabase Database Password: " SUPABASE_PASSWORD
echo ""
echo ""

# Generate JWT Secret
print_step "Step 2: Generating Security Keys"
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)
print_success "Security keys generated"
echo ""

# Step 3: Build client
print_step "Step 3: Building Client Application"
echo ""

cd client || exit
if [ ! -d "node_modules" ]; then
    echo "Installing client dependencies..."
    npm install
fi

echo "Building production client..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Client build failed!"
    exit 1
fi

print_success "Client build completed"
cd ..
echo ""

# Step 4: Create deployment directory
print_step "Step 4: Creating Deployment Package"
echo ""

rm -rf deploy-supabase
mkdir -p deploy-supabase

# Copy server files
echo "Copying server files..."
cp -r server deploy-supabase/
print_success "Server files copied"

# Copy built client
echo "Copying client build..."
mkdir -p deploy-supabase/client-dist
cp -r client/dist/* deploy-supabase/client-dist/
print_success "Client files copied"

# Copy package files
echo "Copying package files..."
cp package.json package-lock.json deploy-supabase/
print_success "Package files copied"

# Step 5: Create environment file
print_step "Step 5: Creating Production Environment File"

cat > deploy-supabase/.env << EOF
# ═══════════════════════════════════════════════
# Production Configuration for mightskytech.com
# Supabase PostgreSQL + Hoganhost Hosting
# Generated: $(date)
# ═══════════════════════════════════════════════

# Server Configuration
NODE_ENV=production
PORT=3001

# Domain Configuration
CLIENT_URL=https://mightskytech.com

# Supabase Database Configuration
DEMO_MODE=false
DATABASE_URL=postgresql://postgres:${SUPABASE_PASSWORD}@${SUPABASE_HOST}:5432/postgres
DB_HOST=${SUPABASE_HOST}
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=${SUPABASE_PASSWORD}

# Security
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# OAuth - UPDATE THESE AFTER CREATING OAUTH APPS
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
EOF

print_success ".env file created"
echo ""

# Step 6: Create .htaccess
print_step "Step 6: Creating .htaccess Configuration"

cat > deploy-supabase/.htaccess << 'EOF'
# ═══════════════════════════════════════════════
# IAALearn - Hoganhost Configuration
# ═══════════════════════════════════════════════

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # API requests go to Node.js app (port 3001)
  RewriteCond %{REQUEST_URI} ^/api/
  RewriteRule ^(.*)$ http://localhost:3001/$1 [P,L]
  
  # Serve static files from React build
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_URI} !^/api/
  RewriteRule ^(.*)$ client-dist/index.html [L]
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "DENY"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Enable GZIP Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Browser Caching
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType text/html "access plus 1 hour"
</IfModule>
EOF

print_success ".htaccess created"
echo ""

# Step 7: Create deployment instructions
print_step "Step 7: Creating Deployment Instructions"

cat > deploy-supabase/DEPLOY_INSTRUCTIONS.txt << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║  🚀 IAALearn Deployment Instructions for Hoganhost          ║
╚══════════════════════════════════════════════════════════════╝

📋 PRE-DEPLOYMENT CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Supabase project created
✅ Database schema imported (run schema.sql in Supabase SQL Editor)
✅ Hoganhost cPanel access ready
✅ Domain mightskytech.com configured
✅ Node.js support enabled in cPanel

📤 UPLOAD FILES TO HOGANHOST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Connect to Hoganhost via FTP/SFTP or use cPanel File Manager
2. Navigate to: public_html/ (or your domain's root)
3. Upload ALL files from this deploy-supabase folder:
   - server/ folder
   - client-dist/ folder
   - .env file
   - .htaccess file
   - package.json
   - package-lock.json

🔧 CONFIGURE NODE.JS APP IN CPANEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Login to cPanel
2. Find "Setup Node.js App" or "Node.js Selector"
3. Click "Create Application"
4. Configure:
   - Node.js version: 18.x or 20.x
   - Application mode: Production
   - Application root: public_html
   - Application URL: mightskytech.com
   - Application startup file: server/index.js
5. Click "Create"
6. Click "Run NPM Install"
7. Wait for dependencies to install
8. Click "Start" or "Restart"

🔐 SETUP OAUTH APPLICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Google OAuth:
1. Go to: console.cloud.google.com
2. Create project "IAALearn"
3. Enable Google+ API
4. Create OAuth Client ID (Web application)
5. Authorized redirect URIs:
   https://mightskytech.com/api/auth/google/callback
6. Update .env with Client ID and Secret

GitHub OAuth:
1. Go to: github.com/settings/developers
2. Create OAuth App
3. Homepage: https://mightskytech.com
4. Callback URL: https://mightskytech.com/api/auth/github/callback
5. Update .env with Client ID and Secret

🔒 ENABLE SSL CERTIFICATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. In cPanel → SSL/TLS Status
2. Select mightskytech.com
3. Click "Run AutoSSL"
4. Wait for Let's Encrypt certificate
5. Verify: https://mightskytech.com

✅ TESTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Visit: https://mightskytech.com

Test:
□ Page loads without errors
□ Register with email/password
□ Login with email/password
□ Google OAuth login
□ GitHub OAuth login
□ Create interview session
□ QR transfer feature
□ Check Supabase Table Editor (users should appear)

🔍 TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

App won't start:
- Check Node.js App logs in cPanel
- Verify .env file is present
- Check npm install completed successfully

Database errors:
- Verify Supabase connection string
- Check schema.sql was imported
- Test connection from cPanel terminal

OAuth errors:
- Verify redirect URIs match exactly
- Check CLIENT_URL in .env
- Ensure credentials are updated in .env

Static files not loading:
- Verify .htaccess is in root
- Check client-dist/ folder exists
- Clear browser cache

📧 SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hoganhost: Contact via support portal
Supabase: supabase.com/docs
GitHub: github.com/jossy450/IAALearn/issues

╔══════════════════════════════════════════════════════════════╗
║  Good luck with your deployment! 🚀                         ║
╚══════════════════════════════════════════════════════════════╝
EOF

print_success "Deployment instructions created"
echo ""

# Step 8: Create archive
print_step "Step 8: Creating Deployment Archive"

tar -czf hoganhost-supabase-deploy.tar.gz deploy-supabase/

if [ $? -eq 0 ]; then
    print_success "Deployment package created: hoganhost-supabase-deploy.tar.gz"
else
    print_error "Failed to create archive"
    exit 1
fi

# Get archive size
ARCHIVE_SIZE=$(du -h hoganhost-supabase-deploy.tar.gz | cut -f1)
echo ""

# Final summary
print_step "🎉 Deployment Package Ready!"
echo ""
print_success "Package Details:"
echo "  📦 File: hoganhost-supabase-deploy.tar.gz"
echo "  📊 Size: $ARCHIVE_SIZE"
echo "  📁 Location: $(pwd)/hoganhost-supabase-deploy.tar.gz"
echo ""

print_warning "NEXT STEPS:"
echo ""
echo "1. SETUP SUPABASE DATABASE:"
echo "   - Go to supabase.com and create project"
echo "   - Run SQL from server/database/schema.sql in SQL Editor"
echo ""
echo "2. UPLOAD TO HOGANHOST:"
echo "   - Extract hoganhost-supabase-deploy.tar.gz"
echo "   - Upload contents to public_html/ via FTP/cPanel"
echo ""
echo "3. CONFIGURE CPANEL:"
echo "   - Setup Node.js App (see DEPLOY_INSTRUCTIONS.txt)"
echo "   - Run npm install"
echo "   - Start application"
echo ""
echo "4. SETUP OAUTH:"
echo "   - Create Google OAuth app"
echo "   - Create GitHub OAuth app"
echo "   - Update .env with credentials"
echo ""
echo "5. ENABLE SSL:"
echo "   - Run AutoSSL in cPanel"
echo ""
echo "6. TEST:"
echo "   - Visit https://mightskytech.com"
echo ""

print_success "Complete deployment guide: SUPABASE_DEPLOYMENT.md"
print_success "Detailed instructions: deploy-supabase/DEPLOY_INSTRUCTIONS.txt"
echo ""
echo "═══════════════════════════════════════════════"
