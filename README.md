# 🎭 Interview Answer Assistant - Undetectable AI Interview Help

<div align="center">

**Real-time AI-powered interview assistance that's completely undetectable**

*Get perfect answers during interviews without anyone knowing* 🤫

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/jossy450/IAALearn)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-active-success.svg)]()

</div>

---

## 🚀 What This Does

This is a **stealth interview assistance application** that helps you ace interviews by providing AI-generated answers in real-time - **completely undetectable** to interviewers.

### Key Features:

✅ **Real-time transcription** - Converts interviewer's questions to text instantly  
✅ **AI-generated answers** - GPT-4 provides perfect responses  
✅ **Completely undetectable** - Disguise themes, panic buttons, floating widgets  
✅ **Mobile companion** - Show answers on your phone discretely  
✅ **QR transfer escape** - Instantly transfer to mobile when asked to share screen (NEW!)  
✅ **Multiple disguise modes** - Look like calculator, notepad, terminal, IDE, browser  
✅ **Panic button** - Instantly hide with ESC key or show fake decoy screen  
✅ **Screen recording detection** - Auto-hide if screen sharing detected  
✅ **Floating widgets** - Nearly invisible answer overlays  
✅ **Quick copy** - Single-click answer copying with no visual feedback  
✅ **Smart caching** - Instant answers for common questions  
✅ **Works everywhere** - Desktop PWA + Android APK  

---

## 🎯 How It Works

**The Process:**

1. **Question Detection**: Interviewer asks a question
2. **Instant Transcription**: Audio → Text via OpenAI Whisper (1-2 seconds)
3. **AI Answer Generation**: GPT-4 creates perfect response (2-3 seconds)
4. **Discrete Display**: Shows on mobile phone or floating widget
5. **Quick Copy**: Single-click to copy answer
6. **Natural Response**: You paraphrase and deliver naturally

**Total time: 3-5 seconds from question to answer** ⚡

---

## 🎭 Stealth Features (What Makes This Undetectable)

### 1. **Disguise Themes**

Transform the app to look like completely different software:

| Theme | Looks Like | Best For |
|-------|-----------|----------|
| 🧮 Calculator | Windows Calculator | General interviews |
| 📝 Notepad | Text Editor | Note-taking excuse |
| 🌐 Browser | Chrome/Edge | "Researching" |
| 💻 Terminal | Command Line | Coding interviews |
| 👨‍💻 VS Code | Code IDE | Programming interviews |
| 💬 Slack | Chat App | Communication roles |
| 📊 Excel | Spreadsheet | Data analysis |
| 📄 PDF Reader | Document Viewer | Document reviews |

### 2. **Panic Button (Boss Key)**

Instantly hide the app if interviewer gets suspicious:

- Press **ESC** (or custom key) to trigger
- Shows fake decoy screen (Google, StackOverflow, docs)
- Triple-click top-right corner as backup
- Exit decoy with ESC again

### 3. **Mobile Companion**

Show answers on your phone - **the most discrete option**:

- Generate 6-digit pairing code
- Connect phone to desktop app
- Answers appear on phone in real-time
- Glance at phone naturally (looks like taking notes)

### 4. **Screen Recording Detection**

Automatically detect and hide if screen sharing is detected:

- Detects Zoom/Teams/Meet screen sharing
- Auto-hide when detection triggered
- Visual alert when recording detected

### 5. **Floating Answer Widget**

Nearly-invisible floating window showing answers:

- 30-50% opacity (barely visible)
- Mini size (200x100px) 
- Positions in any corner
- Looks like sticky note or tooltip

### 6. **Quick Copy Features**

Copy answers instantly without obvious selection:

- Single-click copy (no text selection needed)
- Auto-copy to clipboard
- No "Copied!" toast notification
- Completely silent operation

---

## 💻 Technology Stack

### Backend:
- **Node.js 18+** with Express.js
- **PostgreSQL 14+** for data storage
- **OpenAI Whisper** for speech-to-text transcription
- **GPT-4** for intelligent answer generation
- **Perplexity API** for research-backed answers
- **JWT Authentication** for security

### Frontend:
- **React 18** with Vite build tool
- **Zustand** for state management
- **Capacitor 5** for native mobile builds
- **PWA** (Progressive Web App) - installable on desktop/mobile
- **React Router** for navigation

---

## 📦 Quick Start

### Prerequisites:

```bash
- Node.js 18+ and npm
- PostgreSQL 14+
- OpenAI API key (required)
- Perplexity API key (optional, for research mode)
```

### 1. Clone & Install

```bash
git clone https://github.com/jossy450/IAALearn.git
cd IAALearn

# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..
```

### 2. Configure Environment

Create `.env` file in root directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=interview_assistant
DB_USER=postgres
DB_PASSWORD=your_secure_password

# OpenAI API (Required)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Perplexity API (Optional - for research mode)
PERPLEXITY_API_KEY=pplx-your-perplexity-key-here

# JWT Secret (Change this!)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# CORS
CLIENT_URL=http://localhost:5173
```

### 3. Setup Database

```bash
# Create database
createdb interview_assistant

# Run database migrations
npm run migrate
```

### 4. Start Application

```bash
# Terminal 1: Start backend server
npm run dev

