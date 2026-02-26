const express = require('express');
const { query } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is admin or owner
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    // Allow access if user is admin, power user, or owner/developer
    const isAdmin = user.role === 'admin';
    const isPowerUser = user.role === 'power_user';
    const isOwner = (
      user.id === 1 || // First user is typically the owner
      user.email?.toLowerCase().includes('owner') ||
      user.email?.toLowerCase().includes('developer') ||
      user.role === 'owner' ||
      user.email === 'admin@admin.com' || // Common admin email
      user.email === 'jossy450@gmail.com' || // Owner/Developer
      user.email === 'mightyjosing@gmail.com' // Owner/Developer
    );

    if (!isAdmin && !isOwner && !isPowerUser) {
      return res.status(403).json({ error: 'Admin, Power User, or Owner access required' });
    }
// Block user account
router.patch('/users/:userId/block', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await query(
      'UPDATE users SET is_active = false WHERE id = $1 RETURNING id, email, is_active',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    await query(
      `INSERT INTO document_audit_logs (user_id, action, details)
       VALUES ($1, $2, $3)`,
      [req.user.id, 'admin_user_block', JSON.stringify({ targetUser: userId })]
    );
    res.json({ user: result.rows[0], message: 'User blocked successfully' });
  } catch (error) {
    next(error);
  }
});

// Remove user account
router.delete('/users/:userId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    await query(
      `INSERT INTO document_audit_logs (user_id, action, details)
       VALUES ($1, $2, $3)`,
      [req.user.id, 'admin_user_remove', JSON.stringify({ targetUser: userId })]
    );
    res.json({ user: result.rows[0], message: 'User removed successfully' });
  } catch (error) {
    next(error);
  }
});

    next();
  } catch (error) {
    next(error);
  }
};

