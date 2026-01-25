#!/bin/bash

# 🚀 Quick Deploy to Railway
# Run: ./deploy-railway.sh

echo "🚂 Deploying to Railway..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login
echo "📝 Logging in to Railway..."
railway login

# Initialize project
echo "🎯 Initializing Railway project..."
railway init

# Set environment variables
echo "⚙️  Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set DEMO_MODE=true
railway variables set PORT=3001

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)
railway variables set JWT_SECRET=$JWT_SECRET

echo ""
echo "✅ Environment variables set!"
echo ""
echo "⚠️  IMPORTANT: Set these manually in Railway dashboard:"
echo "   - OPENAI_API_KEY (required for AI features)"
echo "   - CLIENT_URL (will be provided after deployment)"
echo ""

# Deploy
read -p "🚀 Ready to deploy? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Deploying..."
    railway up
    
    echo ""
    echo "✅ Deployment initiated!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Get your app URL: railway domain"
    echo "2. Set CLIENT_URL: railway variables set CLIENT_URL=https://your-url.up.railway.app"
    echo "3. Visit your app and test!"
    echo ""
else
    echo "⏸️  Deployment cancelled. Run 'railway up' when ready."
fi
