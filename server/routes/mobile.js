const express = require('express');
const crypto = require('crypto');
const { query } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Generate connection code for mobile pairing
router.post('/generate-code', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sessionId, deviceType } = req.body;

    // Generate 6-digit code
    const connectionCode = crypto.randomInt(100000, 999999).toString();

    // Deactivate existing codes
    await query(
      `UPDATE mobile_sessions 
       SET is_active = false 
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    // Create new mobile session
    const result = await query(
      `INSERT INTO mobile_sessions 
       (user_id, session_id, device_id, device_type, connection_code)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, sessionId, crypto.randomUUID(), deviceType || 'mobile', connectionCode]
    );

    res.json({
      success: true,
      connectionCode,
      expiresIn: 300, // 5 minutes
      mobileSession: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Connect mobile device with code
router.post('/connect', async (req, res, next) => {
  try {
    const { connectionCode } = req.body;

    if (!connectionCode) {
      return res.status(400).json({ error: 'Connection code is required' });
    }

    // Find active session with code
    const result = await query(
      `SELECT ms.*, s.title, s.company_name, s.position
       FROM mobile_sessions ms
       LEFT JOIN interview_sessions s ON ms.session_id = s.id
       WHERE ms.connection_code = $1 
         AND ms.is_active = true
         AND ms.connected_at > NOW() - INTERVAL '5 minutes'`,
      [connectionCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired code' });
    }

    const session = result.rows[0];

    // Update heartbeat
    await query(
      'UPDATE mobile_sessions SET last_heartbeat = NOW() WHERE id = $1',
      [session.id]
    );

    res.json({
      success: true,
      session
    });
  } catch (error) {
    next(error);
  }
});

// Disconnect mobile device
router.post('/disconnect', authenticate, async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    const result = await query(
      `UPDATE mobile_sessions 
       SET is_active = false, disconnected_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [sessionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      message: 'Disconnected successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Heartbeat to keep connection alive
router.post('/heartbeat', async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    const result = await query(
      `UPDATE mobile_sessions 
       SET last_heartbeat = NOW()
       WHERE id = $1 AND is_active = true
       RETURNING *`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or inactive' });
    }

    res.json({
      success: true,
      session: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get active mobile sessions
router.get('/sessions', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT * FROM mobile_sessions 
       WHERE user_id = $1 AND is_active = true
       ORDER BY connected_at DESC`,
      [userId]
    );

    res.json({
      sessions: result.rows
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
