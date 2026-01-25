#!/bin/bash

# 📦 Create Deployment Package for Hoganhost
# Run: ./create-hoganhost-package.sh

echo "📦 Creating deployment package for mightskytech.com..."
echo ""

# Build client
echo "🔨 Building client application..."
cd client
npm install
npm run build
cd ..

echo "✅ Client built successfully"
echo ""

# Create production .env template
echo "📝 Creating production .env template..."
cat > .env.production << 'EOF'
# Production Configuration for mightskytech.com
NODE_ENV=production
PORT=3001

# Your Domain - UPDATE THIS
CLIENT_URL=https://mightskytech.com
# or use: https://app.mightskytech.com

# Demo Mode (no database required)
DEMO_MODE=true

# Security - CHANGE THIS!
JWT_SECRET=CHANGE_ME_TO_RANDOM_32_CHAR_STRING

# AI Services (Get from openai.com)
OPENAI_API_KEY=your_openai_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cache Configuration
CACHE_TTL_SECONDS=3600
ENABLE_CACHING=true
EOF

echo "✅ Environment template created"
echo ""

# Create deployment package
echo "📦 Packaging files..."
tar -czf hoganhost-deployment.tar.gz \
  --exclude=node_modules \
  --exclude=client/node_modules \
  --exclude=.git \
  --exclude=.env \
  --exclude=*.log \
  --exclude=.DS_Store \
  --exclude=client/dist \
  server/ \
  client/dist/ \
  package.json \
  package-lock.json \
  .env.production \
  README.md

echo "✅ Package created: hoganhost-deployment.tar.gz"
echo ""

# Calculate size
SIZE=$(du -h hoganhost-deployment.tar.gz | cut -f1)
echo "📊 Package size: $SIZE"
echo ""

echo "📋 Next steps:"
echo "1. Upload hoganhost-deployment.tar.gz to your Hoganhost account"
echo "2. Extract: tar -xzf hoganhost-deployment.tar.gz"
echo "3. Rename .env.production to .env"
echo "4. Update JWT_SECRET in .env"
echo "5. Update CLIENT_URL to your domain"
echo "6. Run: npm install --production"
echo "7. Start: pm2 start server/index.js --name iaalearn"
echo ""
echo "📚 Full guide: See HOGANHOST_DEPLOY.md"
echo ""
echo "✅ Done! Package ready for upload."
