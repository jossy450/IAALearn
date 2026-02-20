const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport');
const jwksClient = require('jwks-rsa');
const { promisify } = require('util');
const { query } = require('../database/connection');
const { getJwtSecret } = require('../middleware/auth');

const authRouter = express.Router();
// Backwards-compat alias: some handlers below use `router` variable.
const router = authRouter;

const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();

const resolveSupabaseProjectUrl = () => {
  const configured =
    process.env.SUPABASE_PROJECT_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  if (!configured) return null;

  try {
    const parsed = new URL(configured);

    // Pooler URL cannot be used for JWT key discovery.
    if (parsed.hostname.includes('pooler.supabase.com')) {
      return null;
    }

    if (!parsed.hostname.endsWith('supabase.co')) {
      return null;
    }

    const projectRef = parsed.hostname.split('.')[0];
    if (!projectRef) {
      return null;
    }

    return `https://${projectRef}.supabase.co`;
  } catch {
    return null;
  }
};

const SUPABASE_JWKS_URI = process.env.SUPABASE_JWKS_URI || (() => {
  const projectUrl = resolveSupabaseProjectUrl();
  return projectUrl ? `${projectUrl}/auth/v1/keys` : null;
})();

const supabaseJwks = SUPABASE_JWKS_URI ? jwksClient({ jwksUri: SUPABASE_JWKS_URI }) : null;
const getSigningKey = supabaseJwks
  ? promisify(supabaseJwks.getSigningKey).bind(supabaseJwks)
  : null;

if (!SUPABASE_JWKS_URI) {
  console.warn('⚠️ Supabase JWT exchange disabled: set SUPABASE_JWKS_URI or SUPABASE_PROJECT_URL/VITE_SUPABASE_URL');
}

const verifySupabaseToken = async (token) => {
  const decodedHeader = jwt.decode(token, { complete: true });
  const alg = decodedHeader?.header?.alg;

  if (!alg) {
    throw new Error('Invalid token header');
  }

  // Handle projects using symmetric Supabase JWT signing.
  if (alg.startsWith('HS')) {
    const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!supabaseJwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET is required for HS* Supabase tokens');
    }
    return jwt.verify(token, supabaseJwtSecret, { algorithms: [alg] });
  }

  if (!getSigningKey) {
    throw new Error('Supabase JWKS is not configured');
  }

  const kid = decodedHeader?.header?.kid;
  if (!kid) {
    throw new Error('Invalid token header');
  }

  const key = await getSigningKey(kid);
  const publicKey = key.getPublicKey();

  return jwt.verify(token, publicKey, { algorithms: [alg] });
};

authRouter.post('/supabase', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'No token provided' });

    const payload = await verifySupabaseToken(token);
    const email = normalizeEmail(payload?.email);

    if (!email) {
      return res.status(400).json({ error: 'Supabase token missing email claim' });
    }

    // Find or create user in your DB
    let user = null;
    const result = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);

    if (result.rows.length > 0) {
      user = result.rows[0];
      await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    } else {
      // Create user if not exists. Keep password_hash non-null for schemas requiring it.
      let insert;
      try {
        insert = await query(
          `INSERT INTO users (email, full_name, password_hash, oauth_provider)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [email, payload.user_metadata?.full_name || payload.user_metadata?.name || email, '$oauth$', 'supabase']
        );
      } catch {
        insert = await query(
          `INSERT INTO users (email, full_name, password_hash)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [email, payload.user_metadata?.full_name || payload.user_metadata?.name || email, '$oauth$']
        );
      }

      user = insert.rows[0];

      try {
        await query('INSERT INTO privacy_settings (user_id) VALUES ($1)', [user.id]);
      } catch {
        // Ignore if privacy_settings already exists or table not available.
      }
    }

    // Issue app JWT
    const appToken = createToken(user.id, user.email);

    res.json({ success: true, user: sanitizeUser(user), token: appToken });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid Supabase token', details: error.message });
    }

    if (/Supabase JWKS is not configured|SUPABASE_JWT_SECRET/.test(error.message || '')) {
      return res.status(503).json({
        error: 'Supabase auth not configured',
        details: 'Set SUPABASE_JWKS_URI (or SUPABASE_PROJECT_URL/VITE_SUPABASE_URL) or SUPABASE_JWT_SECRET'
      });
    }

    next(error);
  }
});

