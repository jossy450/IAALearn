const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database/connection');

// Enhanced in-memory store with TTL and cleanup
class TransferCodeStore {
  constructor() {
    this.codes = new Map();
    this.maxSize = 1000; // Limit memory usage
    this.cleanupInterval = 60000; // Cleanup every minute
    this.startCleanup();
  }

  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.codes.entries()) {
      if (value.expiresAt < now) {
        this.codes.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired transfer codes`);
    }
    
    // If still too large, remove oldest entries
    if (this.codes.size > this.maxSize) {
      const sorted = Array.from(this.codes.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt);
      
      const toRemove = sorted.slice(0, this.codes.size - this.maxSize);
      toRemove.forEach(([key]) => this.codes.delete(key));
      
      console.log(`🧹 Removed ${toRemove.length} oldest codes due to size limit`);
    }
  }

  set(code, data) {
    this.codes.set(code, data);
  }

  get(code) {
    const data = this.codes.get(code);
    if (data && data.expiresAt < Date.now()) {
      this.codes.delete(code);
      return null;
    }
    return data;
  }

  delete(code) {
    return this.codes.delete(code);
  }

  has(code) {
    const data = this.get(code); // This will auto-cleanup if expired
    return data !== null;
  }

  size() {
    return this.codes.size;
  }
}

const transferCodes = new TransferCodeStore();

// Generate transfer code for session (optimized)
router.post('/:sessionId/transfer-code', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if there's already a valid code for this session
    let existingCode = null;
    for (const [code, data] of transferCodes.codes.entries()) {
      if (data.sessionId === sessionId && 
          data.userId === userId && 
          data.expiresAt > Date.now() && 
          !data.transferred) {
        existingCode = code;
        break;
      }
    }

    // Reuse existing code if found
    if (existingCode) {
      const data = transferCodes.get(existingCode);
      const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const clientUrl = baseUrl.replace(':5173', '');
      const transferUrl = `${clientUrl}/mobile-transfer?code=${existingCode}`;
      
      console.log(`♻️  Reusing existing code ${existingCode} for session ${sessionId}`);\n      
      return res.json({\n        code: existingCode,\n        url: transferUrl,\n        expiresIn: Math.floor((data.expiresAt - Date.now()) / 1000),\n        reused: true\n      });\n    }

    // Generate new 6-character alphanumeric code (uppercase)
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

    // Generate transfer URL
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const clientUrl = baseUrl.replace(':5173', '');
    const transferUrl = `${clientUrl}/mobile-transfer?code=${code}`;

    console.log(`🆕 Generated new code ${code} for session ${sessionId} (${transferCodes.size()} active codes)`);

    res.json({
      code,
      url: transferUrl,
      expiresIn: 300, // seconds
      reused: false
    });
  } catch (error) {
    console.error('Transfer code generation error:', error);
    res.status(500).json({ error: 'Failed to generate transfer code' });
  }
});

// Check transfer status (optimized with caching headers)
router.get('/transfer-status/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const transferData = transferCodes.get(code);

    if (!transferData) {
      // Cache negative responses briefly
      res.set('Cache-Control', 'private, max-age=5');
      return res.status(404).json({ error: 'Invalid or expired code' });
    }

    if (transferData.expiresAt < Date.now()) {
      transferCodes.delete(code);
      res.set('Cache-Control', 'private, max-age=5');
      return res.status(410).json({ error: 'Transfer code expired' });
    }

    // Don't cache positive responses to get real-time status
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    res.json({
      valid: true,
      transferred: transferData.transferred,
      expiresIn: Math.floor((transferData.expiresAt - Date.now()) / 1000),
      sessionId: transferData.sessionId
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
