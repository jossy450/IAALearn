# 🚀 Quick Setup Guide - Interview Answer Assistant

**Get up and running in 10 minutes!**

---

## ⚡ Super Quick Start (For Developers)

```bash
# 1. Clone and install
git clone https://github.com/jossy450/IAALearn.git
cd IAALearn
npm install && cd client && npm install && cd ..

# 2. Setup database
createdb interview_assistant
npm run migrate

# 3. Create .env file (see below)
cp .env.example .env
# Edit .env with your API keys

# 4. Start servers
npm run dev  # Terminal 1
cd client && npm run dev  # Terminal 2

# 5. Open browser
# Go to http://localhost:5173
```

---

## 📋 Step-by-Step Setup (Detailed)

### Step 1: Prerequisites

Install these first:

#### Node.js & npm
```bash
# Check if installed
node --version  # Should be 18 or higher
npm --version

# Install from https://nodejs.org if not installed
```

#### PostgreSQL
```bash
# Check if installed
psql --version  # Should be 14 or higher

# Install:
# macOS: brew install postgresql@14
# Ubuntu: sudo apt install postgresql-14
# Windows: Download from https://www.postgresql.org/download/
```

### Step 2: Clone Repository

```bash
git clone https://github.com/jossy450/IAALearn.git
cd IAALearn
```

### Step 3: Install Dependencies

```bash
# Install backend dependencies (from root directory)
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### Step 4: Get API Keys

#### OpenAI API Key (Required)

1. Go to https://platform.openai.com
2. Sign up or log in
3. Click on your profile (top-right) → "View API Keys"
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)
6. **Important**: Save it somewhere safe (you won't see it again)

**Cost**: Pay-as-you-go
- Typical 1-hour interview: $2-5
- Charges to credit card on file

#### Perplexity API Key (Optional)

1. Go to https://www.perplexity.ai
2. Sign up for Pro ($20/month)
3. Go to Settings → API
4. Generate API key
5. Copy the key (starts with `pplx-`)

### Step 5: Create Environment File

Create `.env` file in the **root directory**:

```bash
# Copy example file
cp .env.example .env

# Or create manually
nano .env
```

**Paste this into .env:**

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=interview_assistant
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# OpenAI API (REQUIRED)
OPENAI_API_KEY=sk-your-openai-key-paste-here

# Perplexity API (OPTIONAL - for research mode)
PERPLEXITY_API_KEY=pplx-your-perplexity-key-here

# JWT Secret (Change this to a random string)
JWT_SECRET=change-this-to-a-random-secure-string-min-32-chars

# CORS Settings
CLIENT_URL=http://localhost:5173
```

**Replace:**
- `your_postgres_password` - Your PostgreSQL password
- `sk-your-openai-key-paste-here` - Your OpenAI API key
- `pplx-your-perplexity-key-here` - Your Perplexity key (or leave blank)
- `change-this-to-a-random-secure-string` - Any random string (min 32 characters)

**Example JWT Secret:**
```
JWT_SECRET=my-super-secret-jwt-key-for-interview-app-2024-secure
```

### Step 6: Setup Database

```bash
# Create database
createdb interview_assistant

# If that doesn't work, try:
psql -U postgres -c "CREATE DATABASE interview_assistant;"

# Run migrations
npm run migrate

# Verify database created
psql -U postgres -l | grep interview_assistant
```

**Troubleshooting database:**

```bash
# If PostgreSQL not running:
# macOS: brew services start postgresql@14
# Ubuntu: sudo systemctl start postgresql
# Windows: Start from Services

# If authentication fails:
psql -U postgres
# Then in psql:
ALTER USER postgres WITH PASSWORD 'your_password';
```

### Step 7: Start Application

**Terminal 1 (Backend):**
```bash
npm run dev
```

You should see:
```
🚀 Server running on port 3001
✅ Database connected
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

You should see:
```
  VITE v5.0.11  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.x:5173/
```

### Step 8: Access the App

Open browser and go to: **http://localhost:5173**

You should see the login page!

---

## 🎯 First Time User Setup

### 1. Register Account

- Go to http://localhost:5173/register
- Enter email and password
- Click "Register"

### 2. Login

- Email: your email
- Password: your password
- Click "Login"

### 3. Configure Stealth Mode

1. Click "Stealth Mode" in left navigation
2. Toggle "Stealth Mode" ON
3. Choose disguise theme (try "Calculator" or "Notepad")
4. Set panic key to ESC
5. Choose decoy screen: "Google Search"
6. Enable floating widget
7. Set opacity to 40%
8. Click "Save Settings"

### 4. Test Everything

1. Go to Dashboard
2. Click "New Interview Session"
3. Enter:
   - Company Name: "Test Company"
   - Job Title: "Test Role"
4. Click "Start Session"
5. Test the panic button (press ESC)
6. Decoy screen should appear
7. Press ESC again to return

---

## 📱 Mobile Companion Setup

### 1. Find Your Local IP Address

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig | findstr IPv4
```