const DEFAULT_GOOGLE_CLIENT_ID = '859557481151-cdno2ivnlr7trpn61vpndubstl2mfnr3.apps.googleusercontent.com';

const getPublicServerUrl = (req) => {
  // Prioritize explicit environment URLs
  const envUrl = process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_SERVER_URL || process.env.PUBLIC_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // Fallback: reconstruct from request headers
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${protocol}://${host}`;
};

const buildGoogleAuthUrl = (req) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
  const publicUrl = getPublicServerUrl(req);
  const redirectUri = `${publicUrl}/api/auth/google/callback`;
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');

  console.log('📍 Public Server URL:', publicUrl);
  console.log('🔗 Redirect URI:', redirectUri);
  console.log('🆔 Client ID:', clientId.substring(0, 20) + '...');

  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'profile email');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  return authUrl.toString();
};

// Helper: Create JWT token  
const createToken = (userId, email, expiresIn = '7d') => {
  return jwt.sign(
    { id: userId, email },
    getJwtSecret(),
    { expiresIn }
  );
};

// Helper: Get client redirect URL
const getClientUrl = (req) => {
  const envUrl =
    process.env.CLIENT_URL ||
    process.env.PUBLIC_CLIENT_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.PUBLIC_URL ||
    process.env.SERVER_URL ||
    process.env.PUBLIC_SERVER_URL;

  const runningInFly = !!process.env.FLY_APP_NAME;

  if (envUrl) {
    const normalized = envUrl.replace(/\/$/, '');
    const isLocal = /localhost|127\.0\.0\.1/.test(normalized);

    // On Fly/production, never send users back to localhost; prefer Fly hostname
    if (req && (process.env.NODE_ENV === 'production' || runningInFly) && isLocal) {
      if (runningInFly) {
        return `https://${process.env.FLY_APP_NAME}.fly.dev`;
      }
      return getPublicServerUrl(req);
    }
    return normalized;
  }

  // Fallbacks when nothing is configured
  if (runningInFly) {
    return `https://${process.env.FLY_APP_NAME}.fly.dev`;
  }
  if (req) {
    return getPublicServerUrl(req);
  }
  return 'http://localhost:5173';
};

// Helper: Sanitize user response (remove sensitive fields)
const sanitizeUser = (user) => {
  const { password_hash, reset_token, reset_token_expiry, ...safe } = user;
  return safe;
};

// In-memory users for demo mode
const demoUsers = new Map();
// In-memory password reset tokens for demo mode
const resetTokens = new Map();
const isDemoMode = process.env.DEMO_MODE === 'true';

// Pre-seed demo user for OTP testing
if (isDemoMode) {
  const demoUser = {
    id: 'demo-user-1',
    email: 'demo@example.com',
    full_name: 'Demo User',
    created_at: new Date().toISOString(),
    password_hash: '$2b$10$' + 'a'.repeat(53) // Dummy hash - OTP doesn't need real password
  };
  demoUsers.set('demo@example.com', demoUser);
  console.log('✅ Demo user pre-seeded: demo@example.com (use for OTP login)');
}

// Helper function for input validation
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const validatePassword = (password) => {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
  return password && password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
};

