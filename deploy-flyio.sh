#!/bin/bash

# 🚀 Quick Deploy to Fly.io
# Run: ./deploy-flyio.sh

echo "✈️  Deploying to Fly.io..."
echo ""

# Check if Fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI not found. Installing..."
    curl -L https://fly.io/install.sh | sh
    echo "⚠️  Please restart your terminal and run this script again."
    exit 1
fi

# Login
echo "📝 Logging in to Fly.io..."
fly auth login

# Launch app
echo "🎯 Launching Fly.io app..."
fly launch --no-deploy

echo ""
echo "⚙️  Setting secrets..."

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)
fly secrets set JWT_SECRET=$JWT_SECRET

# Get app name
APP_NAME=$(fly info --json | grep -o '"Name":"[^"]*"' | cut -d'"' -f4)
fly secrets set CLIENT_URL="https://${APP_NAME}.fly.dev"
fly secrets set DEMO_MODE=true
fly secrets set NODE_ENV=production

echo ""
echo "✅ Secrets configured!"
echo ""
echo "⚠️  IMPORTANT: Set OPENAI_API_KEY for AI features:"
echo "   fly secrets set OPENAI_API_KEY=your_key_here"
echo ""

# Deploy
read -p "🚀 Ready to deploy? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Deploying..."
    fly deploy
    
    echo ""
    echo "✅ Deployment complete!"
    echo "📋 Your app: https://${APP_NAME}.fly.dev"
    echo ""
    echo "Useful commands:"
    echo "  fly logs     - View logs"
    echo "  fly status   - Check status"
    echo "  fly ssh console - Open shell"
else
    echo "⏸️  Deployment cancelled. Run 'fly deploy' when ready."
fi
