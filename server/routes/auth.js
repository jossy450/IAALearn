const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');

const router = express.Router();

// In-memory users for demo mode
const demoUsers = new Map();
const isDemoMode = process.env.DEMO_MODE === 'true';

// Register new user
router.post('/register', async (req, res, next) => {
  try {
    console.log('📝 Register request received:', { email: req.body.email, isDemoMode });
    const { email, password, fullName } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('❌ Validation failed - missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (isDemoMode) {
      console.log('✅ Demo mode active - using in-memory storage');
      // Demo mode - in-memory storage
      if (demoUsers.has(email)) {
        console.log('❌ User already exists:', email);
        return res.status(409).json({ error: 'User already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = {
        id: `demo-${Date.now()}`,
        email,
        full_name: fullName,
        created_at: new Date().toISOString()
      };

      demoUsers.set(email, { ...user, password_hash: passwordHash });
      console.log('✅ User created in demo mode:', user.id);

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'demo-secret',
        { expiresIn: '7d' }
      );

      console.log('✅ Sending success response');
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

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

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

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'demo-secret',
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name
        },
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

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    delete user.password_hash;

    res.json({
      success: true,
      user,
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
router.get('/google', (req, res, next) => {
  if (isDemoMode) {
    // Demo Mode: Simulate OAuth
    const demoUser = {
      id: `google-${Date.now()}`,
      email: 'demo@google.com',
      full_name: 'Google Demo User',
      provider: 'google'
    };

    const token = jwt.sign(
      { id: demoUser.id, email: demoUser.email },
      process.env.JWT_SECRET || 'demo-secret',
      { expiresIn: '7d' }
    );

    demoUsers.set(demoUser.email, demoUser);

    const clientUrl = process.env.CLIENT_URL?.replace(':5173', '') || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(demoUser))}`);
  }

  // Check if OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ 
      error: 'OAuth not configured', 
      message: 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables' 
    });
  }

  const passport = require('passport');
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })(req, res, next);
});

// Google OAuth callback
router.get('/google/callback', 
  require('passport').authenticate('google', { 
    session: false,
    failureRedirect: process.env.CLIENT_URL || 'http://localhost:5173' 
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
        // Check if user exists
        const existingUser = await query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );

        if (existingUser.rows.length > 0) {
          user = existingUser.rows[0];
          await query(
            'UPDATE users SET last_login = NOW(), oauth_provider = $1 WHERE id = $2',
            ['google', user.id]
          );
        } else {
          // Create new user
          const result = await query(
            `INSERT INTO users (email, full_name, oauth_provider, oauth_id)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, full_name, created_at`,
            [email, displayName, 'google', id]
          );
          user = result.rows[0];

          await query(
            'INSERT INTO privacy_settings (user_id) VALUES ($1)',
            [user.id]
          );
        }
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'demo-secret',
        { expiresIn: '7d' }
      );

      const clientUrl = process.env.CLIENT_URL?.replace(':5173', '') || 'http://localhost:5173';
      res.redirect(`${clientUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
    } catch (error) {
      next(error);
    }
  }
);

// GitHub OAuth - Initiate authentication
router.get('/github', (req, res, next) => {
  if (isDemoMode) {
    // Demo Mode: Simulate OAuth
    const demoUser = {
      id: `github-${Date.now()}`,
      email: 'demo@github.com',
      full_name: 'GitHub Demo User',
      provider: 'github'
    };

    const token = jwt.sign(
      { id: demoUser.id, email: demoUser.email },
      process.env.JWT_SECRET || 'demo-secret',
      { expiresIn: '7d' }
    );

    demoUsers.set(demoUser.email, demoUser);

    const clientUrl = process.env.CLIENT_URL?.replace(':5173', '') || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(demoUser))}`);
  }

  // Check if OAuth is configured
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(500).json({ 
      error: 'OAuth not configured', 
      message: 'Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables' 
    });
  }

  const passport = require('passport');
  passport.authenticate('github', { 
    scope: ['user:email'],
    session: false 
  })(req, res, next);
});

// GitHub OAuth callback
router.get('/github/callback', 
  require('passport').authenticate('github', { 
    session: false,
    failureRedirect: process.env.CLIENT_URL || 'http://localhost:5173' 
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
        // Check if user exists
        const existingUser = await query(
          'SELECT * FROM users WHERE email = $1 OR oauth_id = $2',
          [email, id]
        );

        if (existingUser.rows.length > 0) {
          user = existingUser.rows[0];
          await query(
            'UPDATE users SET last_login = NOW(), oauth_provider = $1 WHERE id = $2',
            ['github', user.id]
          );
        } else {
          // Create new user
          const result = await query(
            `INSERT INTO users (email, full_name, oauth_provider, oauth_id)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, full_name, created_at`,
            [email, displayName || username, 'github', id]
          );
          user = result.rows[0];

          await query(
            'INSERT INTO privacy_settings (user_id) VALUES ($1)',
            [user.id]
          );
        }
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'demo-secret',
        { expiresIn: '7d' }
      );

      const clientUrl = process.env.CLIENT_URL?.replace(':5173', '') || 'http://localhost:5173';
      res.redirect(`${clientUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
