const express = require('express');
const { query } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get user analytics
router.get('/user', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { period = '30' } = req.query;

    // Session statistics
    const sessions = await query(`
      SELECT 
        COUNT(*) as total_sessions,
        AVG(duration_seconds) as avg_duration,
        SUM(total_questions) as total_questions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions
      FROM interview_sessions
      WHERE user_id = $1 
        AND started_at >= NOW() - INTERVAL '${parseInt(period)} days'
    `, [userId]);

    // Performance trends
    const trends = await query(`
      SELECT 
        DATE_TRUNC('day', started_at) as date,
        COUNT(*) as sessions,
        AVG(duration_seconds) as avg_duration,
        SUM(total_questions) as questions
      FROM interview_sessions
      WHERE user_id = $1 
        AND started_at >= NOW() - INTERVAL '${parseInt(period)} days'
      GROUP BY DATE_TRUNC('day', started_at)
      ORDER BY date DESC
    `, [userId]);

    // Response time statistics
    const responseStats = await query(`
      SELECT 
        AVG(response_time_ms) as avg_response_time,
        MIN(response_time_ms) as min_response_time,
        MAX(response_time_ms) as max_response_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time
      FROM questions q
      JOIN interview_sessions s ON q.session_id = s.id
      WHERE s.user_id = $1
        AND q.asked_at >= NOW() - INTERVAL '${parseInt(period)} days'
    `, [userId]);

    res.json({
      sessionStats: sessions.rows[0],
      trends: trends.rows,
      responseStats: responseStats.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get session analytics
router.get('/session/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const analytics = await query(`
      SELECT * FROM session_analytics
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (analytics.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Question distribution
    const distribution = await query(`
      SELECT 
        DATE_TRUNC('minute', asked_at) as minute,
        COUNT(*) as question_count,
        AVG(response_time_ms) as avg_response_time
      FROM questions
      WHERE session_id = $1
      GROUP BY DATE_TRUNC('minute', asked_at)
      ORDER BY minute
    `, [id]);

    res.json({
      analytics: analytics.rows[0],
      questionDistribution: distribution.rows
    });
  } catch (error) {
    next(error);
  }
});

// Export session data
router.get('/export/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await query(`
      SELECT s.*, 
        json_agg(
          json_build_object(
            'question', q.question_text,
            'asked_at', q.asked_at,
            'response_time', q.response_time_ms
          ) ORDER BY q.asked_at
        ) FILTER (WHERE q.id IS NOT NULL) as questions
      FROM interview_sessions s
      LEFT JOIN questions q ON s.id = q.session_id
      WHERE s.id = $1 AND s.user_id = $2
      GROUP BY s.id
    `, [id, userId]);

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      exportData: session.rows[0],
      exportedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
