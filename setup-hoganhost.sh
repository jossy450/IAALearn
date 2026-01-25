#!/bin/bash

# 🚀 Complete Hoganhost Setup for mightskytech.com
# This script helps you set up everything step by step

echo "═══════════════════════════════════════════════"
echo "  🚀 IAALearn Hoganhost Setup"
echo "  Domain: mightskytech.com"
echo "═══════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print step
print_step() {
    echo -e "${BLUE}━━━ $1 ━━━${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Gather Information
print_step "Step 1: Gather Your Information"
echo ""

read -p "Enter your PostgreSQL database name (from cPanel): " DB_NAME
read -p "Enter your PostgreSQL username (from cPanel): " DB_USER
read -sp "Enter your PostgreSQL password: " DB_PASSWORD
echo ""
read -p "Enter your database host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

echo ""
read -p "Enter your OpenAI API key (or press Enter to skip): " OPENAI_KEY
echo ""

# Generate JWT Secret
print_step "Step 2: Generating Security Keys"
JWT_SECRET=$(openssl rand -hex 32)
print_success "JWT Secret generated"
echo ""

# Step 3: Create .env file
print_step "Step 3: Creating Production .env File"

cat > .env.production << EOF
# ═══════════════════════════════════════════════
# Production Configuration for mightskytech.com
# Generated: $(date)
# ═══════════════════════════════════════════════

# Server Configuration
NODE_ENV=production
PORT=3001

# Domain Configuration
CLIENT_URL=https://mightskytech.com

# Database Configuration (PostgreSQL)
DEMO_MODE=false
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}
DB_HOST=${DB_HOST}
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# Security
JWT_SECRET=${JWT_SECRET}

# OAuth - UPDATE THESE AFTER CREATING OAUTH APPS
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret
GITHUB_CLIENT_ID=Iv1.your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# AI Services
OPENAI_API_KEY=${OPENAI_KEY:-your_openai_api_key_here}
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cache Configuration
CACHE_TTL_SECONDS=3600
ENABLE_CACHING=true

# Encryption
ENCRYPTION_KEY=$(openssl rand -hex 16)
EOF

print_success ".env.production file created"
echo ""

# Step 4: Create SQL migration file
print_step "Step 4: Creating Database Migration Script"

cat > setup-database.sql << 'EOF'
-- ═══════════════════════════════════════════════
-- IAALearn Database Setup for PostgreSQL
-- ═══════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    provider VARCHAR(50) DEFAULT 'local',
    provider_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Interview Sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    position VARCHAR(255),
    session_type VARCHAR(50) DEFAULT 'general',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    total_questions INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    transcribed_audio TEXT,
    asked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER,
    source VARCHAR(50) DEFAULT 'audio'
);

-- Answer Cache table
CREATE TABLE IF NOT EXISTS answer_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_hash VARCHAR(64) UNIQUE NOT NULL,
    question_text TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'openai',
    quality_score DECIMAL(3,2),
    hit_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session Transfers table (QR Code feature)