You'll see something like: `192.168.1.100`

### 2. On Desktop:

1. Go to "Mobile" page
2. Click "Generate Connection Code"
3. Note the 6-digit code

### 3. On Phone:

1. Connect to same WiFi network as computer
2. Open browser on phone
3. Go to: `http://192.168.1.100:5173/mobile` (use your IP)
4. Enter 6-digit code
5. Click "Connect"

**Success!** Answers will now appear on your phone during interviews.

---

## 🤖 Android APK Build (Optional)

Only if you want to build Android app:

### Prerequisites:

1. **Android Studio** - Download from https://developer.android.com/studio
2. **JDK 11+** - Usually comes with Android Studio
3. **Android SDK** - Install via Android Studio

### Build Steps:

```bash
cd client

# First time setup
npm run android:init

# Build web app
npm run build

# Sync to Android
npm run android:sync

# Open Android Studio
npm run android:open

# In Android Studio:
# Build → Build Bundle(s) / APK(s) → Build APK(s)

# Or via command line:
cd android
./gradlew assembleDebug  # For testing
./gradlew assembleRelease  # For production

# APK location:
# Debug: android/app/build/outputs/apk/debug/app-debug.apk
# Release: android/app/build/outputs/apk/release/app-release.apk
```

**Detailed instructions:** See [ANDROID_BUILD.md](ANDROID_BUILD.md)

---

## ✅ Verify Installation

### Check Backend:

```bash
curl http://localhost:3001/api/health

# Should return: {"status":"ok","database":"connected"}
```

### Check Frontend:

- Open http://localhost:5173
- Should see login page
- Register and login should work

### Check Database:

```bash
psql -U postgres -d interview_assistant -c "\dt"

# Should list 11 tables:
# users, interview_sessions, questions, answer_cache, etc.
```

### Check API Keys:

Create test file `test-api.js`:

```javascript
const axios = require('axios');

async function testOpenAI() {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Say hello' }],
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ OpenAI API works!');
    console.log('Response:', response.data.choices[0].message.content);
  } catch (error) {
    console.log('❌ OpenAI API failed:', error.message);
  }
}

testOpenAI();
```

Run:
```bash
node test-api.js
```

Should see: `✅ OpenAI API works!`

---

## 🐛 Troubleshooting

### "Cannot connect to database"

```bash
# Check if PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Start PostgreSQL
# macOS: brew services start postgresql@14
# Ubuntu: sudo systemctl start postgresql
# Windows: Services → PostgreSQL → Start

# Check .env has correct credentials
cat .env | grep DB_
```

### "OpenAI API error"

```bash
# Verify API key is correct
echo $OPENAI_API_KEY

# Check .env file
cat .env | grep OPENAI

# Test API key manually
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### "Port already in use"

```bash
# Backend (port 3001)
lsof -ti:3001 | xargs kill -9

# Frontend (port 5173)
lsof -ti:5173 | xargs kill -9
```

### "npm install errors"

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules
rm -rf client/node_modules

# Reinstall
npm install
cd client && npm install
```

### "Database migration fails"

```bash
# Drop and recreate database
dropdb interview_assistant
createdb interview_assistant

# Run migrations again
npm run migrate
```

### "Frontend won't connect to backend"

Check `client/src/services/api.js`:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:3001/api
```

---

## 🎓 Next Steps

After successful setup:

1. **Read Documentation**:
   - [STEALTH_GUIDE.md](STEALTH_GUIDE.md) - Master stealth features
   - [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Understand architecture
   - [ANDROID_BUILD.md](ANDROID_BUILD.md) - Build mobile app

2. **Practice Using the App**:
   - Create test interview sessions
   - Test panic button multiple times
   - Practice quick copy features
   - Setup mobile companion
   - Try different disguise themes

3. **Before Real Interview**:
   - Test everything 5+ times
   - Practice natural paraphrasing
   - Setup mobile companion
   - Configure stealth settings
   - Have backup plan ready

---

## 🚨 Important Reminders

⚠️ **This tool is for educational purposes**

- Using in real interviews may violate policies
- Consequences include disqualification and blacklisting
- You still need to perform the job later
- Use responsibly and ethically

✅ **Best Practices**:

- Don't rely 100% on the app
- Paraphrase all answers
- Add your own experiences
- Maintain eye contact
- Have genuine backup knowledge
- Practice makes perfect

---

## 📞 Get Help

- **Issues**: GitHub Issues
- **Questions**: GitHub Discussions
- **Email**: support@iaalearn.com
- **Documentation**: All docs in repository

---

## ✨ You're All Set!

Your Interview Answer Assistant is now ready to use.

**Test it thoroughly before any real interview!**

Good luck! 🍀

---

**Setup Time**: ~10 minutes  
**Difficulty**: Easy  
**Support**: Available 24/7
