const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport');
const { query } = require('../database/connection');

const router = express.Router();

const DEFAULT_GOOGLE_CLIENT_ID = '1020136274261-fvsfg9jgtaq6d3p0lbf1ib03vhtkn09p.apps.googleusercontent.com';

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
    process.env.JWT_SECRET || 'demo-secret',
    { expiresIn }
  );
};

// Helper: Get client redirect URL
const getClientUrl = () => {
  return process.env.CLIENT_URL?.replace(':5173', '') || 'http://localhost:5173';
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

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
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
      if (demoUsers.has(email.toLowerCase())) {
        return res.status(409).json({ error: 'User already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = {
        id: `demo-${Date.now()}`,
        email: email.toLowerCase(),
        full_name: fullName || 'Demo User',
        created_at: new Date().toISOString()
      };

      demoUsers.set(email.toLowerCase(), { ...user, password_hash: passwordHash });

      const token = createToken(user.id, user.email);

      return res.status(201).json({
        success: true,
        user,
        token
      });
    }

    // Database mode
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, created_at`,
      [email, passwordHash, fullName]
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

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (isDemoMode) {
      // Demo mode - check in-memory users
      const user = demoUsers.get(email);
      
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
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret');

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
      return res.redirect(`${getClientUrl()}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(demoUser))}`);
    }

    // Always redirect directly to Google OAuth endpoint
    const googleAuthUrl = buildGoogleAuthUrl(req);
    console.log('🔵 Google OAuth redirect:', googleAuthUrl.substring(0, 100) + '...');
    
    // Aggressive cache prevention
    res.set({
      'Cache-Control': 'no-store, no-cache, no-transform, must-revalidate, private, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'Location': googleAuthUrl
    });
    
    return res.status(302).send('Redirecting...');
  } catch (error) {
    console.error('❌ Google OAuth error:', error);
    return res.status(500).json({ error: 'OAuth initialization failed', message: error.message });
  }
});

// Google OAuth callback
router.get('/google/callback', 
  passport.authenticate('google', { 
    session: false,
    failureRedirect: getClientUrl()
  }),
  async (req, res, next) => {
    try {
      const { id, emails, displayName } = req.user;
      const email = emails[0].value;

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
        const existingUser = await query('SELECT * FROM users WHERE email = $1', [email]);

        if (existingUser.rows.length > 0) {
          user = existingUser.rows[0];
          await query('UPDATE users SET last_login = NOW(), oauth_provider = $1 WHERE id = $2', ['google', user.id]);
        } else {
          const result = await query(
            'INSERT INTO users (email, full_name, oauth_provider, oauth_id) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, created_at',
            [email, displayName, 'google', id]
          );
          user = result.rows[0];
          await query('INSERT INTO privacy_settings (user_id) VALUES ($1)', [user.id]);
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
      
      res.redirect(`${getClientUrl()}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(sanitizeUser(user)))}&_t=${Date.now()}`);
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
    return res.redirect(`${getClientUrl()}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(demoUser))}`);
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
router.get('/github/callback', 
  passport.authenticate('github', { 
    session: false,
    failureRedirect: getClientUrl()
  }),
  async (req, res, next) => {
    try {
      const { id, username, emails, displayName } = req.user;
      const email = emails && emails[0] ? emails[0].value : `${username}@github.com`;

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
        const existingUser = await query('SELECT * FROM users WHERE email = $1 OR oauth_id = $2', [email, id]);

        if (existingUser.rows.length > 0) {
          user = existingUser.rows[0];
          await query('UPDATE users SET last_login = NOW(), oauth_provider = $1 WHERE id = $2', ['github', user.id]);
        } else {
          const result = await query(
            'INSERT INTO users (email, full_name, oauth_provider, oauth_id) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, created_at',
            [email, displayName || username, 'github', id]
          );
          user = result.rows[0];
          await query('INSERT INTO privacy_settings (user_id) VALUES ($1)', [user.id]);
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
      
      res.redirect(`${getClientUrl()}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(sanitizeUser(user)))}&_t=${Date.now()}`);
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

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    if (isDemoMode) {
      // Demo mode - store in memory
      const user = Array.from(demoUsers.values()).find(u => u.email === email);
      
      if (user) {
        resetTokens.set(resetTokenHash, {
          userId: user.id,
          email: user.email,
          expiry: resetTokenExpiry
        });
        
        console.log(`[DEMO] Password reset token for ${email}: ${resetToken}`);
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
      'SELECT id, email FROM users WHERE email = $1 AND is_active = true',
      [email]
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
      console.log(`Password reset token for ${email}: ${resetToken}`);
      
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

module.exports = router;
