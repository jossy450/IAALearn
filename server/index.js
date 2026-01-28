require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const passport = require('passport');

const { initializeDatabase } = require('./database/connection');
const { configurePassport } = require('./config/passport');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === 'production' ? undefined : false,
  })
);

// If you serve the client from this same server (recommended on Render),
// you do NOT need CORS in production. Keep it permissive for local dev.
if (process.env.NODE_ENV !== 'production') {
  app.use(
    cors({
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
    })
  );
}

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

app.set("trust proxy", 1);

// Initialize Passport for OAuth
app.use(passport.initialize());
configurePassport();

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));


// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  const candidates = [
    path.join(__dirname, '../client/dist'),
    path.join(process.cwd(), 'client/dist'),
    '/opt/render/project/src/client/dist',
  ];

  const clientDistPath = candidates.find(
    (p) => fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))
  );

  if (!clientDistPath) {
    console.error('❌ Client build not found. Expected Vite output at client/dist.');
    app.get('*', (req, res) => {
      res.status(500).json({
        error: 'Client build not found',
        message:
          'Build the client during deploy. On Render set Build Command to: npm install && npm install --prefix server && npm install --prefix client && npm run build --prefix client',
        checkedPaths: candidates,
      });
    });
  } else {
    console.log('✅ Serving client from:', clientDistPath);
    app.use(express.static(clientDistPath));

    // React Router fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }
}

// Error handling
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    const dbConnected = await initializeDatabase();
    if (dbConnected) {
      console.log('✅ Database connected successfully');
      
      // Warm up cache with common questions on startup
      if (process.env.ENABLE_CACHE_WARMUP !== 'false') {
        const optimizedAnswers = require('./services/optimizedAnswers');
        setTimeout(async () => {
          try {
            console.log('🔥 Warming up answer cache...');
            await optimizedAnswers.warmUpCache();
            console.log('✅ Cache warmed successfully');
          } catch (error) {
            console.warn('⚠️  Cache warmup failed:', error.message);
          }
        }, 5000); // Wait 5 seconds after startup
      }
    } else if (process.env.DEMO_MODE === 'true') {
      console.log('✅ Running in demo mode');
    } else {
      console.log('⚠️  Running without database');
    }

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⚡ Performance optimization: ENABLED`);
      console.log(`💾 Memory cache size: ${process.env.MEMORY_CACHE_SIZE || 500} entries`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
