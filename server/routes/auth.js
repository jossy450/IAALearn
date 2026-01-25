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

// Google OAuth
router.get('/google', async (req, res, next) => {
  try {
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

    // Production Mode: Real OAuth (implement with passport.js or oauth library)
    // For now, return error to prompt proper OAuth setup
    res.status(501).json({ 
      error: 'OAuth not fully configured', 
      message: 'Please set up Google OAuth with passport.js or use DEMO_MODE=true' 
    });
  } catch (error) {
    next(error);
  }
});

// GitHub OAuth
router.get('/github', async (req, res, next) => {
  try {
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

    // Production Mode: Real OAuth
    res.status(501).json({ 
      error: 'OAuth not fully configured', 
      message: 'Please set up GitHub OAuth with passport.js or use DEMO_MODE=true' 
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
