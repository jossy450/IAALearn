const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database/connection');

// In-memory store for transfer codes (in production, use Redis)
const transferCodes = new Map();

// Generate transfer code for session
router.post('/:sessionId/transfer-code', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Verify session belongs to user
    const sessionCheck = await db.query(
      'SELECT id FROM interview_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Generate 6-character alphanumeric code
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    // Store transfer code with expiration (5 minutes)
    const transferData = {
      sessionId,
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
      transferred: false
    };

    transferCodes.set(code, transferData);

    // Clean up expired codes
    for (const [key, value] of transferCodes.entries()) {
      if (value.expiresAt < Date.now()) {
        transferCodes.delete(key);
      }
    }

    // Generate transfer URL
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const transferUrl = `${baseUrl}/mobile-transfer?code=${code}`;

    res.json({
      code,
      url: transferUrl,
      expiresIn: 300 // seconds
    });
  } catch (error) {
    console.error('Transfer code generation error:', error);
    res.status(500).json({ error: 'Failed to generate transfer code' });
  }
});

// Check transfer status
router.get('/transfer-status/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const transferData = transferCodes.get(code);

    if (!transferData) {
      return res.status(404).json({ error: 'Invalid or expired code' });
    }

    if (transferData.expiresAt < Date.now()) {
      transferCodes.delete(code);
      return res.status(410).json({ error: 'Transfer code expired' });
    }

    res.json({
      valid: true,
      transferred: transferData.transferred,
      expiresIn: Math.floor((transferData.expiresAt - Date.now()) / 1000)
    });
  } catch (error) {
    console.error('Transfer status check error:', error);
    res.status(500).json({ error: 'Failed to check transfer status' });
  }
});

// Connect via transfer code
router.post('/connect-transfer', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Transfer code required' });
    }

    const transferData = transferCodes.get(code);

    if (!transferData) {
      return res.status(404).json({ error: 'Invalid or expired transfer code' });
    }

    if (transferData.expiresAt < Date.now()) {
      transferCodes.delete(code);
      return res.status(410).json({ error: 'Transfer code expired' });
    }

    if (transferData.transferred) {
      return res.status(409).json({ error: 'Code already used' });
    }

    // Mark as transferred
    transferData.transferred = true;
    transferCodes.set(code, transferData);

    // Log transfer in database
    await db.query(
      `INSERT INTO session_transfers (session_id, transfer_code, transferred_at)
       VALUES ($1, $2, NOW())`,
      [transferData.sessionId, code]
    );

    // Return session info
    const session = await db.query(
      `SELECT s.*, u.email as user_email
       FROM interview_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [transferData.sessionId]
    );

    res.json({
      success: true,
      sessionId: transferData.sessionId,
      session: session.rows[0]
    });

    // Clean up code after successful transfer
    setTimeout(() => {
      transferCodes.delete(code);
    }, 60000); // Keep for 1 minute after transfer
  } catch (error) {
    console.error('Transfer connection error:', error);
    res.status(500).json({ error: 'Failed to connect via transfer' });
  }
});

// Get active transfers for a session
router.get('/:sessionId/transfers', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Verify session belongs to user
    const sessionCheck = await db.query(
      'SELECT id FROM interview_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const transfers = await db.query(
      `SELECT transfer_code, transferred_at
       FROM session_transfers
       WHERE session_id = $1
       ORDER BY transferred_at DESC
       LIMIT 10`,
      [sessionId]
    );

    res.json(transfers.rows);
  } catch (error) {
    console.error('Get transfers error:', error);
    res.status(500).json({ error: 'Failed to get transfers' });
  }
});

module.exports = router;
