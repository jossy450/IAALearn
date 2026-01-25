#!/bin/bash

# ═══════════════════════════════════════════════
# IAALearn - Hoganhost Deployment Script
# ═══════════════════════════════════════════════
# 
# Usage: Run this script on your Hoganhost server
# chmod +x deploy-hoganhost.sh
# ./deploy-hoganhost.sh
# ═══════════════════════════════════════════════

set -e  # Exit on error

echo "═══════════════════════════════════════════════"
echo "🚀 IAALearn Deployment for Hoganhost"
echo "═══════════════════════════════════════════════"
echo ""

# Configuration
APP_DIR="${HOME}/public_html/ialearn"
APP_NAME="ialearn"
NODE_VERSION_REQUIRED="16"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo "ℹ $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Check Prerequisites
echo "📋 Step 1: Checking prerequisites..."
echo ""

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    print_success "Node.js found: $(node --version)"
    
    if [ "$NODE_VERSION" -lt "$NODE_VERSION_REQUIRED" ]; then
        print_error "Node.js version must be $NODE_VERSION_REQUIRED or higher"
        echo "Please contact Hoganhost support to upgrade Node.js"
        exit 1
    fi
else
    print_error "Node.js not found"
    echo "Please install Node.js or contact Hoganhost support"
    exit 1
fi

# Check npm
if command_exists npm; then
    print_success "npm found: $(npm --version)"
else
    print_error "npm not found"
    exit 1
fi

# Check PM2
if command_exists pm2; then
    print_success "PM2 found: $(pm2 --version)"
    PM2_INSTALLED=true
else
    print_warning "PM2 not found - will install"
    PM2_INSTALLED=false
fi

echo ""

# Step 2: Create directory structure
echo "📁 Step 2: Setting up directory..."
echo ""

mkdir -p "$APP_DIR"
cd "$APP_DIR"
print_success "Directory created: $APP_DIR"
echo ""

# Step 3: Check if app files exist
echo "📦 Step 3: Checking application files..."
echo ""

if [ -f "package.json" ]; then
    print_success "Application files found"
else
    print_error "Application files not found in $APP_DIR"
    echo ""
    echo "Please upload your application files first:"
    echo "  1. Via FTP to: $APP_DIR"
    echo "  2. Or via Git: git clone https://github.com/jossy450/IAALearn.git $APP_DIR"
    echo ""
    exit 1
fi

# Step 4: Install PM2 if needed
if [ "$PM2_INSTALLED" = false ]; then
    echo "📦 Step 4: Installing PM2..."
    echo ""
    npm install -g pm2
    print_success "PM2 installed"
    echo ""
fi

# Step 5: Install dependencies
echo "📦 Step 5: Installing dependencies..."
echo ""

print_info "Installing server dependencies..."
npm install --production

if [ $? -eq 0 ]; then
    print_success "Server dependencies installed"
else
    print_error "Failed to install server dependencies"
    exit 1
fi

# Step 6: Build client
echo ""
echo "🏗️  Step 6: Building client application..."
echo ""

if [ -d "client" ]; then
    cd client
    print_info "Installing client dependencies..."
    npm install
    
    print_info "Building client..."
    npm run build
    
    if [ -d "dist" ]; then
        print_success "Client built successfully"
    else
        print_error "Client build failed - dist directory not found"
        exit 1
    fi
    
    cd ..
else
    print_warning "Client directory not found - skipping build"
fi

echo ""

# Step 7: Setup environment variables
echo "⚙️  Step 7: Setting up environment..."
echo ""

if [ ! -f ".env" ]; then
    print_info "Creating .env file..."
    
    JWT_SECRET=$(openssl rand -hex 32)
    
    cat > .env << EOF
# Production Configuration
NODE_ENV=production
PORT=3001

# Your Domain
CLIENT_URL=https://mightskytech.com/ialearn

# Demo Mode (no database required)
DEMO_MODE=true

# Security
JWT_SECRET=$JWT_SECRET

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: Add your API keys below
# OPENAI_API_KEY=your_key_here
# PERPLEXITY_API_KEY=your_key_here
EOF
    
    chmod 600 .env
    print_success ".env file created with secure permissions"
    print_warning "Remember to add your API keys to .env file!"
else
    print_success ".env file already exists"
fi

echo ""

# Step 8: Setup .htaccess
echo "🔧 Step 8: Configuring web server..."
echo ""

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

print_success ".htaccess configured"
echo ""

# Step 9: Stop existing app if running
echo "🔄 Step 9: Managing application process..."
echo ""

if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    print_info "Stopping existing application..."
    pm2 stop "$APP_NAME"
    pm2 delete "$APP_NAME"
    print_success "Existing application stopped"
fi

# Step 10: Start the application
echo ""
echo "🚀 Step 10: Starting application..."
echo ""

pm2 start server/index.js --name "$APP_NAME"

if [ $? -eq 0 ]; then
    print_success "Application started successfully"
else
    print_error "Failed to start application"
    echo ""
    echo "Check logs with: pm2 logs $APP_NAME"
    exit 1
fi

# Save PM2 process list
pm2 save

# Setup PM2 startup (may require sudo)
print_info "Setting up auto-restart on reboot..."
pm2 startup > /tmp/pm2-startup.sh 2>&1 || true

echo ""

# Step 11: Verify deployment
echo "✅ Step 11: Verifying deployment..."
echo ""

sleep 3  # Wait for app to start

# Check if app is running
if pm2 describe "$APP_NAME" | grep -q "online"; then
    print_success "Application is running"
else
    print_error "Application is not running"
    echo "Check logs: pm2 logs $APP_NAME"
    exit 1
fi

# Test health endpoint
print_info "Testing health endpoint..."
HEALTH_CHECK=$(curl -s http://localhost:3001/api/health 2>/dev/null || echo "failed")

if echo "$HEALTH_CHECK" | grep -q "healthy"; then
    print_success "Health check passed"
else
    print_warning "Health check failed - app might still be starting"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "✨ Deployment Complete!"
echo "═══════════════════════════════════════════════"
echo ""
echo "📋 Application Status:"
pm2 status
echo ""
echo "🌐 URLs:"
echo "  Frontend: https://mightskytech.com/ialearn/"
echo "  API Health: https://mightskytech.com/ialearn/api/health"
echo ""
echo "📝 Useful Commands:"
echo "  View logs:    pm2 logs $APP_NAME"
echo "  Restart app:  pm2 restart $APP_NAME"
echo "  Stop app:     pm2 stop $APP_NAME"
echo "  App status:   pm2 status"
echo "  View .env:    cat $APP_DIR/.env"
echo ""
echo "⚠️  Don't forget to:"
echo "  1. Add your API keys to .env file"
echo "  2. Test the application in browser"
echo "  3. Check PM2 logs for any errors"
echo ""
echo "═══════════════════════════════════════════════"