CREATE TABLE IF NOT EXISTS session_transfers (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    transfer_code VARCHAR(10) NOT NULL UNIQUE,
    transferred_at TIMESTAMP DEFAULT NOW(),
    device_info JSONB DEFAULT '{}',
    ip_address VARCHAR(50),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Privacy Settings table
CREATE TABLE IF NOT EXISTS privacy_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    stealth_mode_enabled BOOLEAN DEFAULT false,
    panic_key_combo VARCHAR(50) DEFAULT 'Escape',
    decoy_screen_type VARCHAR(50) DEFAULT 'google-search',
    auto_hide_enabled BOOLEAN DEFAULT false,
    data_encryption_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_value DECIMAL(10,2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_questions_session_id ON questions(session_id);
CREATE INDEX IF NOT EXISTS idx_answer_cache_hash ON answer_cache(question_hash);
CREATE INDEX IF NOT EXISTS idx_session_transfers_code ON session_transfers(transfer_code);
CREATE INDEX IF NOT EXISTS idx_session_transfers_session ON session_transfers(session_id);

-- Insert default test user (optional)
INSERT INTO users (email, password_hash, full_name, provider)
VALUES ('admin@mightskytech.com', '$2b$10$dummy.hash.for.initial.setup', 'Admin User', 'local')
ON CONFLICT (email) DO NOTHING;

-- Success message
SELECT 'Database setup completed successfully!' as status;
EOF

print_success "setup-database.sql created"
echo ""

# Step 5: Create deployment checklist
print_step "Step 5: Creating Deployment Checklist"

cat > DEPLOYMENT_CHECKLIST.md << 'EOF'
# 📋 Hoganhost Deployment Checklist

## Pre-Deployment

- [ ] PostgreSQL database created in cPanel
- [ ] Database user created with all privileges
- [ ] .env.production file configured
- [ ] Client application built (`npm run build`)
- [ ] Node.js supported on hosting (check with Hoganhost)

## Files to Upload

- [ ] `server/` directory
- [ ] `client/dist/` directory (built files)
- [ ] `package.json`
- [ ] `package-lock.json`
- [ ] `.env.production` (rename to `.env` on server)
- [ ] `setup-database.sql`

## Server Setup

- [ ] Upload files via FTP/SFTP
- [ ] SSH into server
- [ ] Run: `npm install --production`
- [ ] Import database: `psql $DATABASE_URL < setup-database.sql`
- [ ] Rename `.env.production` to `.env`
- [ ] Test database connection: `npm run db:migrate`

## OAuth Configuration

### Google OAuth
- [ ] Create project in Google Cloud Console
- [ ] Enable Google+ API or People API
- [ ] Create OAuth client ID
- [ ] Add redirect URI: `https://mightskytech.com/api/auth/google/callback`
- [ ] Copy Client ID and Secret to `.env`

### GitHub OAuth
- [ ] Create OAuth App in GitHub Settings
- [ ] Add callback URL: `https://mightskytech.com/api/auth/github/callback`
- [ ] Copy Client ID and Secret to `.env`

## Application Start

- [ ] Install PM2: `npm install -g pm2`
- [ ] Start app: `pm2 start server/index.js --name iaalearn`
- [ ] Save PM2 config: `pm2 save`
- [ ] Setup auto-restart: `pm2 startup`

## SSL Certificate

- [ ] Enable SSL in cPanel (Let's Encrypt)
- [ ] Verify HTTPS works
- [ ] Update CLIENT_URL to use https://

## Testing

- [ ] Visit: https://mightskytech.com
- [ ] Test registration with email
- [ ] Test Google OAuth login
- [ ] Test GitHub OAuth login
- [ ] Test QR transfer feature
- [ ] Create interview session
- [ ] Test AI answer generation

## Post-Deployment

- [ ] Monitor logs: `pm2 logs iaalearn`
- [ ] Check database has users: `psql $DATABASE_URL -c "SELECT * FROM users;"`
- [ ] Set up backup schedule
- [ ] Configure monitoring/alerts
- [ ] Document admin credentials

## Troubleshooting

If issues occur:
1. Check PM2 logs: `pm2 logs iaalearn --lines 100`
2. Test database: `psql $DATABASE_URL -c "SELECT 1;"`
3. Verify .env variables are correct
4. Check OAuth redirect URIs match exactly
5. Ensure SSL certificate is active
EOF

print_success "DEPLOYMENT_CHECKLIST.md created"
echo ""

# Step 6: Create PM2 configuration
print_step "Step 6: Creating PM2 Configuration"

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'iaalearn',
    script: 'server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
EOF

print_success "ecosystem.config.js created"
echo ""

# Final summary
print_step "Setup Complete!"
echo ""
print_success "Files created:"
echo "  • .env.production - Production environment variables"
echo "  • setup-database.sql - Database migration script"
echo "  • DEPLOYMENT_CHECKLIST.md - Step-by-step deployment guide"
echo "  • ecosystem.config.js - PM2 configuration"
echo ""

print_warning "IMPORTANT: Next Steps"
echo ""
echo "1. BUILD THE CLIENT:"
echo "   cd client && npm install && npm run build && cd .."
echo ""
echo "2. CREATE DEPLOYMENT PACKAGE:"
echo "   ./create-hoganhost-package.sh"
echo ""
echo "3. UPLOAD TO HOGANHOST:"
echo "   - Upload hoganhost-deployment.tar.gz"
echo "   - Extract on server"
echo "   - Run database setup"
echo ""
echo "4. SETUP OAUTH:"
echo "   - Create Google OAuth app"
echo "   - Create GitHub OAuth app"
echo "   - Update .env with credentials"
echo ""
echo "5. START APPLICATION:"
echo "   pm2 start ecosystem.config.js"
echo ""

print_warning "DATABASE CONNECTION STRING:"
echo "postgresql://${DB_USER}:***@${DB_HOST}:5432/${DB_NAME}"
echo ""

print_warning "REMEMBER TO:"
echo "• Update OAuth credentials in .env"
echo "• Set up SSL certificate"
echo "• Test all features after deployment"
echo ""

print_success "Configuration saved! See HOGANHOST_DEPLOY.md for full guide."
echo ""
echo "═══════════════════════════════════════════════"