// Register new user
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;
    const normalizedEmail = normalizeEmail(email);

    // Validate input
    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validateEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, lowercase, and numbers' });
    }

    if (fullName && (typeof fullName !== 'string' || fullName.length > 255)) {
      return res.status(400).json({ error: 'Invalid name format' });
    }

    if (isDemoMode) {
      // Demo mode - in-memory storage
      if (demoUsers.has(normalizedEmail)) {
        return res.status(409).json({ error: 'User already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = {
        id: `demo-${Date.now()}`,
        email: normalizedEmail,
        full_name: fullName || 'Demo User',
        created_at: new Date().toISOString()
      };

      demoUsers.set(normalizedEmail, { ...user, password_hash: passwordHash });

      const token = createToken(user.id, user.email);

      return res.status(201).json({
        success: true,
        user,
        token
      });
    }

    // Database mode
    const existingUser = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, created_at`,
      [normalizedEmail, passwordHash, fullName]
    );

    const user = result.rows[0];

    await query(
      'INSERT INTO privacy_settings (user_id) VALUES ($1)',
      [user.id]
    );

    const token = createToken(user.id, user.email);

    res.status(201).json({
      success: true,
      user,
      token
    });
  } catch (error) {
    next(error);
  }
});

// Request Login OTP
router.post('/request-otp', async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !validateEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Check if user exists
    if (isDemoMode) {
      const user = demoUsers.get(normalizedEmail);
      if (!user) {
        return res.status(404).json({ error: 'No account found with this email' });
      }
    } else {
      const result = await query(
        'SELECT id, email, full_name FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
        [normalizedEmail]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No account found with this email' });
      }
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (!isDemoMode) {
      // Delete any existing OTPs for this email
      await query(
        'DELETE FROM login_otp WHERE LOWER(email) = LOWER($1)',
        [normalizedEmail]
      );

      // Store OTP in database
      await query(
        `INSERT INTO login_otp (email, otp_code, expires_at, delivery_method)
         VALUES ($1, $2, $3, $4)`,
        [normalizedEmail, otpCode, expiresAt, 'email']
      );
    } else {
      // Store in memory for demo mode
      demoUsers.get(normalizedEmail).otp = {
        code: otpCode,
        expiresAt: expiresAt.getTime()
      };
    }

    // TODO: Send email/SMS with OTP
    // For now, log it (in production, integrate with email service)
    console.log(`🔐 OTP for ${normalizedEmail}: ${otpCode} (expires in 10 minutes)`);

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      email: normalizedEmail,
      // Always return OTP code in response for testing purposes
      code: otpCode
    });
  } catch (error) {
    next(error);
  }
});

// Verify OTP and Login
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    if (isDemoMode) {
      const user = demoUsers.get(normalizedEmail);
      
      if (!user || !user.otp) {
        return res.status(401).json({ error: 'Invalid or expired verification code' });
      }

      if (user.otp.expiresAt < Date.now()) {
        delete user.otp;
        return res.status(410).json({ error: 'Verification code expired. Please request a new one.' });
      }

      if (user.otp.code !== code) {
        return res.status(401).json({ error: 'Invalid verification code' });
      }

      // Clear OTP after successful verification
      delete user.otp;

      const token = createToken(user.id, user.email);

      return res.json({
        success: true,
        user: sanitizeUser(user),
        token
      });
    }

    // Database mode
    const otpResult = await query(
      `SELECT * FROM login_otp 
       WHERE LOWER(email) = LOWER($1) AND otp_code = $2 AND is_verified = false
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail, code]
    );

    if (otpResult.rows.length === 0) {
      // Increment attempts
      await query(
        'UPDATE login_otp SET attempts = attempts + 1 WHERE LOWER(email) = LOWER($1) AND is_verified = false',
        [normalizedEmail]
      );
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    const otp = otpResult.rows[0];

    // Check if expired
    if (new Date(otp.expires_at) < new Date()) {
      await query(
        'DELETE FROM login_otp WHERE LOWER(email) = LOWER($1)',
        [normalizedEmail]
      );
      return res.status(410).json({ error: 'Verification code expired. Please request a new one.' });
    }

    // Check attempts
    if (otp.attempts >= 5) {
      await query(
        'DELETE FROM login_otp WHERE LOWER(email) = LOWER($1)',
        [normalizedEmail]
      );
      return res.status(429).json({ error: 'Too many failed attempts. Please request a new code.' });
    }

    // Mark as verified
    await query(
      'UPDATE login_otp SET is_verified = true WHERE id = $1',
      [otp.id]
    );

    // Get user
    const userResult = await query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Clean up used OTP
    setTimeout(() => {
      query('DELETE FROM login_otp WHERE id = $1', [otp.id]).catch(console.error);
    }, 5000);

    const token = createToken(user.id, user.email);

    res.json({
      success: true,
      user: sanitizeUser(user),
      token
    });
  } catch (error) {
    next(error);
  }
});

// Login (legacy password-based - kept for backward compatibility)
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (isDemoMode) {
      // Demo mode - check in-memory users
      const user = demoUsers.get(normalizedEmail);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = createToken(user.id, user.email);

      return res.json({
        success: true,
        user: sanitizeUser(user),
        token
      });
    }

    // Database mode
    const result = await query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    const token = createToken(user.id, user.email);

    res.json({
      success: true,
      user: sanitizeUser(user),
      token
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, getJwtSecret());

    const result = await query(
      'SELECT id, email, full_name, created_at, last_login FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: result.rows[0]
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(error);
  }
});