// Get admin dashboard overview
router.get('/overview', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const results = await Promise.all([
      // Total users
      query('SELECT COUNT(*) as count FROM users'),
      // Active sessions last 24h
      query(`SELECT COUNT(*) as count FROM interview_sessions 
             WHERE created_at > NOW() - INTERVAL '24 hours'`),
      // Total questions answered
      query('SELECT COUNT(*) as count FROM session_answers'),
      // Average session duration
      query(`SELECT AVG(EXTRACT(EPOCH FROM (ended_at - created_at))) as duration 
             FROM interview_sessions WHERE ended_at IS NOT NULL`),
      // Top features used
      query(`SELECT feature, COUNT(*) as count FROM session_analytics 
             GROUP BY feature ORDER BY count DESC LIMIT 5`),
      // User growth last 7 days
      query(`SELECT DATE(created_at) as date, COUNT(*) as count 
             FROM users WHERE created_at > NOW() - INTERVAL '7 days'
             GROUP BY DATE(created_at) ORDER BY date`)
    ]);

    res.json({
      overview: {
        totalUsers: parseInt(results[0].rows[0].count),
        activeSessions24h: parseInt(results[1].rows[0].count),
        totalAnswers: parseInt(results[2].rows[0].count),
        avgSessionDuration: results[3].rows[0].duration ? Math.round(results[3].rows[0].duration) : 0,
        topFeatures: results[4].rows,
        userGrowth7days: results[5].rows
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get users list with filters
router.get('/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, role, status } = req.query;
    const offset = (page - 1) * limit;

    let queryStr = `SELECT id, email, full_name, role, created_at, last_login, 
                           (SELECT COUNT(*) FROM interview_sessions WHERE user_id = users.id) as session_count
                    FROM users`;
    const params = [];

    if (role) {
      queryStr += ` WHERE role = $1`;
      params.push(role);
    }

    queryStr += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(queryStr, params);
    const countResult = await query('SELECT COUNT(*) as count FROM users');

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      pages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    next(error);
  }
});

// Get user details
router.get('/users/:userId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;

    const [userRes, sessionsRes, auditRes] = await Promise.all([
      query('SELECT * FROM users WHERE id = $1', [userId]),
      query(`SELECT id, title, created_at, ended_at, question_count, answer_count 
             FROM interview_sessions WHERE user_id = $1 
             ORDER BY created_at DESC LIMIT 10`, [userId]),
      query(`SELECT action, created_at, details FROM document_audit_logs 
             WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [userId])
    ]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: userRes.rows[0],
      recentSessions: sessionsRes.rows,
      auditLogs: auditRes.rows
    });
  } catch (error) {
    next(error);
  }
});

// Update user role
router.patch('/users/:userId/role', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'moderator', 'owner'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role',
      [role, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log this action
    await query(
      `INSERT INTO document_audit_logs (user_id, action, details) 
       VALUES ($1, $2, $3)`,
      [req.user.id, 'admin_role_change', JSON.stringify({ targetUser: userId, newRole: role })]
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Get analytics data
router.get('/analytics', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const intervalMap = {
      week: '1 week',
      month: '1 month',
      year: '1 year'
    };
    const interval = intervalMap[period] || '1 month';

    const [sessionsData, answersData, usersData] = await Promise.all([
      query(`SELECT DATE(created_at) as date, COUNT(*) as count 
             FROM interview_sessions 
             WHERE created_at > NOW() - INTERVAL '${interval}'
             GROUP BY DATE(created_at) ORDER BY date`),
      query(`SELECT DATE(created_at) as date, COUNT(*) as count 
             FROM session_answers 
             WHERE created_at > NOW() - INTERVAL '${interval}'
             GROUP BY DATE(created_at) ORDER BY date`),
      query(`SELECT DATE(created_at) as date, COUNT(*) as count 
             FROM users 
             WHERE created_at > NOW() - INTERVAL '${interval}'
             GROUP BY DATE(created_at) ORDER BY date`)
    ]);

    res.json({
      period,
      sessions: sessionsData.rows,
      answers: answersData.rows,
      newUsers: usersData.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get audit logs
router.get('/audit-logs', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 100, action, userId } = req.query;
    const offset = (page - 1) * limit;

    let queryStr = 'SELECT * FROM document_audit_logs WHERE 1=1';
    const params = [];

    if (action) {
      queryStr += ` AND action = $${params.length + 1}`;
      params.push(action);
    }

    if (userId) {
      queryStr += ` AND user_id = $${params.length + 1}`;
      params.push(userId);
    }

    queryStr += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(queryStr, params);
    const countResult = await query('SELECT COUNT(*) as count FROM document_audit_logs');

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      pages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    next(error);
  }
});

// Get system health/status
router.get('/system-status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [dbTest, sessionCount, errorLogs] = await Promise.all([
      query('SELECT NOW()'),
      query(`SELECT COUNT(*) as active FROM interview_sessions 
             WHERE ended_at IS NULL AND created_at > NOW() - INTERVAL '24 hours'`),
      query(`SELECT COUNT(*) as count FROM document_audit_logs 
             WHERE action = 'error' AND created_at > NOW() - INTERVAL '1 hour'`)
    ]);

    res.json({
      database: {
        status: 'connected',
        lastCheck: dbTest.rows[0].now
      },
      sessions: {
        activeSessions: parseInt(sessionCount.rows[0].active)
      },
      errors: {
        lastHour: parseInt(errorLogs.rows[0].count)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Create new user (admin only)
router.post('/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { email, fullName, role = 'user', password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    // Validate input
    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!['user', 'admin', 'moderator', 'owner'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be user, admin, moderator, or owner' });
    }

    if (fullName && (typeof fullName !== 'string' || fullName.length > 255)) {
      return res.status(400).json({ error: 'Invalid name format' });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password if provided, otherwise create a temporary one
    let passwordHash = null;
    if (password) {
      const bcrypt = require('bcrypt');
      passwordHash = await bcrypt.hash(password, 10);
    }

    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role, created_at`,
      [normalizedEmail, passwordHash, fullName, role]
    );

    const user = result.rows[0];

    // Create privacy settings for new user
    await query(
      'INSERT INTO privacy_settings (user_id) VALUES ($1)',
      [user.id]
    );

    // Log this action
    await query(
      `INSERT INTO document_audit_logs (user_id, action, details) 
       VALUES ($1, $2, $3)`,
      [req.user.id, 'admin_user_create', JSON.stringify({ newUser: user.id, email: user.email, role: user.role })]
    );

    res.status(201).json({
      success: true,
      user,
      message: password ? 'User created successfully' : 'User created successfully. They will need to reset their password to login.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