# Terminal 2: Start frontend dev server
cd client && npm run dev
```

**Access the app:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

---

## 📱 Building Android APK

Detailed instructions in **[ANDROID_BUILD.md](ANDROID_BUILD.md)**

### Quick Build:

```bash
cd client

# Build web app
npm run build

# Initialize Android platform (first time only)
npm run android:init

# Sync web assets to Android
npm run android:sync

# Open in Android Studio
npm run android:open

# Or build via command line
cd android
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

---

## 🎮 Usage Guide

### Setup Before Interview (5 minutes):

1. **Enable Stealth Mode**
   - Go to "Stealth Mode" page
   - Toggle Stealth Mode ON
   - Choose disguise theme matching your interview:
     - Coding interview → Terminal or VS Code
     - Behavioral interview → Notepad
     - General → Calculator

2. **Configure Panic Button**
   - Set panic key (recommended: ESC)
   - Choose panic action (recommended: Show Decoy Screen)
   - Select decoy screen (recommended: Google Search)

3. **Setup Answer Display**
   - **Option A (Most Discrete)**: Mobile Companion
     - Generate 6-digit code on desktop
     - Connect your phone
     - Keep phone beside keyboard
   - **Option B**: Floating Widget
     - Enable floating widget
     - Set opacity to 30-50%
     - Position in bottom-right corner

4. **Enable Quick Features**
   - ✅ Single-click copy
   - ✅ Auto-copy to clipboard
   - ✅ Silent mode (no sounds)
   - ✅ Screen recording detection

5. **Practice!**
   - Test panic button 5+ times
   - Practice copying and pasting
   - Make sure everything works smoothly

### During Interview:

1. **Start Session**
   - Create new interview session
   - Enter company name and job title
   - Click "Start Recording"

2. **Get Answers**
   - Interviewer asks question
   - App transcribes automatically (1-2 seconds)
   - AI generates answer (2-3 seconds)
   - Answer appears on mobile/widget
   - Click once to copy
   - Paste and paraphrase naturally

3. **Stay Natural**
   - Pause before answering (2-3 seconds thinking time)
   - Add your own words and examples
   - Don't read word-for-word
   - Maintain eye contact with camera
   - Glance at answers in peripheral vision

4. **Emergency Actions**
   - **If interviewer gets suspicious:** Press ESC → Decoy screen appears
   - **If asked to share screen:** Press ESC first, then share specific window
   - **App crashes:** Use mobile backup or wing it naturally

---

## 🔐 Security & Privacy

- ✅ End-to-end encryption (HTTPS)
- ✅ Bcrypt password hashing
- ✅ JWT token authentication
- ✅ Rate limiting (100 requests / 15 minutes)
- ✅ SQL injection protection
- ✅ XSS & CSRF protection
- ✅ No data selling or sharing
- ✅ Optional auto-clear history
- ✅ Anonymous usage mode

---

## ⚠️ Legal Disclaimer

### **IMPORTANT - READ CAREFULLY**

This tool is provided **for educational purposes only**. Using this application during actual job interviews may:

- ❌ Violate company interview policies
- ❌ Breach terms of service agreements
- ❌ Violate academic integrity rules
- ❌ Result in immediate disqualification
- ❌ Damage your professional reputation
- ❌ Lead to legal consequences

**Potential Consequences:**
- Immediate interview termination
- Blacklisting from company
- Industry reputation damage
- Legal action (in some jurisdictions)
- Academic penalties (for student interviews)

**Use this tool responsibly and at your own risk.** The developers assume no liability for misuse.

---

## 📚 Documentation

- **[STEALTH_GUIDE.md](STEALTH_GUIDE.md)** - Complete stealth features & best practices
- **[ANDROID_BUILD.md](ANDROID_BUILD.md)** - Build Android APK instructions
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[API.md](API.md)** - Backend API documentation

---

## 🎓 Best Practices for Stealth

### ✅ DO:

- Test everything before the interview
- Use mobile companion (most discrete method)
- Paraphrase all answers in your own words
- Wait 2-3 seconds before responding
- Add your own examples and experiences
- Maintain camera eye contact
- Have genuine knowledge as backup
- Practice panic button multiple times

### ❌ DON'T:

- Read answers verbatim (obvious cheating)
- Answer instantly (suspicious)
- Stare at second screen constantly
- Use in proctored/monitored environments
- Rely 100% on the app
- Share screen with app visible
- Make obvious clicking/typing sounds
- Apply for jobs you can't actually do

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

```bash
# Fork the repository
git clone https://github.com/YOUR_USERNAME/IAALearn.git

# Create feature branch
git checkout -b feature/amazing-feature

# Commit changes
git commit -m 'Add amazing feature'

# Push to branch
git push origin feature/amazing-feature

# Open Pull Request
```

---

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/jossy450/IAALearn/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jossy450/IAALearn/discussions)
- **Email**: support@iaalearn.com

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- OpenAI for Whisper and GPT-4 APIs
- Perplexity AI for research capabilities
- React and Vite communities
- Capacitor for mobile builds

---

## ⭐ Star History

If this project helped you, please consider giving it a star! ⭐

---

**Version 2.0.0** - Now with advanced stealth features and Android support

*Built with ❤️ for interview success*

