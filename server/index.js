require('dotenv').config();
// Default to production when unset so Fly machines serve the built client
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Ensure JWT_SECRET is set for token generation/verification
if (!process.env.JWT_SECRET) {
  // In production, this should be provided via environment variables
  // In development/demo, use a safe default
  process.env.JWT_SECRET = process.env.DEMO_MODE === 'true' 
    ? 'demo-secret' 
    : 'insecure-dev-secret-change-in-production';
  console.warn('⚠️ JWT_SECRET not set in environment, using default. Set JWT_SECRET env var in production!');
} else {
  console.log('✓ JWT_SECRET configured from environment');
}

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
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          // Stripe.js must be loaded from Stripe's CDN
          'https://js.stripe.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'https://fonts.googleapis.com',
        ],
        connectSrc: [
          "'self'",
          'https://iaalearn-cloud.fly.dev',
          'https://iaalearn-1.fly.dev',
          'wss://iaalearn-cloud.fly.dev',
          'wss://iaalearn-1.fly.dev',
          // Stripe API endpoints
          'https://api.stripe.com',
          'https://r.stripe.com',
          // Hugging Face inference API (transcription)
          'https://api-inference.huggingface.co',
        ],
        // Allow Stripe to embed its iframe for 3D Secure / payment elements
        frameSrc: [
          'https://js.stripe.com',
          'https://hooks.stripe.com',
        ],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    } : false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    noSniff: true,
    xssFilter: true,
    dnsPrefetchControl: { allow: false },
    // Allow Stripe iframes (3DS, payment elements) — use CSP frameSrc instead of X-Frame-Options deny
    frameguard: false,
  })
);

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'https://iaalearn-1.fly.dev',
  // Always allow common local dev origins so developers can run the frontend
  // locally (Vite dev server) while targeting the deployed API.
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  // Vite preview uses port 4173 by default; allow it for local preview testing
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  // Server serving built client
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'https://iaalearn-cloud.fly.dev',
  'https://iaalearn-1.fly.dev',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
  'https://interviewassistant.app',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) {
      console.log('[CORS] Request with no Origin header allowed');
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS] Allowed origin: ${origin}`);
      return callback(null, true);
    }

    console.warn(`[CORS] Rejected origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};

app.use(cors(corsOptions));

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(308, `https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Request parsing
app.use(express.json({
  limit: '10mb',
  // Capture raw body so we can log/recover from malformed JSON payloads
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Recover from malformed JSON (e.g., urlencoded payloads sent with JSON headers)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.type === 'entity.parse.failed') {
    const rawBody = req.rawBody || '';

    // Try to salvage simple key/value payloads
    try {
      const parsed = Object.fromEntries(new URLSearchParams(rawBody));
      if (Object.keys(parsed).length > 0) {
        req.body = parsed;
        console.warn('[BodyParser] Recovered malformed JSON payload via URLSearchParams', {
          path: req.path,
          rawBody: rawBody.slice(0, 200),
        });
        return next();
      }
    } catch (_) {
      // fall through to error response
    }

    console.error('[BodyParser] Invalid JSON payload', {
      path: req.path,
      message: err.message,
      rawBody: rawBody.slice(0, 500),
    });
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  next(err);
});
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

// Serve static files from React app whenever a build exists (avoids NODE_ENV drift)
const clientBuildCandidates = [
  path.join(__dirname, '../client/dist'),
  path.join(process.cwd(), 'client/dist'),
  '/opt/render/project/src/client/dist',
];

const clientDistPath = clientBuildCandidates.find(
  (p) => fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))
);

if (!clientDistPath) {
  console.error('❌ Client build not found. Expected Vite output at client/dist.');
  app.get('*', (req, res) => {
    res.status(500).json({
      error: 'Client build not found',
      message:
        'Build the client during deploy. On Render set Build Command to: npm install && npm install --prefix server && npm install --prefix client && npm run build --prefix client',
      checkedPaths: clientBuildCandidates,
    });
  });
} else {
  console.log('✅ Serving client from:', clientDistPath);

  // Serve hashed assets (JS/CSS/images in /assets/) with long-lived immutable cache
  app.use('/assets', express.static(path.join(clientDistPath, 'assets'), {
    maxAge: '1y',
    immutable: true,
    // Ensure correct MIME types are sent — never fall through to index.html
    fallthrough: false,
  }));

  // Serve other static files (manifest, icons, sw.js, etc.) with short cache
  app.use(express.static(clientDistPath, {
    maxAge: '1h',
    // Do NOT fall through unknown paths to index.html here — let the explicit
    // catch-all below handle React Router paths
    index: false,
  }));

  // React Router fallback — only for non-asset paths
  app.get('*', (req, res, next) => {
    // If the request looks like a file (has an extension), don't serve index.html
    if (/\.\w{1,6}$/.test(req.path)) {
      return res.status(404).json({ error: 'Asset not found', path: req.path });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
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

    app.listen(PORT, '0.0.0.0', () => {
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
