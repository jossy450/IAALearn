# 🎓 IAALearn - Interview Preparation & Learning Platform

<div align="center">

**Comprehensive interview preparation platform with AI-powered learning tools**

*Master technical interviews with structured learning materials and practice*

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/jossy450/IAALearn)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-active-success.svg)]()

</div>

---

## 📖 About This Project

IAALearn is an educational platform designed to help software engineers prepare for technical interviews. This repository contains learning materials, code examples, and practice exercises covering JavaScript, SQL, system design, and more.

### ✨ Key Features

✅ **Structured Learning Materials** - Curated content for technical interview prep  
✅ **AI-Powered Practice** - Interactive learning with AI assistance  
✅ **Real-time Transcription** - Speech-to-text for practice sessions  
✅ **Multi-Platform Support** - Works on desktop, web, and mobile (PWA + Android)  
✅ **Comprehensive Coverage** - JavaScript, SQL, system design, and algorithms  
✅ **Practice Sessions** - Track your progress and improve over time  
✅ **Smart Caching** - Quick access to frequently referenced materials  
✅ **Mobile Companion** - Study materials accessible on the go  

---

## 🎯 How to Use This Repository

This repository is organized to help you prepare for technical interviews:

1. **Study the Materials**: Browse through code examples and tutorials
2. **Practice Problems**: Work through coding challenges and SQL queries
3. **Review Solutions**: Compare your solutions with provided examples
4. **Track Progress**: Use the platform to monitor your learning journey
5. **Build Projects**: Apply concepts in real-world scenarios

**Learning Path:**
- Start with fundamental concepts in `/server` and `/client` directories
- Study database schemas in `/database` directory
- Review API documentation in `API.md`
- Practice with provided examples and exercises
- Build understanding through hands-on coding

---

## 💻 Technology Stack

This project demonstrates proficiency in modern web development:

### Backend
- **Node.js 18+** with Express.js framework
- **PostgreSQL 14+** for relational data storage
- **JWT Authentication** for secure user sessions
- **RESTful API** design patterns
- **OpenAI API Integration** (Whisper for speech-to-text, GPT-4 for AI features)
- **WebSocket** support for real-time features

### Frontend
- **React 18** with modern hooks and patterns
- **Vite** for fast development and optimized builds
- **Zustand** for efficient state management
- **Progressive Web App (PWA)** capabilities
- **Capacitor 5** for cross-platform mobile deployment
- **React Router** for client-side navigation

### Database & SQL
- PostgreSQL database design and optimization
- Schema migrations and seeding
- Complex SQL queries and joins
- Database indexing strategies

### DevOps & Tools
- **Git** version control
- **npm** package management
- **ESLint** for code quality
- **Jest** for testing
- Shell scripting for automation
- CI/CD with GitHub Actions

---

## 📦 Quick Start

Get started with the project in minutes:

### Prerequisites

```bash
- Node.js 18+ and npm
- PostgreSQL 14+
- OpenAI API key (for AI features)
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/jossy450/IAALearn.git
cd IAALearn

# 2. Install backend dependencies
npm install

# 3. Install frontend dependencies
cd client && npm install && cd ..

# 4. Configure environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=interview_assistant
DB_USER=postgres
DB_PASSWORD=your_password

# OpenAI API (for AI features)
OPENAI_API_KEY=your_openai_key_here

# JWT Secret
JWT_SECRET=your-secure-secret-key

# CORS Configuration
CLIENT_URL=http://localhost:5173
```

### Running the Application

```bash
# Setup database
createdb interview_assistant
npm run db:migrate

# Start development servers
npm run dev

# Or start separately:
# Terminal 1: Backend server
npm run server:dev

# Terminal 2: Frontend server
cd client && npm run dev
```

**Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

---

## 🖼️ Demo & Screenshots

> **Note**: Screenshots and demo videos coming soon!

Key features to explore:
- Practice session interface
- Progress tracking dashboard
- Mobile companion app
- Learning materials browser

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](.github/CONTRIBUTING.md) before submitting pull requests.

Quick contribution guide:

```bash
# 1. Fork the repository
# 2. Create a feature branch
git checkout -b feature/your-feature

# 3. Make your changes and commit
git commit -m 'Add: your feature description'

# 4. Push to your fork
git push origin feature/your-feature

# 5. Open a Pull Request
```

For detailed guidelines on submitting materials, code style, and best practices, see [CONTRIBUTING.md](.github/CONTRIBUTING.md).

---

## 📞 Contact & Hire Me

I'm actively seeking software engineering opportunities! Feel free to reach out:

- **Email**: [jossy450@gmail.com](mailto:jossy450@gmail.com)
- **LinkedIn**: [linkedin.com/josy450](https://linkdin.com/josy450)
- **GitHub**: [@jossy450](https://github.com/jossy450)

**About Me:**
- Full-stack developer with expertise in JavaScript/Node.js, React, and SQL
- Experienced in building scalable web applications
- Strong focus on code quality, security, and best practices
- Passionate about education technology and developer tools

Open to:
- Full-time software engineering positions
- Contract/freelance opportunities
- Open source collaboration
- Technical consulting

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License - Copyright (c) 2026 jossy450
```

---

## 🏷️ Repository Topics

**Suggested topics for this repository:**
- `interview-prep`
- `javascript`
- `nodejs`
- `react`
- `sql`
- `postgresql`
- `shell`
- `tutorials`
- `learning`
- `education`
- `ai`
- `pwa`

---

## 📚 Additional Documentation

- **[API.md](API.md)** - Backend API documentation
- **[CONTRIBUTING.md](.github/CONTRIBUTING.md)** - Contribution guidelines
- **[SECURITY.md](.github/SECURITY.md)** - Security policy and vulnerability reporting
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide

---

## 🙏 Acknowledgments

- OpenAI for Whisper and GPT-4 APIs
- React and Vite communities
- PostgreSQL community
- Open source contributors

---

**Built with ❤️ for learning and interview preparation**

If this project helps you in your interview preparation, please consider giving it a ⭐!

