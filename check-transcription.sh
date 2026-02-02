#!/bin/bash

echo "🔍 Checking Transcription Service Setup..."
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    
    # Check for API keys (without showing values)
    if grep -q "OPENAI_API_KEY=sk-" .env; then
        echo "✅ OPENAI_API_KEY is set"
    else
        echo "⚠️  OPENAI_API_KEY not set (add your key to .env)"
    fi
    
    if grep -q "GROK_API_KEY=.*[a-zA-Z0-9]" .env; then
        echo "✅ GROK_API_KEY is set"
    else
        echo "ℹ️  GROK_API_KEY not set (optional)"
    fi
else
    echo "❌ .env file not found"
    echo "   Run: cp .env.example .env"
fi

echo ""
echo "🔧 Checking Dependencies..."

# Check ffmpeg
if command -v ffmpeg &> /dev/null; then
    echo "✅ ffmpeg is installed"
    ffmpeg -version 2>&1 | head -1
else
    echo "⚠️  ffmpeg not installed (needed for Hugging Face)"
    echo "   Run: sudo apt install -y ffmpeg"
fi

# Check Node packages
if [ -d "node_modules/fluent-ffmpeg" ]; then
    echo "✅ fluent-ffmpeg package installed"
else
    echo "⚠️  fluent-ffmpeg not installed"
fi

if [ -d "node_modules/ffmpeg-static" ]; then
    echo "✅ ffmpeg-static package installed"
else
    echo "⚠️  ffmpeg-static not installed"
fi

if [ -d "node_modules/openai" ]; then
    echo "✅ openai package installed"
else
    echo "⚠️  openai package not installed"
fi

echo ""
echo "📋 Available Transcription Providers:"
echo ""

# Parse the service file to show providers
if [ -f "server/services/freeNeuralTranscription.js" ]; then
    echo "1. Grok STT (requires GROK_API_KEY)"
    echo "2. OpenAI Whisper (requires OPENAI_API_KEY) ⭐ Recommended"
    echo "3. Hugging Face (FREE, requires ffmpeg)"
    echo "4. Coqui STT (not installed)"
    echo "5. Wav2Vec 2.0 (not installed)"
    echo "6. Silero STT (VAD only, not for transcription)"
fi

echo ""
echo "🚀 Quick Start:"
echo ""
echo "1. Add your OpenAI key to .env:"
echo "   OPENAI_API_KEY=sk-proj-your-key-here"
echo ""
echo "2. Start the server:"
echo "   npm start"
echo ""
echo "3. For Render deployment:"
echo "   - Add OPENAI_API_KEY in Render dashboard"
echo "   - Push code with updated render.yaml"
echo "   - See RENDER_TRANSCRIPTION_FIX.md for details"
echo ""