// Google OAuth - Initiate authentication
router.get('/google', (req, res) => {
  try {
    if (isDemoMode) {
      const demoUser = {
        id: `google-${Date.now()}`,
        email: 'demo@google.com',
        full_name: 'Google Demo User',
        provider: 'google'
      };

      demoUsers.set(demoUser.email, demoUser);
      const token = createToken(demoUser.id, demoUser.email);
      return res.redirect(`${getClientUrl(req)}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(demoUser))}`);
    }

    // Always redirect directly to Google OAuth endpoint
    const googleAuthUrl = buildGoogleAuthUrl(req);
    console.log('🔵 Google OAuth redirect:', googleAuthUrl.substring(0, 100) + '...');
    
    // Aggressive cache prevention + explicit redirect
    res.set({
      'Cache-Control': 'no-store, no-cache, no-transform, must-revalidate, private, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });

    return res.redirect(302, googleAuthUrl);
  } catch (error) {
    console.error('❌ Google OAuth error:', error);
    return res.status(500).json({ error: 'OAuth initialization failed', message: error.message });
  }
});

// Google OAuth callback
router.get(
  '/google/callback',
  (req, res, next) => {
    const failureRedirect = `${getClientUrl(req)}/login?error=oauth_failed`;
    return passport.authenticate('google', {
      session: false,
      failureRedirect,
      failWithError: false
    })(req, res, (err) => {
      if (err) {
        console.error('❌ Google OAuth passport error:', err.message || err);
        // Redirect to login with error message instead of 500
        return res.redirect(`${getClientUrl(req)}/login?error=${encodeURIComponent(err.message || 'oauth_failed')}`);
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const { id, emails, displayName } = req.user;
      const email = normalizeEmail(emails[0]?.value);

      if (!email) {
        return res.redirect(`${getClientUrl(req)}/login?error=${encodeURIComponent('OAuth provider did not return an email')}`);
      }

      let user;
      if (isDemoMode) {
        user = {
          id: `google-${id}`,
          email,
          full_name: displayName,
          provider: 'google'
        };
        demoUsers.set(email, user);
      } else {
        const existingUser = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);

        if (existingUser.rows.length > 0) {
          user = existingUser.rows[0];
          // Update last_login; try to set oauth_provider if column exists
          try {
            await query('UPDATE users SET last_login = NOW(), oauth_provider = $1 WHERE id = $2', ['google', user.id]);
          } catch {
            await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
          }
        } else {
          // Insert with a placeholder password_hash since OAuth users don't have passwords
          // Try with oauth columns first, fall back to basic insert if columns don't exist
          let result;
          try {
            result = await query(
              `INSERT INTO users (email, full_name, password_hash, oauth_provider, oauth_id)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id, email, full_name, created_at`,
              [email, displayName, '$oauth$', 'google', String(id)]
            );
          } catch {
            result = await query(
              `INSERT INTO users (email, full_name, password_hash)
               VALUES ($1, $2, $3)
               RETURNING id, email, full_name, created_at`,
              [email, displayName, '$oauth$']
            );
          }
          user = result.rows[0];
          try {
            await query('INSERT INTO privacy_settings (user_id) VALUES ($1)', [user.id]);
          } catch {
            // privacy_settings row may already exist
          }
        }
      }

      const token = createToken(user.id, user.email);
      
      // Add cache-busting headers to prevent browser caching
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      
      res.redirect(`${getClientUrl(req)}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(sanitizeUser(user)))}&_t=${Date.now()}`);
    } catch (error) {
      next(error);
    }
  }
);

// GitHub OAuth - Initiate authentication
router.get('/github', (req, res, next) => {
  if (isDemoMode) {
    const demoUser = {
      id: `github-${Date.now()}`,
      email: 'demo@github.com',
      full_name: 'GitHub Demo User',
      provider: 'github'
    };

    demoUsers.set(demoUser.email, demoUser);
    const token = createToken(demoUser.id, demoUser.email);
    return res.redirect(`${getClientUrl(req)}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(demoUser))}`);
  }

  // Check if OAuth is configured
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(500).json({ 
      error: 'OAuth not configured', 
      message: 'Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables' 
    });
  }

  passport.authenticate('github', { 
    scope: ['user:email'],
    session: false 
  })(req, res, next);
});

// GitHub OAuth callback
router.get(
  '/github/callback',
  (req, res, next) => {
    const failureRedirect = getClientUrl(req);
    return passport.authenticate('github', {
      session: false,
      failureRedirect
    })(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { id, username, emails, displayName } = req.user;
      const email = normalizeEmail(emails && emails[0] ? emails[0].value : `${username}@github.com`);

      let user;
      if (isDemoMode) {
        user = {
          id: `github-${id}`,
          email,
          full_name: displayName || username,
          provider: 'github'
        };
        demoUsers.set(email, user);
      } else {
        const existingUser = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);

        if (existingUser.rows.length > 0) {
          user = existingUser.rows[0];
          try {
            await query('UPDATE users SET last_login = NOW(), oauth_provider = $1 WHERE id = $2', ['github', user.id]);
          } catch {
            await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
          }
        } else {
          let result;
          try {
            result = await query(
              `INSERT INTO users (email, full_name, password_hash, oauth_provider, oauth_id)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id, email, full_name, created_at`,
              [email, displayName || username, '$oauth$', 'github', String(id)]
            );
          } catch {
            result = await query(
              `INSERT INTO users (email, full_name, password_hash)
               VALUES ($1, $2, $3)
               RETURNING id, email, full_name, created_at`,
              [email, displayName || username, '$oauth$']
            );
          }
          user = result.rows[0];
          try {
            await query('INSERT INTO privacy_settings (user_id) VALUES ($1)', [user.id]);
          } catch {
            // privacy_settings row may already exist
          }
        }
      }

      const token = createToken(user.id, user.email);
      
      // Add cache-busting headers to prevent browser caching
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      
      res.redirect(`${getClientUrl(req)}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(sanitizeUser(user)))}&_t=${Date.now()}`);
    } catch (error) {
      next(error);
    }
  }
);

// Logout endpoint (optional auth - logout works regardless)
router.post('/logout', (req, res) => {
  try {
    // JWT tokens are stateless, so logout is handled client-side
    // This endpoint is for any server-side cleanup if needed
    // Auth is optional here since user might be logging out with expired token
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Forgot Password - Request password reset
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!validateEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    if (isDemoMode) {
      // Demo mode - store in memory
      const user = demoUsers.get(normalizedEmail);
      
      if (user) {
        resetTokens.set(resetTokenHash, {
          userId: user.id,
          email: user.email,
          expiry: resetTokenExpiry
        });
        
        console.log(`[DEMO] Password reset token for ${normalizedEmail}: ${resetToken}`);
      }
      
      // Always return success to prevent email enumeration
      return res.json({
        success: true,
        message: 'If an account exists, a password reset link has been sent',
        // Include token in demo mode for testing
        ...(user && { resetToken })
      });
    }

    // Database mode
    const result = await query(
      'SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
      [normalizedEmail]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Store reset token in database
      await query(
        `UPDATE users 
         SET reset_token = $1, reset_token_expiry = $2 
         WHERE id = $3`,
        [resetTokenHash, resetTokenExpiry, user.id]
      );

      // In production, send email here
      // For now, log the token (remove in production)
      console.log(`Password reset token for ${normalizedEmail}: ${resetToken}`);
      
      // TODO: Send email with reset link
      // const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
      // await sendEmail(user.email, 'Password Reset', resetUrl);
    }

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists, a password reset link has been sent'
    });
  } catch (error) {
    next(error);
  }
});

// Reset Password - Set new password with token
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters with uppercase, lowercase, and numbers' 
      });
    }

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    if (isDemoMode) {
      // Demo mode - check in-memory tokens
      const tokenData = resetTokens.get(resetTokenHash);
      
      if (!tokenData) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      if (new Date() > tokenData.expiry) {
        resetTokens.delete(resetTokenHash);
        return res.status(400).json({ error: 'Reset token has expired' });
      }

      const user = Array.from(demoUsers.values()).find(u => u.id === tokenData.userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update password
      const passwordHash = await bcrypt.hash(password, 10);
      user.password_hash = passwordHash;
      demoUsers.set(user.email, user);
      
      // Remove used token
      resetTokens.delete(resetTokenHash);

      return res.json({
        success: true,
        message: 'Password has been reset successfully'
      });
    }

    // Database mode
    const result = await query(
      `SELECT id, email FROM users 
       WHERE reset_token = $1 
       AND reset_token_expiry > NOW()
       AND is_active = true`,
      [resetTokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = result.rows[0];

    // Update password and clear reset token
    const passwordHash = await bcrypt.hash(password, 10);
    await query(
      `UPDATE users 
       SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL 
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = authRouter;
