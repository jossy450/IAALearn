const express = require('express');
const { query } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Submit feedback
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { type, subject, message, rating, email } = req.body;
    const userId = req.user?.id;

    // Validate required fields
    if (!type || !subject || !message) {
      return res.status(400).json({
        error: 'Missing required fields: type, subject, and message are required'
      });
    }

    // Validate feedback type
    const validTypes = ['feedback', 'bug', 'feature', 'support'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid feedback type. Must be: feedback, bug, feature, or support'
      });
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5'
      });
    }

    // Insert feedback into database
    const result = await query(
      `INSERT INTO feedback (user_id, type, subject, message, rating, contact_email, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, type, subject, rating, contact_email, created_at`,
      [userId, type, subject, message, rating || null, email || null]
    );

    // Log this action for audit purposes
    await query(
      `INSERT INTO document_audit_logs (user_id, action, details)
       VALUES ($1, $2, $3)`,
      [userId, 'feedback_submitted', JSON.stringify({
        feedbackId: result.rows[0].id,
        type,
        subject
      })]
    );

    res.status(201).json({
      success: true,
      feedback: result.rows[0],
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get user's feedback history (optional - for users to see their own feedback)
router.get('/my-feedback', authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT id, type, subject, message, rating, contact_email, status, created_at, updated_at
       FROM feedback
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as count FROM feedback WHERE user_id = $1',
      [userId]
    );

    res.json({
      feedback: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      pages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all feedback (admin/owner only)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.id;

    // Check if user is admin or owner
    const userResult = await query(
      'SELECT role, email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const isAdmin = user.role === 'admin';
    const isOwner = (
      userId === 1 ||
      user.email?.toLowerCase().includes('owner') ||
      user.email?.toLowerCase().includes('developer') ||
      user.role === 'owner' ||
      user.email === 'admin@admin.com' ||
      user.email === 'jossy450@gmail.com' ||
      user.email === 'mightyjosing@gmail.com'
    );

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Admin or Owner access required' });
    }

    const { page = 1, limit = 50, type, status } = req.query;
    const offset = (page - 1) * limit;

    let queryStr = `
      SELECT f.id, f.type, f.subject, f.message, f.rating, f.contact_email, f.status, f.created_at, f.updated_at,
             u.email as user_email, u.full_name as user_name
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      queryStr += ` AND f.type = $${params.length + 1}`;
      params.push(type);
    }

    if (status) {
      queryStr += ` AND f.status = $${params.length + 1}`;
      params.push(status);
    }

    queryStr += ` ORDER BY f.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(queryStr, params);
    const countResult = await query('SELECT COUNT(*) as count FROM feedback');

    res.json({
      feedback: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      pages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Update feedback status (admin/owner only)
router.patch('/:feedbackId/status', authenticate, async (req, res, next) => {
  try {
    const { feedbackId } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    // Check if user is admin or owner
    const userResult = await query(
      'SELECT role, email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const isAdmin = user.role === 'admin';
    const isOwner = (
      userId === 1 ||
      user.email?.toLowerCase().includes('owner') ||
      user.email?.toLowerCase().includes('developer') ||
      user.role === 'owner' ||
      user.email === 'admin@admin.com' ||
      user.email === 'jossy450@gmail.com' ||
      user.email === 'mightyjosing@gmail.com'
    );

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Admin or Owner access required' });
    }

    // Validate status
    const validStatuses = ['pending', 'reviewed', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be: pending, reviewed, in_progress, resolved, or closed'
      });
    }

    const result = await query(
      `UPDATE feedback SET status = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, type, subject, status, updated_at`,
      [status, feedbackId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Log this action
    await query(
      `INSERT INTO document_audit_logs (user_id, action, details)
       VALUES ($1, $2, $3)`,
      [userId, 'feedback_status_update', JSON.stringify({
        feedbackId,
        newStatus: status
      })]
    );

    res.json({
      success: true,
      feedback: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;